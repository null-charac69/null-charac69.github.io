const STORAGE_KEY = "portfolio-theme";

export function initTheme() {
  const root = document.documentElement;
  const toggle = document.getElementById("themeToggle");
  if (!toggle) return;

  let savedTheme = "";
  try {
    savedTheme = localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    // Private browsing or disabled storage: keep the default theme.
  }

  if (savedTheme === "dark" || savedTheme === "light") {
    root.setAttribute("data-theme", savedTheme);
  }
  updateLabel();

  toggle.addEventListener("click", () => {
    const nextTheme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", nextTheme);
    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // The theme still works for the current page view.
    }
    updateLabel();
  });

  function updateLabel() {
    const isDark = root.getAttribute("data-theme") === "dark";
    toggle.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    toggle.setAttribute("title", isDark ? "Switch to light theme" : "Switch to dark theme");
  }
}
