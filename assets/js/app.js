import { initTheme } from "./modules/theme.js";
import { initNavigation } from "./modules/navigation.js";
import { initReveal } from "./modules/reveal.js";
import { initProjectFilters } from "./modules/project-filters.js";
import { initGitHubRepositories } from "./modules/github-repositories.js";

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initNavigation();
  initReveal();
  initProjectFilters();
  initGitHubRepositories();
  const year = document.getElementById("currentYear");
  if (year) year.textContent = String(new Date().getFullYear());

});
