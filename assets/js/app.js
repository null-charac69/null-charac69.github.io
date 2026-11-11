import { initTheme } from "./modules/theme.js";
import { initNavigation } from "./modules/navigation.js";
import { initReveal } from "./modules/reveal.js";
import { initProjectFilters } from "./modules/project-filters.js";
import { initGitHubRepositories } from "./modules/github-repositories.js?v=20261111-sync-init-fix";

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
  initializeFeature("GitHub repositories", initGitHubRepositories);
  initializeFeature("Theme", initTheme);
  initializeFeature("Navigation", initNavigation);
  initializeFeature("Reveal animations", initReveal);
  initializeFeature("Project filters", initProjectFilters);

  const year = document.getElementById("currentYear");
  if (year) year.textContent = String(new Date().getFullYear());
});
