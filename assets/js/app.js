import { initTheme } from "./modules/theme.js";
import { initNavigation } from "./modules/navigation.js";
import { initReveal } from "./modules/reveal.js";
import { initProjectFilters } from "./modules/project-filters.js";

function initializeFeature(name, initializer) {
  try {
    const result = initializer();
    if (result && typeof result.catch === "function") {
      result.catch((error) => console.error("[Portfolio] " + name + " initialization failed:", error));
    }
  } catch (error) {
    console.error("[Portfolio] " + name + " initialization failed:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Start repository sync first. A failure in an unrelated visual component
  // must never prevent the GitHub status and manual refresh control from working.
  initializeFeature("Theme", initTheme);
  initializeFeature("Navigation", initNavigation);
  initializeFeature("Reveal animations", initReveal);
  initializeFeature("Project filters", initProjectFilters);

  const year = document.getElementById("currentYear");
  if (year) year.textContent = String(new Date().getFullYear());
});
