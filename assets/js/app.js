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
  import("./modules/chat.js")
    .then(({ initPortfolioChat }) => initPortfolioChat())
    .catch((error) => console.error("Portfolio chat failed to load:", error));

  const year = document.getElementById("currentYear");
  if (year) year.textContent = String(new Date().getFullYear());

  document.querySelectorAll("[data-chat-open]").forEach((button) => {
    button.addEventListener("click", () => {
      document.getElementById("chatLauncher")?.click();
    });
  });
});
