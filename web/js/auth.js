// Registration, login, logout and page protection.
// Each page sets <body data-page="login|register|app"> and this file does the right thing.

const DISABLED_MESSAGE = "Your account has been disabled. Please contact the administrator.";

function showMessage(text, isError) {
  const box = document.getElementById("message");
  if (!box) return;
  box.textContent = text; // textContent, never innerHTML
  box.className = isError ? "message error" : "message ok";
  box.hidden = false;
}

// Read the signed-in user's own profile row (RLS only lets them see their own).
async function getMyProfile(userId) {
  const { data, error } = await sb
    .from("profiles")
    .select("id, email, role, is_disabled")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

// Sign out and go to the login page with a reason shown there.
async function signOutAndRedirect(reason) {
  await sb.auth.signOut();
  window.location.replace("index.html" + (reason ? "?reason=" + reason : ""));
}

// After a successful sign-in: block disabled/broken accounts, otherwise open the app.
async function finishSignIn(user) {
  const profile = await getMyProfile(user.id);
  if (!profile) {
    await sb.auth.signOut();
    showMessage("Could not load your profile. Please try again.", true);
    return;
  }
  if (profile.is_disabled) {
    await sb.auth.signOut();
    showMessage(DISABLED_MESSAGE, true);
    return;
  }
  window.location.replace("app.html");
}

// ---- Login / register pages -------------------------------------------------
async function initAuthPage(page) {
  const reason = new URLSearchParams(window.location.search).get("reason");
  if (reason === "disabled") showMessage(DISABLED_MESSAGE, true);
  if (reason === "profile") showMessage("Could not load your profile. Please log in again.", true);

  // Already signed in? Skip the login/register page.
  const { data } = await sb.auth.getSession();
  if (data.session) {
    await finishSignIn(data.session.user);
    return;
  }

  const form = document.getElementById("auth-form");
  const button = form.querySelector("button[type=submit]");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value;

    if (page === "register") {
      if (password.length < 6) return showMessage("Password must be at least 6 characters.", true);
      if (password !== form.confirm.value) return showMessage("Passwords do not match.", true);
    }

    button.disabled = true;
    const result =
      page === "register"
        ? await sb.auth.signUp({ email, password })
        : await sb.auth.signInWithPassword({ email, password });
    button.disabled = false;

    if (result.error) return showMessage(result.error.message, true);

    if (result.data.session) {
      await finishSignIn(result.data.user);
    } else {
      // Only happens if email confirmation is ON in Supabase.
      showMessage("Account created. Check your email to confirm it, then log in.", false);
    }
  });
}

// ---- Protected page (app.html) ----------------------------------------------
async function initProtectedPage() {
  const { data } = await sb.auth.getSession();
  if (!data.session) {
    window.location.replace("index.html");
    return;
  }

  const profile = await getMyProfile(data.session.user.id);
  if (!profile) return signOutAndRedirect("profile");
  if (profile.is_disabled) return signOutAndRedirect("disabled");

  document.getElementById("user-email").textContent = profile.email;
  document.getElementById("user-role").textContent = profile.role;
  document.getElementById("logout-btn").addEventListener("click", () => signOutAndRedirect(null));
  document.body.hidden = false; // show the page only after the checks pass
  document.dispatchEvent(new Event("app-ready")); // lets tts.js start (e.g. load history)

  // If the session ends elsewhere (other tab, expiry), leave the page.
  sb.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") window.location.replace("index.html");
  });
}

const page = document.body.dataset.page;
if (page === "app") initProtectedPage();
else initAuthPage(page);
