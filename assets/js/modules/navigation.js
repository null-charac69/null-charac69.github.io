import { reduced, onScroll } from "./scroll.js";

const SECTION_NAMES = { about: "About", skills: "Skills", work: "Projects", repos: "Repos", experience: "Experience", contact: "Contact" };

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

  // Hide the pill while reading down; any scroll up (or keyboard focus) brings it back.
  let lastY = window.scrollY;
  onScroll((y) => {
    root.classList.toggle("scrolled", y > 40);
    const menuOpen = overlay && overlay.classList.contains("open");
    const delta = y - lastY;
    if (menuOpen || y < 160) root.classList.remove("nav-hidden");
    else if (delta > 8) root.classList.add("nav-hidden");
    else if (delta < -8) root.classList.remove("nav-hidden");
    if (Math.abs(delta) > 8 || y < 160) lastY = y;
  });

  // Mark the current section in the overlay and name it in the pill.
  const pillSection = document.getElementById("pillSection");
  const links = Array.from(document.querySelectorAll(".menu-links a"));
  const sections = document.querySelectorAll("#home, #about, #skills, #work, #repos, #experience, #contact");
  if ("IntersectionObserver" in window && links.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const name = SECTION_NAMES[entry.target.id] || "";
        if (pillSection) {
          if (name) pillSection.textContent = name;
          pillSection.classList.toggle("on", Boolean(name));
        }
        links.forEach((link) => {
          if ((link.getAttribute("href") || "").endsWith("#" + entry.target.id)) link.setAttribute("aria-current", "true");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-40% 0px -50% 0px" });
    sections.forEach((section) => observer.observe(section));
  }
}
