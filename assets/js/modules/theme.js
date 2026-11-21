const STORAGE_KEY = "portfolio-theme";
const COLORS = { light: "#f3f3f0", dark: "#0a0a0a" };

// The sheet is dark unless the visitor has chosen light.
function readSaved() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "dark" || value === "light" ? value : "";
  } catch {
    return ""; // Storage disabled: stay on the default.
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
    window.dispatchEvent(new CustomEvent("themechange", { detail: theme }));
  };

  apply(readSaved() || "dark");

  toggle.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    apply(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Still applies for this page view.
    }
  });
}
