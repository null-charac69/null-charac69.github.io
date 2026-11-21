import { reduced } from "./scroll.js";

// Elements marked [data-reveal] rise in once as they enter the viewport.
export function initReveal() {
  const targets = document.querySelectorAll("[data-reveal]");
  if (!targets.length || reduced || !("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("in");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  document.documentElement.classList.add("reveal-ready");
  targets.forEach((target) => observer.observe(target));
}
