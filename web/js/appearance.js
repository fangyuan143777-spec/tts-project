// Appearance settings: light/dark theme, font size and font type.
//
// Loaded in the <head> of every page, so the saved settings are applied BEFORE the page
// is painted (no flash of the wrong theme). Settings are saved ONLY in this browser's
// localStorage. Nothing here is sent to Supabase or anywhere else.
//
// localStorage keys (non-sensitive appearance choices only):
//   tts_theme        "light" | "dark"
//   tts_font_size    "small" | "medium" | "large"
//   tts_font_family  "system" | "serif" | "mono"
(function () {
  const KEYS = { theme: "tts_theme", size: "tts_font_size", font: "tts_font_family" };

  // Allowed values and the labels shown to the user. Anything else in storage is ignored.
  const THEMES = [["light", "Light"], ["dark", "Dark"]];
  const SIZES = [["small", "Small"], ["medium", "Medium"], ["large", "Large"]];
  const FONTS = [["system", "System (sans-serif)"], ["serif", "Serif"], ["mono", "Monospace"]];

  const root = document.documentElement;
  const darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  const allowed = (list) => list.map((item) => item[0]);

  // localStorage can be blocked (private mode, browser settings), so never let it crash the page.
  function readSetting(key, list) {
    try {
      const value = localStorage.getItem(key);
      return allowed(list).includes(value) ? value : null;
    } catch (e) {
      return null;
    }
  }
  function saveSetting(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      // not saved: the setting still works until the page is closed
    }
  }

  // null means "the user has not chosen yet": the theme then follows the operating system.
  let savedTheme = readSetting(KEYS.theme, THEMES);
  let size = readSetting(KEYS.size, SIZES) || "medium";
  let font = readSetting(KEYS.font, FONTS) || "system";

  function currentTheme() {
    return savedTheme || (darkQuery && darkQuery.matches ? "dark" : "light");
  }

  function applySettings() {
    root.setAttribute("data-theme", currentTheme());
    root.setAttribute("data-font-size", size);
    root.setAttribute("data-font", font);
  }

  applySettings(); // runs immediately, before the page is drawn

  // ---- The Appearance panel (built with safe DOM methods, no innerHTML) --------------
  const themeButtons = [];
  const sizeButtons = [];
  let fontSelect = null;

  function refreshControls() {
    themeButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === currentTheme())));
    sizeButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === size)));
    if (fontSelect) fontSelect.value = font;
  }

  function makeButtonGroup(labelText, idPrefix, options, list, onChoose) {
    const group = document.createElement("div");
    group.className = "appearance-group";

    const label = document.createElement("span");
    label.className = "appearance-label";
    label.id = idPrefix + "-label";
    label.textContent = labelText;

    const seg = document.createElement("div");
    seg.className = "seg";
    seg.setAttribute("role", "group");
    seg.setAttribute("aria-labelledby", label.id);

    options.forEach(([value, text]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.value = value;
      button.textContent = text;
      button.addEventListener("click", () => onChoose(value));
      seg.appendChild(button);
      list.push(button);
    });

    group.append(label, seg);
    return group;
  }

  function buildPanel(container) {
    const details = document.createElement("details");
    details.className = "appearance";

    const summary = document.createElement("summary");
    summary.textContent = "Appearance";

    const body = document.createElement("div");
    body.className = "appearance-body";

    body.appendChild(
      makeButtonGroup("Theme", "ap-theme", THEMES, themeButtons, (value) => {
        savedTheme = value; // a manual choice is remembered and overrides the OS setting
        saveSetting(KEYS.theme, value);
        applySettings();
        refreshControls();
      })
    );

    body.appendChild(
      makeButtonGroup("Font size", "ap-size", SIZES, sizeButtons, (value) => {
        size = value;
        saveSetting(KEYS.size, value);
        applySettings();
        refreshControls();
      })
    );

    const fontGroup = document.createElement("div");
    fontGroup.className = "appearance-group";
    const fontLabel = document.createElement("label");
    fontLabel.htmlFor = "ap-font";
    fontLabel.textContent = "Font";
    fontSelect = document.createElement("select");
    fontSelect.id = "ap-font";
    FONTS.forEach(([value, text]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      fontSelect.appendChild(option);
    });
    fontSelect.addEventListener("change", () => {
      font = fontSelect.value;
      saveSetting(KEYS.font, font);
      applySettings();
    });
    fontGroup.append(fontLabel, fontSelect);
    body.appendChild(fontGroup);

    details.append(summary, body);
    container.replaceChildren(details);
    refreshControls();
  }

  // If the user never picked a theme, follow the operating system when it changes.
  if (darkQuery && darkQuery.addEventListener) {
    darkQuery.addEventListener("change", () => {
      if (!savedTheme) {
        applySettings();
        refreshControls();
      }
    });
  }

  // Each page has <div id="appearance-panel"></div> where the panel should appear.
  document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("appearance-panel");
    if (container) buildPanel(container);
  });
})();
