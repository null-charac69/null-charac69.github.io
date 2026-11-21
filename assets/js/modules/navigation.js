import { reduced } from "./scroll.js";

// Floating pill navbar + full-screen menu overlay + smooth "back to top".
export function initNavigation() {
  const toggle = document.getElementById("menuToggle");
  const overlay = document.getElementById("menuOverlay");
  const label = document.getElementById("menuLabel");
  const root = document.documentElement;
  const behavior = reduced ? "auto" : "smooth";

  const toTop = (event) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior });
  };
  document.getElementById("brandHome")?.addEventListener("click", (event) => {
    setOpen(false);
    toTop(event);
  });
  document.getElementById("backToTop")?.addEventListener("click", toTop);

  function setOpen(open) {
    if (!toggle || !overlay) return;
    overlay.classList.toggle("open", open);
    overlay.setAttribute("aria-hidden", String(!open));
    toggle.setAttribute("aria-expanded", String(open));
    if (label) label.textContent = open ? "Close" : "Menu";
    root.style.overflow = open ? "hidden" : "";
    if (open) { overlay.setAttribute("tabindex", "-1"); overlay.focus({ preventScroll: true }); }
  }

  if (toggle && overlay) {
    toggle.addEventListener("click", () => setOpen(!overlay.classList.contains("open")));
    overlay.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && overlay.classList.contains("open")) {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  // Mark the current section in the overlay.
  const links = Array.from(document.querySelectorAll(".menu-links a"));
  const sections = document.querySelectorAll("#home, #about, #skills, #work, #repos, #experience, #contact");
  if ("IntersectionObserver" in window && links.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => {
          if ((link.getAttribute("href") || "").endsWith("#" + entry.target.id)) link.setAttribute("aria-current", "true");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-40% 0px -50% 0px" });
    sections.forEach((section) => observer.observe(section));
  }
}
