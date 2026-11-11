const USERNAME = "null-charac69";
const FEATURED_REPOS = new Set(["agentos", "hrag-app", "healthcare_analytics", "null-charac69.github.io"]);
const PAGE_SIZE = 100;
const REFRESH_INTERVAL = 5 * 60 * 1000;

export async function initGitHubRepositories() {
  const grid = document.getElementById("repoGrid");
  const summary = document.getElementById("repoSummary");
  const search = document.getElementById("repoSearch");
  const syncLabel = document.getElementById("repoSync");
  if (!grid || !summary) return;

  let publicRepos = [];
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
      empty.textContent = query ? "No repositories match that search." : "No other public repositories to display right now.";
      grid.append(empty);
      return;
    }
    matches.forEach((repo) => grid.append(createRepositoryCard(repo)));
  };

  search?.addEventListener("input", render);

  const refresh = async () => {
    try {
      // Always fetch the current public state. No persistent browser cache:
      // deletions and metadata edits must be reflected on reload and polling.
      const repositories = await getRepositories();
      const byName = new Map(repositories.map((repo) => [repo.name.toLowerCase(), repo]));

      document.querySelectorAll("[data-repo][data-repo-meta]").forEach((card) => {
        const repoName = card.getAttribute("data-repo");
        const liveRepo = byName.get(String(repoName).toLowerCase());
        card.hidden = !liveRepo;
        card.setAttribute("data-repo-missing", String(!liveRepo));
        if (!liveRepo) return;

        const meta = card.querySelector("[data-repo-meta]");
        if (meta) meta.textContent = describeRepository(liveRepo);

        const link = card.querySelector(".project-link");
        if (link) {
          link.href = liveRepo.html_url;
          link.textContent = "Inspect repository ↗";
        }
      });

      const visibleFeaturedCount = Array.from(document.querySelectorAll(".project-card[data-category]"))
        .filter((card) => card.getAttribute("data-repo-missing") !== "true").length;
      const allFilterCount = document.querySelector('[data-project-filter="all"] span');
      if (allFilterCount) allFilterCount.textContent = String(visibleFeaturedCount).padStart(2, "0");

      publicRepos = repositories
        .filter((repo) => !repo.fork && !FEATURED_REPOS.has(repo.name.toLowerCase()))
        .sort((a, b) => new Date(b.pushed_at || b.updated_at) - new Date(a.pushed_at || a.updated_at));

      summary.replaceChildren();
      const dot = document.createElement("span");
      dot.className = "live-dot";
      const label = document.createElement("span");
      label.textContent = publicRepos.length + " other public repositories · Live from GitHub";
      summary.append(dot, label);
      render();
      if (syncLabel) syncLabel.textContent = "GitHub sync · just now";
    } catch (error) {
      // Keep the last successful snapshot visible if a background refresh fails.
      if (!publicRepos.length) {
        summary.textContent = "GitHub repository metadata is temporarily unavailable.";
        grid.replaceChildren();
        const fallback = document.createElement("div");
        fallback.className = "repo-empty";
        fallback.textContent = "Live repository data could not be loaded. Explore the GitHub profile directly for the current list.";
        grid.append(fallback);
      }
      if (syncLabel) syncLabel.textContent = "GitHub sync temporarily unavailable";
    }
  };

  await refresh();
  // Keep an already-open portfolio current without requiring a manual reload.
  if (typeof window !== "undefined" && typeof window.setInterval === "function") {
    window.setInterval(refresh, REFRESH_INTERVAL);
  }
}

async function getRepositories() {
  const repositories = [];
  const seenIds = new Set();
  let page = 1;

  while (true) {
    const url = "https://api.github.com/users/" + USERNAME +
      "/repos?type=owner&sort=updated&per_page=" + PAGE_SIZE + "&page=" + page;
    const response = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
      cache: "no-store"
    });
    if (!response.ok) throw new Error("GitHub API returned " + response.status + " on page " + page);

    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error("GitHub returned an invalid repository list");

    batch.forEach((repo) => {
      if (!seenIds.has(repo.id)) {
        seenIds.add(repo.id);
        repositories.push(repo);
      }
    });

    if (batch.length < PAGE_SIZE) break;
    page += 1;
  }

  return repositories;
}

function describeRepository(repo) {
  const parts = [];
  if (repo.language) parts.push(repo.language);
  if (repo.stargazers_count) parts.push(repo.stargazers_count + (repo.stargazers_count === 1 ? " star" : " stars"));
  const pushed = repo.pushed_at || repo.updated_at;
  if (pushed) parts.push("updated " + new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(new Date(pushed)));
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
