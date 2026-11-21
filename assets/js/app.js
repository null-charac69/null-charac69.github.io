
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

function initClock() {
  const clock = document.getElementById("puneClock");
  const time = clock && clock.querySelector("time");
  if (!time) return;
  const format = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
  const tick = () => { time.textContent = format.format(new Date()); };
  tick();
  clock.hidden = false;
  window.setInterval(tick, 20000);
}

function initCopyEmail() {
  const button = document.getElementById("copyEmail");
  if (!button || !navigator.clipboard) {
    if (button) button.hidden = true;
    return;
  }
  const label = button.textContent;
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.email || "");
      button.textContent = "Copied";
    } catch {
      button.textContent = "Couldn't copy";
    }
    window.setTimeout(() => { button.textContent = label; }, 1600);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // The hero question box is handled by chat.js; never let it reload the page.
  document.querySelectorAll("[data-chat-ask]").forEach((form) => {
    form.addEventListener("submit", (event) => event.preventDefault());
  });

  lazy("Theme", "./modules/theme.js", "initTheme");
  lazy("Navigation", "./modules/navigation.js", "initNavigation");
  lazy("Hero", "./modules/hero.js", "initHero");
  lazy("Portrait", "./modules/portrait.js", "initPortrait");
  lazy("Folders", "./modules/folders.js", "initFolders");
  lazy("Timeline", "./modules/timeline.js", "initTimeline");
  lazy("Contact", "./modules/contact.js", "initContact");
  lazy("Crowd", "./modules/crowd.js", "initCrowd");
  lazy("Reveal", "./modules/reveal.js", "initReveal");
  run("Clock", initClock);
  run("Copy email", initCopyEmail);
  lazy("Repositories", "./modules/repositories.js", "initRepositories");
  lazy("Chat", "./modules/chat.js");

  const year = document.getElementById("currentYear");
  if (year) year.textContent = String(new Date().getFullYear());
});
