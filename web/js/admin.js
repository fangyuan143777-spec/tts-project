// Admin dashboard: statistics, users (enable/disable) and all TTS history.
// auth.js already checked that the visitor is a signed-in, enabled admin.
// The real protection is Row Level Security in Supabase: only admins can read other
// people's rows or change is_disabled, and only for users whose role is 'user'.

(function () {
  const $ = (id) => document.getElementById(id);

  function showMessage(text, isError) {
    const box = $("message");
    box.textContent = text; // textContent, never innerHTML
    box.className = isError ? "message error" : "message ok";
    box.hidden = false;
  }

  function languageName(code) {
    const lang = window.APP_CONFIG.LANGUAGES.find((l) => l.code === code);
    return lang ? lang.name : code;
  }

  // Adds a <td> with plain text (safe for user-controlled values).
  function addCell(tr, text, className) {
    const td = document.createElement("td");
    td.textContent = text;
    if (className) td.className = className;
    tr.appendChild(td);
    return td;
  }

  // ---- Statistics -----------------------------------------------------------
  async function count(query) {
    const { count: n, error } = await query;
    if (error) throw error;
    return n;
  }

  // Adds up char_count in pages of 1000 rows (the API returns at most 1000 at a time).
  async function totalCharacters() {
    let total = 0;
    let from = 0;
    for (;;) {
      const { data, error } = await sb
        .from("tts_requests")
        .select("char_count")
        .order("id")
        .range(from, from + 999);
      if (error) throw error;
      data.forEach((row) => (total += row.char_count));
      if (data.length < 1000) return total;
      from += 1000;
    }
  }

  async function loadStats() {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0); // same "day" as the daily limit (UTC)

    const head = { count: "exact", head: true };
    try {
      const [users, total, today, failed, chars] = await Promise.all([
        count(sb.from("profiles").select("id", head)),
        count(sb.from("tts_requests").select("id", head)),
        count(sb.from("tts_requests").select("id", head).gte("created_at", startOfToday.toISOString())),
        count(sb.from("tts_requests").select("id", head).eq("status", "error")),
        totalCharacters(),
      ]);
      $("stat-users").textContent = users.toLocaleString();
      $("stat-total").textContent = total.toLocaleString();
      $("stat-today").textContent = today.toLocaleString();
      $("stat-chars").textContent = chars.toLocaleString();
      $("stat-failed").textContent = failed.toLocaleString();
    } catch (err) {
      showMessage("Could not load the statistics.", true);
    }
  }

  // ---- Users ----------------------------------------------------------------
  async function loadUsers() {
    const { data, error } = await sb
      .from("profiles")
      .select("id, email, role, is_disabled, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return showMessage("Could not load the users.", true);

    const body = $("users-body");
    body.replaceChildren();
    data.forEach((user) => {
      const tr = document.createElement("tr");
      addCell(tr, user.email);
      addCell(tr, user.role);
      addCell(tr, user.is_disabled ? "Disabled" : "Active", user.is_disabled ? "bad" : "ok");
      addCell(tr, new Date(user.created_at).toLocaleDateString());

      const actionCell = addCell(tr, "");
      if (user.role === "user") {
        // Only normal users can be enabled/disabled. Admin rows get no button.
        const button = document.createElement("button");
        button.type = "button";
        button.className = user.is_disabled ? "small" : "small danger";
        button.textContent = user.is_disabled ? "Enable" : "Disable";
        button.addEventListener("click", () => setDisabled(user, !user.is_disabled, button));
        actionCell.appendChild(button);
      } else {
        actionCell.textContent = "—";
      }
      body.appendChild(tr);
    });
  }

  async function setDisabled(user, disable, button) {
    if (disable && !window.confirm("Disable " + user.email + "?")) return;

    button.disabled = true;
    // The extra role filter and RLS both make sure only normal users can be changed.
    const { data, error } = await sb
      .from("profiles")
      .update({ is_disabled: disable })
      .eq("id", user.id)
      .eq("role", "user")
      .select("id");

    if (error || !data || data.length !== 1) {
      showMessage("Could not update " + user.email + ".", true);
    } else {
      showMessage(user.email + " is now " + (disable ? "disabled." : "enabled."), false);
    }
    await loadUsers();
  }

  // ---- TTS history (all users) ---------------------------------------------
  async function loadHistory() {
    // profiles(email) joins each request to its user's email.
    const { data, error } = await sb
      .from("tts_requests")
      .select("id, created_at, language_code, voice_name, char_count, status, error_message, text, profiles(email)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return showMessage("Could not load the TTS history.", true);

    const body = $("history-body");
    body.replaceChildren();
    $("history-empty").hidden = data.length > 0;

    data.forEach((row) => {
      const tr = document.createElement("tr");
      addCell(tr, new Date(row.created_at).toLocaleString());
      addCell(tr, row.profiles ? row.profiles.email : "(unknown)");
      addCell(tr, languageName(row.language_code));
      addCell(tr, row.voice_name);
      addCell(tr, String(row.char_count));

      const statusCell = addCell(tr, row.status, row.status === "success" ? "ok" : "bad");
      if (row.status === "error" && row.error_message) {
        const note = document.createElement("div");
        note.className = "note";
        note.textContent = row.error_message;
        statusCell.appendChild(note);
      }

      // "View text" opens the full text inside the row (plain <details>, no modal).
      const textCell = addCell(tr, "");
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = "View text";
      const full = document.createElement("div");
      full.className = "full-text";
      full.textContent = row.text;
      details.append(summary, full);
      textCell.appendChild(details);

      body.appendChild(tr);
    });
  }

  // auth.js fires this once the admin check has passed.
  document.addEventListener("app-ready", () => {
    loadStats();
    loadUsers();
    loadHistory();
  });
})();
