(function () {
  "use strict";

  var root = document.documentElement;
  var header = document.getElementById("siteHeader");
  var progress = document.getElementById("readingProgress");
  var menuToggle = document.getElementById("menuToggle");
  var mobileNav = document.getElementById("mobileNav");
  var themeToggle = document.getElementById("themeToggle");
  var currentYear = document.getElementById("currentYear");

  currentYear.textContent = String(new Date().getFullYear());

  var savedTheme = localStorage.getItem("portfolio-theme");
  if (savedTheme === "dark" || savedTheme === "light") {
    root.setAttribute("data-theme", savedTheme);
  }

  themeToggle.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("portfolio-theme", next);
    themeToggle.setAttribute("aria-label", next === "dark" ? "Switch to light theme" : "Switch to dark theme");
  });

  menuToggle.addEventListener("click", function () {
    var isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
    mobileNav.hidden = isOpen;
  });

  mobileNav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      mobileNav.hidden = true;
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation");
    });
  });

  function updateScrollUI() {
    var scrollable = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
    progress.style.width = Math.min(100, Math.max(0, ratio * 100)) + "%";
    header.classList.toggle("scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", updateScrollUI, { passive: true });
  updateScrollUI();

  var revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" });
    revealItems.forEach(function (item) { observer.observe(item); });
  } else {
    revealItems.forEach(function (item) { item.classList.add("is-visible"); });
  }

  var navLinks = Array.from(document.querySelectorAll(".desktop-nav a"));
  var observedSections = document.querySelectorAll("#about, #work, #experience, #toolkit");
  if ("IntersectionObserver" in window) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          link.classList.toggle("active", link.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-35% 0px -55% 0px" });
    observedSections.forEach(function (section) { sectionObserver.observe(section); });
  }

  async function loadGitHubSignals() {
    var syncLabel = document.getElementById("repoSync");
    var cards = document.querySelectorAll("[data-repo]");
    try {
      var response = await fetch("https://api.github.com/users/null-charac69/repos?sort=updated&per_page=100", {
        headers: { "Accept": "application/vnd.github+json" },
        cache: "no-store"
      });
      if (!response.ok) throw new Error("GitHub API unavailable");
      var repositories = await response.json();
      cards.forEach(function (card) {
        var name = card.getAttribute("data-repo");
        var repository = repositories.find(function (item) { return item.name.toLowerCase() === name.toLowerCase(); });
        if (!repository) return;
        var metadata = card.querySelector("[data-repo-meta]");
        if (!metadata) return;
        var updated = repository.pushed_at ? new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(new Date(repository.pushed_at)) : "";
        var parts = [];
        if (repository.language) parts.push(repository.language);
        if (repository.stargazers_count > 0) parts.push(repository.stargazers_count + (repository.stargazers_count === 1 ? " star" : " stars"));
        if (updated) parts.push("updated " + updated);
        metadata.textContent = parts.length ? parts.join(" · ") : "Public repository";
      });
      syncLabel.textContent = "Synced " + new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(new Date());
    } catch (error) {
      syncLabel.textContent = "Repository links available";
    }
  }

  loadGitHubSignals();

  document.querySelectorAll("[data-chat-open]").forEach(function (button) {
    button.addEventListener("click", function () {
      var launcher = document.getElementById("chatLauncher");
      if (launcher) launcher.click();
    });
  });
})();
