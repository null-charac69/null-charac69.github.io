(() => {
  "use strict";

  const USERNAME = "null-charac69";
  const FEATURED_REPOS = new Set(["agentos", "hrag-app", "healthcare_analytics", "null-charac69.github.io"]);
  const REFRESH_INTERVAL = 5 * 60 * 1000;
  const PAGE_SIZE = 100;

  function start() {
    const grid = document.getElementById("repoGrid");
    const summary = document.getElementById("repoSummary");
    const search = document.getElementById("repoSearch");
    const status = document.getElementById("repoSync");
    const button = document.getElementById("repoRefresh");

    if (!grid || !summary || !status || !button || button.dataset.syncBound === "true") return;
    button.dataset.syncBound = "true";

    let repos = [];
    let lastSyncedAt = null;
    let busy = false;

    const timestamp = (date) => new Intl.DateTimeFormat("en-IN", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
    }).format(date);

    const render = () => {
      const query = (search.value || "").trim().toLowerCase();
      const matches = repos.filter((repo) =>
        [repo.name, repo.description, repo.language, ...(repo.topics || [])]
          .join(" ").toLowerCase().includes(query)
      ).slice(0, 9);

      grid.replaceChildren();
      if (!matches.length) {
        const empty = document.createElement("div");
        empty.className = "repo-empty";
        empty.textContent = query ? "No repositories match that search." : "No other public repositories to display right now.";
        grid.append(empty);
        return;
      }

      matches.forEach((repo) => {
        const card = document.createElement("a");
        card.className = "repo-card";
        card.href = repo.html_url;
        card.target = "_blank";
        card.rel = "noreferrer";
        card.setAttribute("aria-label", "Open GitHub repository " + repo.name);

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
        card.append(top, title, description, footer);
        grid.append(card);
      });
    };

    const loadAllRepos = async () => {
      const all = [];
      const seen = new Set();
      for (let page = 1; ; page += 1) {
        // The user-repositories endpoint already returns repositories owned by
        // this account. Avoid the optional "type" filter for broader API compatibility.
        const url = "https://api.github.com/users/" + USERNAME +
          "/repos?sort=updated&per_page=" + PAGE_SIZE + "&page=" + page;
        const response = await fetch(url, {
          headers: { Accept: "application/vnd.github+json" },
          cache: "no-store"
        });
        if (!response.ok) {
          let detail = "";
          try {
            const payload = await response.json();
            detail = payload.message ? ": " + payload.message : "";
          } catch (_) {}
          throw new Error("GitHub API HTTP " + response.status + detail);
        }
        const batch = await response.json();
        if (!Array.isArray(batch)) throw new Error("GitHub returned an invalid repository response");
        batch.forEach((repo) => {
          if (!seen.has(repo.id)) {
            seen.add(repo.id);
            all.push(repo);
          }
        });
        if (batch.length < PAGE_SIZE) break;
      }
      return all;
    };

    const refresh = async () => {
      if (busy) return;
      busy = true;
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      button.innerHTML = '<span aria-hidden="true">↻</span> Refreshing…';
      status.textContent = "Checking GitHub…";

      try {
        const allRepos = await loadAllRepos();
        const byName = new Map(allRepos.map((repo) => [repo.name.toLowerCase(), repo]));

        document.querySelectorAll("[data-repo][data-repo-meta]").forEach((card) => {
          const live = byName.get(card.getAttribute("data-repo").toLowerCase());
          // Featured case studies are curated portfolio content, not a live
          // mirror of GitHub. Keep them visible even if the API omits a repo.
          card.hidden = false;
          card.removeAttribute("data-repo-missing");
          if (!live) return;
          const meta = card.querySelector("[data-repo-meta]");
          if (meta) {
            const details = [];
            if (live.language) details.push(live.language);
            if (live.stargazers_count) details.push(live.stargazers_count + (live.stargazers_count === 1 ? " star" : " stars"));
            if (live.pushed_at || live.updated_at) {
              details.push("updated " + new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(new Date(live.pushed_at || live.updated_at)));
            }
            meta.textContent = details.join(" · ") || "Public repository";
          }
          const link = card.querySelector(".project-link");
          if (link) {
            link.href = live.html_url;
            link.textContent = "Inspect repository ↗";
          }
        });

        const featuredCount = document.querySelectorAll(".project-card[data-category]").length;
        const filterCount = document.querySelector('[data-project-filter="all"] span');
        if (filterCount) filterCount.textContent = String(featuredCount).padStart(2, "0");

        repos = allRepos.filter((repo) =>
          !repo.fork && !FEATURED_REPOS.has(repo.name.toLowerCase())
        ).sort((a, b) => new Date(b.pushed_at || b.updated_at) - new Date(a.pushed_at || a.updated_at));

        summary.replaceChildren();
        const dot = document.createElement("span");
        dot.className = "live-dot";
        const label = document.createElement("span");
        label.textContent = repos.length + " other public repositories · Live from GitHub";
        summary.append(dot, label);
        render();

        lastSyncedAt = new Date();
        status.textContent = "Last synced " + timestamp(lastSyncedAt);
      } catch (error) {
        console.error("[Portfolio] GitHub repository refresh failed:", error);
        status.textContent = lastSyncedAt
          ? "Refresh failed · last synced " + timestamp(lastSyncedAt)
          : "Sync failed · " + (error.message || "network/CORS error");
        if (!lastSyncedAt) {
          summary.textContent = "Could not load live GitHub repositories.";
          grid.replaceChildren();
          const message = document.createElement("div");
          message.className = "repo-empty";
          message.textContent = "Live repository sync failed: " + (error.message || "network/CORS error") + ". Open the GitHub profile to view repositories.";
          grid.append(message);
        }
      } finally {
        busy = false;
        button.disabled = false;
        button.removeAttribute("aria-busy");
        button.innerHTML = '<span aria-hidden="true">↻</span> Refresh';
      }
    };

    search.addEventListener("input", render);
    button.addEventListener("click", refresh);
    refresh();
    window.setInterval(refresh, REFRESH_INTERVAL);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();