import { initTheme } from "./modules/theme.js";
import { initNavigation } from "./modules/navigation.js";
import { initReveal } from "./modules/reveal.js";
import { initProjectFilters } from "./modules/project-filters.js";

// Each feature is isolated: one failure must not take down the others.
function run(name, task) {
  try {
    const result = task();
    if (result && typeof result.catch === "function") {
      result.catch((error) => console.error("[Portfolio] " + name + " failed:", error));
    }
  } catch (error) {
    console.error("[Portfolio] " + name + " failed:", error);
  }
}

// Reuse app.js's ?v=<build> so lazily loaded modules are cache-busted too.
const VERSION = new URL(import.meta.url).search;

function lazy(name, path, exportName) {
  // Dynamic imports keep a broken optional module from blocking the page.
  import(path + VERSION)
    .then((module) => (exportName ? module[exportName]() : undefined))
    .catch((error) => console.error("[Portfolio] " + name + " failed:", error));
}

document.addEventListener("DOMContentLoaded", () => {
  run("Theme", initTheme);
  run("Navigation", initNavigation);
  run("Reveal", initReveal);
  run("Project filters", initProjectFilters);
  lazy("Repositories", "./modules/repositories.js", "initRepositories");
  lazy("Chat", "./modules/chat.js");

  const year = document.getElementById("currentYear");
  if (year) year.textContent = String(new Date().getFullYear());
});
