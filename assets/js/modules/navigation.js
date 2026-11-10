export function initNavigation() {
  const header = document.getElementById("siteHeader");
  const progress = document.getElementById("readingProgress");
  const menuToggle = document.getElementById("menuToggle");
  const mobileNav = document.getElementById("mobileNav");

  function updateScrollUI() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const percentage = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    if (progress) progress.style.width = Math.min(100, Math.max(0, percentage)) + "%";
    if (header) header.classList.toggle("scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", updateScrollUI, { passive: true });
  updateScrollUI();

  if (menuToggle && mobileNav) {
    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
      mobileNav.hidden = isOpen;
    });

    mobileNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        mobileNav.hidden = true;
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Open navigation");
      });
    });
  }

  const desktopLinks = Array.from(document.querySelectorAll(".desktop-nav a"));
  const sections = document.querySelectorAll("#about, #work, #experience, #toolkit, #open-source");
  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        desktopLinks.forEach((link) => {
          link.classList.toggle("active", link.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-35% 0px -55% 0px" });
    sections.forEach((section) => sectionObserver.observe(section));
  }
}
