// Lists the repos that aren't written up under "Featured Projects", and adds language and
// last-push date to the ones that are.
//
// The list renders straight away from the last copy this browser saw (or the same-origin
// snapshot /public-repos.json), then checks GitHub's public API for the current list. A live
// result is cached for an hour, so a visitor makes at most one GitHub call an hour, well
// inside the unauthenticated limit of 60. "Refresh" forces a new check. If GitHub can't be
// reached the snapshot stays on screen and the note says so.
//
// GitHub descriptions are often empty; the snapshot carries a one-line `summary` taken from
// each README by .github/scripts/update_repos.py, used when the live description is blank.

const USER = "null-charac69";
const API = `https://api.github.com/users/${USER}/repos?type=owner&per_page=100&sort=pushed`;
const CACHE_KEY = "portfolio-repos-live-v1";
const CACHE_MS = 60 * 60 * 1000;

const monthFormat = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" });
const dayFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// GitHub descriptions like "NA" say nothing; show nothing instead.
function cleanDescription(value) {
  const text = String(value || "").trim();
  return /^(n\/?a|none|-+)$/i.test(text) ? "" : text;
}

// The site's own repo and the profile-README repo aren't projects.
function isHousekeeping(repo) {
  const owner = (String(repo.html_url || "").split("/")[3] || "").toLowerCase();
  const name = repo.name.toLowerCase();
  return name === owner || name.endsWith(".github.io");
}

function ago(time) {
  const minutes = Math.round((Date.now() - time) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return minutes + (minutes === 1 ? " minute ago" : " minutes ago");
  const hours = Math.round(minutes / 60);
  return hours + (hours === 1 ? " hour ago" : " hours ago");
}

function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached && Array.isArray(cached.repositories) && typeof cached.at === "number") return cached;
  } catch {
    // Storage blocked or corrupt: behave as if there is no cache.
  }
  return null;
}

function writeCache(entry) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Private mode or full storage: the live list still shows, it just isn't kept.
  }
}

async function loadSnapshot() {
  const response = await fetch(new URL("public-repos.json", document.baseURI), { cache: "no-cache" });
  if (!response.ok) throw new Error("HTTP " + response.status);
  const payload = await response.json();
  if (!payload || !Array.isArray(payload.repositories)) throw new Error("invalid index");
  return payload;
}

async function loadLive() {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(API, { headers: { Accept: "application/vnd.github+json" }, signal: controller.signal });
    if (!response.ok) throw new Error("GitHub HTTP " + response.status);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("unexpected GitHub response");
    return data
      .filter((repo) => !repo.private && !repo.archived)
      .map((repo) => ({
        name: repo.name,
        html_url: repo.html_url,
        description: repo.description,
        language: repo.language,
        stargazers_count: repo.stargazers_count || 0,
        pushed_at: repo.pushed_at,
        fork: Boolean(repo.fork),
      }));
  } finally {
    window.clearTimeout(timer);
  }
}

function createRow(repo, summaries) {
  const item = el("li", "repo-row");
  const link = el("a", "repo-link");
  link.href = repo.html_url;
  link.target = "_blank";
  link.rel = "noreferrer";
  const description = cleanDescription(repo.description) || summaries.get(repo.name.toLowerCase()) || "";
  const meta = el("span", "repo-meta-row");
  if (repo.language) meta.append(el("span", "repo-lang", repo.language));
  if (repo.pushed_at) meta.append(el("span", "repo-date", monthFormat.format(new Date(repo.pushed_at))));
  link.append(
    el("span", "repo-name", repo.name),
    el("span", "repo-desc", description),
    meta,
    el("span", "repo-go", "↗")
  );
  link.lastElementChild.setAttribute("aria-hidden", "true");
  item.append(link);
  return item;
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
      if (live.pushed_at) details.push("last push " + monthFormat.format(new Date(live.pushed_at)));
      meta.textContent = details.join(" / ");
    }
    const link = card.querySelector(".project-link:not([data-live])");
    if (link) link.href = live.html_url;
  });
}

export async function initRepositories() {
  const list = document.getElementById("repoGrid");
  const summary = document.getElementById("repoSummary");
  const sync = document.getElementById("repoSync");
  const refresh = document.getElementById("repoRefresh");
  if (!list) return;

  const featured = new Set(Array.from(document.querySelectorAll("[data-repo]"), (card) => card.dataset.repo.toLowerCase()));
  let summaries = new Map();
  let snapshot = null;

  function render(repositories) {
    enrichFeatured(new Map(repositories.map((repo) => [repo.name.toLowerCase(), repo])));
    const others = repositories
      .filter((repo) => !repo.fork && !featured.has(repo.name.toLowerCase()) && !isHousekeeping(repo))
      .sort((a, b) => String(b.pushed_at || "").localeCompare(String(a.pushed_at || "")));
    list.replaceChildren(...(others.length
      ? others.map((repo, i) => {
          const row = createRow(repo, summaries);
          row.style.setProperty("--i", String(i));
          return row;
        })
      : [el("li", "repo-empty", "Nothing else public right now.")]));
    if (summary && others.length) {
      summary.textContent = others.length + " more public repos, some of them rough";
    }
  }

  function note(text) {
    if (sync) sync.textContent = text;
  }

  // 1. Show something immediately.
  try {
    snapshot = await loadSnapshot();
    summaries = new Map(snapshot.repositories
      .filter((repo) => repo.summary)
      .map((repo) => [repo.name.toLowerCase(), repo.summary]));
  } catch (error) {
    console.error("[Portfolio] Repository snapshot failed:", error);
  }
  const cached = readCache();
  if (cached) {
    render(cached.repositories);
    note("Live from GitHub, checked " + ago(cached.at));
  } else if (snapshot) {
    render(snapshot.repositories);
    note("Saved list from " + dayFormat.format(new Date(snapshot.generatedAt)) + ". Checking GitHub…");
  }

  // 2. Check GitHub when the cached copy is stale, or when asked to.
  let busy = false;
  async function check(force) {
    if (busy) return;
    const current = readCache();
    if (!force && current && Date.now() - current.at < CACHE_MS) return;
    busy = true;
    if (refresh) {
      refresh.disabled = true;
      refresh.classList.add("spinning");
    }
    if (force) note("Checking GitHub…");
    try {
      const repositories = await loadLive();
      const entry = { at: Date.now(), repositories };
      writeCache(entry);
      render(repositories);
      note("Live from GitHub, checked just now");
    } catch (error) {
      console.warn("[Portfolio] Live repository check failed:", error);
      const fallback = readCache();
      if (fallback) {
        note("GitHub didn't answer. Showing the list from " + ago(fallback.at) + ".");
      } else if (snapshot) {
        render(snapshot.repositories);
        note("GitHub didn't answer. Showing the saved list from " + dayFormat.format(new Date(snapshot.generatedAt)) + ".");
      } else {
        list.replaceChildren(el("li", "repo-empty", "Couldn't load the list. It's all on GitHub anyway."));
        note("");
      }
    } finally {
      busy = false;
      if (refresh) {
        refresh.disabled = false;
        refresh.classList.remove("spinning");
      }
    }
  }

  refresh?.addEventListener("click", () => check(true));
  // Keep the "checked … ago" note honest while the page stays open.
  window.setInterval(() => {
    const current = readCache();
    if (current && !busy) note("Live from GitHub, checked " + ago(current.at));
  }, 60000);
  await check(false);
}
