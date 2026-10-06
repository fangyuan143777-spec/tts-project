// Text-to-speech page: language/voice choice, generate, player controls, download, history.
// Login/session protection of this page is done by auth.js; the real security rules
// (limits, voice checks, daily cap) are enforced by the Edge Function, not here.

(function () {
  const cfg = window.APP_CONFIG;
  const FUNCTION_URL = cfg.SUPABASE_URL + "/functions/v1/generate-speech";
  const $ = (id) => document.getElementById(id);

  const languageSelect = $("language");
  const voiceSelect = $("voice");
  const textBox = $("text");
  const counter = $("counter");
  const generateBtn = $("generate-btn");
  const clearBtn = $("clear-btn");
  const audio = $("player");
  const playBtn = $("play-btn");
  const pauseBtn = $("pause-btn");
  const resumeBtn = $("resume-btn");
  const stopBtn = $("stop-btn");
  const downloadBtn = $("download-btn");
  const volumeSlider = $("volume");
  const volumeValue = $("volume-value");
  const playerStatus = $("player-status");

  let busy = false;
  let hasAudio = false;
  let stopped = false;
  let currentUrl = null;

  // ---- Messages -------------------------------------------------------------
  function showMessage(text, isError) {
    const box = $("message");
    box.textContent = text; // textContent, never innerHTML
    box.className = isError ? "message error" : "message ok";
    box.hidden = false;
  }
  function clearMessage() {
    $("message").hidden = true;
  }

  // ---- Language and voice ---------------------------------------------------
  function selectedLanguage() {
    return cfg.LANGUAGES.find((l) => l.code === languageSelect.value);
  }

  function fillLanguages() {
    cfg.LANGUAGES.forEach((lang) => {
      const option = document.createElement("option");
      option.value = lang.code;
      option.textContent = lang.name;
      languageSelect.appendChild(option);
    });
    showVoice();
  }

  // One approved voice per language, so the voice list is just that voice.
  function showVoice() {
    const lang = selectedLanguage();
    voiceSelect.replaceChildren();
    const option = document.createElement("option");
    option.value = lang.voiceId;
    option.textContent = lang.voiceName;
    voiceSelect.appendChild(option);
  }

  // ---- Counter and Generate button -----------------------------------------
  function updateCounter() {
    const chars = textBox.value.length;
    const trimmed = textBox.value.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    counter.textContent = chars + " / " + cfg.MAX_CHARS + " characters · " + words + " words";
    counter.classList.toggle("over", chars > cfg.MAX_CHARS);
    updateGenerateButton();
  }

  function updateGenerateButton() {
    const trimmedLength = textBox.value.trim().length;
    generateBtn.disabled = busy || trimmedLength === 0 || textBox.value.length > cfg.MAX_CHARS;
    generateBtn.setAttribute("aria-busy", String(busy)); // lets the CSS show a spinner while generating
  }

  // ---- Generate -------------------------------------------------------------
  async function generate() {
    if (busy) return;
    clearMessage();

    const text = textBox.value.trim();
    if (text.length === 0) return showMessage("Please enter some text.", true);
    if (text.length > cfg.MAX_CHARS) {
      return showMessage("Text is too long (maximum " + cfg.MAX_CHARS + " characters).", true);
    }

    busy = true;
    generateBtn.textContent = "Generating…";
    updateGenerateButton();
    showMessage("Generating speech, please wait…", false);

    try {
      const { data } = await sb.auth.getSession();
      if (!data.session) {
        window.location.replace("index.html");
        return;
      }

      const response = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: cfg.SUPABASE_PUBLISHABLE_KEY,
          Authorization: "Bearer " + data.session.access_token,
        },
        body: JSON.stringify({
          text: text,
          language: languageSelect.value,
          voice: voiceSelect.value,
        }),
      });

      const type = response.headers.get("Content-Type") || "";
      if (!response.ok || !type.startsWith("audio/")) {
        return showMessage(await errorMessageFrom(response), true);
      }

      setAudio(await response.blob());
      showMessage("Speech is ready. Press Play.", false);
    } catch (err) {
      showMessage("Could not reach the speech service. Check your connection and try again.", true);
    } finally {
      busy = false;
      generateBtn.textContent = "Generate Speech";
      updateGenerateButton();
      loadHistory(); // the server logged this request (success or error)
    }
  }

  // Turn a failed response into a short, safe message for the user.
  async function errorMessageFrom(response) {
    if (response.status === 401) return "Your session has expired. Please log out and log in again.";
    try {
      const body = await response.json();
      if (body && typeof body.error === "string") return body.error;
    } catch (e) {
      // not JSON: fall through
    }
    return "Speech generation failed. Please try again.";
  }

  // ---- Audio player ---------------------------------------------------------
  function setAudio(blob) {
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = URL.createObjectURL(blob); // temporary, lives only in this page
    audio.src = currentUrl;
    audio.load();
    audio.volume = volumeSlider.value / 100;
    downloadBtn.href = currentUrl;
    downloadBtn.hidden = false;
    hasAudio = true;
    stopped = false;
    updatePlayer();
  }

  function updatePlayer() {
    const playing = hasAudio && !audio.paused && !audio.ended;
    const paused = hasAudio && audio.paused && !audio.ended && audio.currentTime > 0;

    playBtn.disabled = !hasAudio || playing;
    pauseBtn.disabled = !playing;
    resumeBtn.disabled = !paused;
    stopBtn.disabled = !(playing || paused);

    if (!hasAudio) playerStatus.textContent = "Generate speech to enable the player.";
    else if (playing) playerStatus.textContent = "Playing";
    else if (paused) playerStatus.textContent = "Paused";
    else if (audio.ended) playerStatus.textContent = "Finished";
    else if (stopped) playerStatus.textContent = "Stopped";
    else playerStatus.textContent = "Ready";
  }

  function play() {
    stopped = false;
    audio.currentTime = 0;
    audio.play().catch(() => showMessage("Your browser blocked playback. Press Play again.", true));
  }
  function pause() {
    audio.pause();
  }
  function resume() {
    audio.play().catch(() => showMessage("Your browser blocked playback. Press Resume again.", true));
  }
  function stop() {
    stopped = true;
    audio.pause();
    audio.currentTime = 0;
    updatePlayer();
  }

  function onVolumeChange() {
    audio.volume = volumeSlider.value / 100;
    volumeValue.textContent = volumeSlider.value;
  }

  // ---- Clear ----------------------------------------------------------------
  function clearText() {
    textBox.value = "";
    clearMessage();
    updateCounter();
    textBox.focus();
  }

  // ---- History (this user's own rows) --------------------------------------
  async function loadHistory() {
    const { data: sessionData } = await sb.auth.getSession();
    if (!sessionData.session) return;

    // The user_id filter matters for admins, whose RLS policy lets them read every row.
    const { data, error } = await sb
      .from("tts_requests")
      .select("id, created_at, language_code, voice_name, char_count, status, text")
      .eq("user_id", sessionData.session.user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const body = $("history-body");
    body.replaceChildren();
    if (error) {
      $("history-empty").textContent = "Could not load history.";
      $("history-empty").hidden = false;
      return;
    }
    $("history-empty").textContent = "No history yet.";
    $("history-empty").hidden = data.length > 0;

    data.forEach((row) => {
      const tr = document.createElement("tr");
      const language = cfg.LANGUAGES.find((l) => l.code === row.language_code);
      const preview = row.text.length > 80 ? row.text.slice(0, 80) + "…" : row.text;
      [
        new Date(row.created_at).toLocaleString(),
        language ? language.name : row.language_code,
        row.voice_name,
        String(row.char_count),
        row.status,
        preview,
      ].forEach((value, index) => {
        const td = document.createElement("td");
        td.textContent = value; // user-controlled text: textContent only
        if (index === 4) td.className = row.status === "success" ? "ok" : "bad";
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
  }

  // ---- Wire everything up ---------------------------------------------------
  if (document.body.dataset.page === "app") {
    fillLanguages();
    updateCounter();

    languageSelect.addEventListener("change", showVoice);
    textBox.addEventListener("input", updateCounter);
    generateBtn.addEventListener("click", generate);
    clearBtn.addEventListener("click", clearText);

    playBtn.addEventListener("click", play);
    pauseBtn.addEventListener("click", pause);
    resumeBtn.addEventListener("click", resume);
    stopBtn.addEventListener("click", stop);
    volumeSlider.addEventListener("input", onVolumeChange);
    ["play", "pause", "ended", "emptied"].forEach((name) => audio.addEventListener(name, updatePlayer));

    // auth.js fires this after the session and "not disabled" checks pass.
    document.addEventListener("app-ready", loadHistory);
  }
})();
