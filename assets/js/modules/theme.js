const STORAGE_KEY = "portfolio-theme";
const COLORS = { light: "#f4f3ef", dark: "#101827" };

function systemTheme() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readSaved() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "dark" || value === "light" ? value : "";
  } catch {
    return ""; // Storage disabled: fall back to the system preference.
  }
}

export function initTheme() {
  const root = document.documentElement;
  const toggle = document.getElementById("themeToggle");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (!toggle) return;

  const apply = (theme) => {
    root.setAttribute("data-theme", theme);
    if (themeMeta) themeMeta.setAttribute("content", COLORS[theme]);
    const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("title", label);
  };

  apply(readSaved() || systemTheme());

  toggle.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    apply(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Still applies for this page view.
    }
  });

  // Follow OS changes until the visitor makes an explicit choice.
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (!readSaved()) apply(systemTheme());
    });
  }
}
