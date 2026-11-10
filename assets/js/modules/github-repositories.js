const USERNAME = "null-charac69";
const CACHE_KEY = "portfolio-github-repositories-v1";
const CACHE_TTL = 10 * 60 * 1000;
const FEATURED_REPOS = new Set(["agentos", "hrag-app", "healthcare_analytics", "null-charac69.github.io"]);

export async function initGitHubRepositories() {
  const grid = document.getElementById("repoGrid");
  const summary = document.getElementById("repoSummary");
  const search = document.getElementById("repoSearch");
  const syncLabel = document.getElementById("repoSync");
  if (!grid || !summary) return;

  try {
    const repositories = await getRepositories();
    const publicRepos = repositories
      .filter((repo) => !repo.fork && !FEATURED_REPOS.has(repo.name.toLowerCase()))
      .sort((a, b) => new Date(b.pushed_at || b.updated_at) - new Date(a.pushed_at || a.updated_at));

    document.querySelectorAll("[data-repo][data-repo-meta]").forEach((card) => {
      const repoName = card.getAttribute("data-repo");
      const repo = repositories.find((item) => item.name.toLowerCase() === String(repoName).toLowerCase());
      const meta = card.querySelector("[data-repo-meta]");
      if (!repo || !meta) return;
      meta.textContent = describeRepository(repo);
    });

    summary.replaceChildren();
    const dot = document.createElement("span");
    dot.className = "live-dot";
    const label = document.createElement("span");
    label.textContent = publicRepos.length + " other public repositories · Live from GitHub";
    summary.append(dot, label);

    const render = () => {
      const query = (search?.value || "").trim().toLowerCase();
      const matches = publicRepos.filter((repo) => {
        const haystack = [repo.name, repo.description, repo.language, ...(repo.topics || [])].join(" ").toLowerCase();
        return haystack.includes(query);
      }).slice(0, 9);

      grid.replaceChildren();
      if (!matches.length) {
        const empty = document.createElement("div");
        empty.className = "repo-empty";
        empty.textContent = query ? "No repositories match that search." : "No public repositories to display right now.";
        grid.append(empty);
        return;
      }
      matches.forEach((repo) => grid.append(createRepositoryCard(repo)));
    };

    search?.addEventListener("input", render);
    render();
    if (syncLabel) syncLabel.textContent = "GitHub sync complete";
  } catch (error) {
    summary.textContent = "GitHub repository metadata is temporarily unavailable.";
    grid.replaceChildren();
    const fallback = document.createElement("div");
    fallback.className = "repo-empty";
    fallback.textContent = "You can still explore all repositories directly on GitHub.";
    grid.append(fallback);
    if (syncLabel) syncLabel.textContent = "Repository links available";
  }
}

async function getRepositories() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
    if (cached && Date.now() - cached.savedAt < CACHE_TTL && Array.isArray(cached.items)) {
      return cached.items;
    }
  } catch {
    // Continue to the network request if browser storage is unavailable.
  }

  const response = await fetch("https://api.github.com/users/" + USERNAME + "/repos?sort=updated&per_page=100", {
    headers: { Accept: "application/vnd.github+json" },
    cache: "no-store"
  });
  if (!response.ok) throw new Error("GitHub API returned " + response.status);
  const repositories = await response.json();

  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), items: repositories }));
  } catch {
    // Dynamic listing still works without session storage.
  }
  return repositories;
}

function describeRepository(repo) {
  const parts = [];
  if (repo.language) parts.push(repo.language);
  if (repo.stargazers_count) parts.push(repo.stargazers_count + (repo.stargazers_count === 1 ? " star" : " stars"));
  const pushed = repo.pushed_at || repo.updated_at;
  if (pushed) {
    parts.push("updated " + new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(new Date(pushed)));
  }
  return parts.length ? parts.join(" · ") : "Public repository";
}

function createRepositoryCard(repo) {
  const link = document.createElement("a");
  link.className = "repo-card";
  link.href = repo.html_url;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.setAttribute("aria-label", "Open GitHub repository " + repo.name);

  const top = document.createElement("div");
  top.className = "repo-card-top";
  const language = document.createElement("span");
  language.className = "repo-language";
  language.textContent = repo.language || "Repository";
  const stars = document.createElement("span");
  stars.className = "repo-stars";
  stars.textContent = repo.stargazers_count ? "☆ " + repo.stargazers_count : "";
  top.append(language, stars);

  const title = document.createElement("h3");
  title.textContent = repo.name;
  const description = document.createElement("p");
  description.textContent = repo.description || "No description has been added yet.";

  const footer = document.createElement("div");
  footer.className = "repo-card-footer";
  const updated = document.createElement("span");
  updated.textContent = repo.pushed_at
    ? "PUSHED " + new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(new Date(repo.pushed_at)).toUpperCase()
    : "PUBLIC";
  const action = document.createElement("span");
  action.textContent = "OPEN ↗";
  footer.append(updated, action);

  link.append(top, title, description, footer);
  return link;
}
