// Renders the "More from the workbench" grid and enriches the featured project
// cards from the same-origin snapshot /public-repos.json. That file is kept
// fresh by .github/workflows/update-repo-index.yml, so visitors never call the
// GitHub API.

const dateFormat = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" });
const fullDateFormat = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function createCard(repo) {
  const card = el("a", "repo-card");
  card.href = repo.html_url;
  card.target = "_blank";
  card.rel = "noreferrer";
  card.setAttribute("aria-label", "Open GitHub repository " + repo.name);

  const top = el("div", "repo-card-top");
  top.append(
    el("span", "repo-language", repo.language || "Repository"),
    el("span", "repo-stars", repo.stargazers_count ? "☆ " + repo.stargazers_count : "")
  );

  const footer = el("div", "repo-card-footer");
  footer.append(
    el("span", "", repo.pushed_at ? "PUSHED " + dateFormat.format(new Date(repo.pushed_at)).toUpperCase() : "PUBLIC"),
    el("span", "", "OPEN ↗")
  );

  card.append(
    top,
    el("h3", "", repo.name),
    el("p", "", repo.description || "No description has been added yet."),
    footer
  );
  return card;
}

function enrichFeatured(byName) {
  document.querySelectorAll("[data-repo]").forEach((card) => {
    const live = byName.get(card.dataset.repo.toLowerCase());
    if (!live) return;
    const meta = card.querySelector("[data-repo-meta]");
    if (meta) {
      const details = [];
      if (live.language) details.push(live.language);
      if (live.stargazers_count) details.push(live.stargazers_count + (live.stargazers_count === 1 ? " star" : " stars"));
      if (live.pushed_at) details.push("updated " + dateFormat.format(new Date(live.pushed_at)));
      meta.textContent = details.join(" · ") || "Public repository";
    }
    const link = card.querySelector(".project-link");
    if (link) link.href = live.html_url;
  });
}

export async function initRepositories() {
  const grid = document.getElementById("repoGrid");
  const summary = document.getElementById("repoSummary");
  const search = document.getElementById("repoSearch");
  const status = document.getElementById("repoSync");
  if (!grid || !summary || !search || !status) return;

  const showError = (message) => {
    summary.textContent = "Repository list unavailable.";
    status.textContent = "";
    grid.replaceChildren(el("div", "repo-empty", message + " The full list is on the GitHub profile."));
  };

  let payload;
  try {
    const response = await fetch(new URL("public-repos.json", document.baseURI), { cache: "no-cache" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    payload = await response.json();
    if (!payload || !Array.isArray(payload.repositories)) throw new Error("invalid index");
  } catch (error) {
    console.error("[Portfolio] Repository index failed:", error);
    showError("Could not load the repository index.");
    return;
  }

  const all = payload.repositories;
  enrichFeatured(new Map(all.map((repo) => [repo.name.toLowerCase(), repo])));

  const featured = new Set(Array.from(document.querySelectorAll("[data-repo]"), (card) => card.dataset.repo.toLowerCase()));
  const others = all.filter((repo) => !repo.fork && !featured.has(repo.name.toLowerCase()));

  summary.replaceChildren(el("span", "live-dot"), el("span", "", others.length + " other public repositories"));
  if (payload.generatedAt) {
    status.textContent = "Index updated " + fullDateFormat.format(new Date(payload.generatedAt));
  }

  const render = () => {
    const query = search.value.trim().toLowerCase();
    const matches = others
      .filter((repo) => [repo.name, repo.description, repo.language, ...(repo.topics || [])].join(" ").toLowerCase().includes(query))
      .slice(0, 9);
    grid.replaceChildren(
      ...(matches.length
        ? matches.map(createCard)
        : [el("div", "repo-empty", query ? "No repositories match that search." : "No other public repositories to display right now.")])
    );
  };

  search.addEventListener("input", render);
  render();
}
