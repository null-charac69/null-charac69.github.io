export function initNavigation() {
  const header = document.getElementById("siteHeader");
  const menuToggle = document.getElementById("menuToggle");
  const mobileNav = document.getElementById("mobileNav");

  const updateHeader = () => {
    if (header) header.classList.toggle("scrolled", window.scrollY > 8);
  };
  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();

  if (menuToggle && mobileNav) {
    const setOpen = (open) => {
      mobileNav.hidden = !open;
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    };
    menuToggle.addEventListener("click", () => setOpen(mobileNav.hidden));
    mobileNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setOpen(false)));
  }

  const links = Array.from(document.querySelectorAll(".desktop-nav a"));
  const sections = document.querySelectorAll("#work, #about, #repos, #contact");
  if ("IntersectionObserver" in window && links.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => {
          link.classList.toggle("active", (link.getAttribute("href") || "").endsWith("#" + entry.target.id));
        });
      });
    }, { rootMargin: "-35% 0px -55% 0px" });
    sections.forEach((section) => observer.observe(section));
  }
}
