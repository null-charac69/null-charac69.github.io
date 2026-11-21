import { onScroll, schedule, reduced, clamp, lerp, easeInOut } from "./scroll.js";

// The hero portrait travels down into the About column, flipping on its Y axis and
// growing slightly as it settles. Driven entirely by scroll position (no scroll hijack).
export function initPortrait() {
  const fly = document.getElementById("portraitFly");
  const heroCard = document.querySelector('[data-portrait-slot="hero"] .portrait-card');
  const aboutCard = document.querySelector('[data-portrait-slot="about"] .portrait-card');
  const main = document.getElementById("main");
  if (!fly || !heroCard || !aboutCard || !main) return;

  const narrow = window.matchMedia("(max-width: 900px)");
  const root = document.documentElement;
  let geo = null;

  const enabled = () => !reduced && !narrow.matches;

  function measure() {
    if (!enabled()) { root.classList.remove("fly-on"); geo = null; return; }
    const mainTop = main.getBoundingClientRect().top + window.scrollY;
    const box = (el) => {
      const b = el.getBoundingClientRect();
      return { w: b.width, h: b.height, cx: b.left + b.width / 2, cy: b.top + window.scrollY - mainTop + b.height / 2 };
    };
    const a = box(heroCard);
    const b = box(aboutCard);
    fly.style.width = b.w + "px";
    fly.style.height = b.h + "px";
    const end = mainTop + b.cy - window.innerHeight / 2; // scroll position where the card is centred in About
    geo = { a, b, end: Math.max(end, 1) };
    root.classList.add("fly-on");
    schedule();
  }

  function update(y) {
    if (!geo) return;
    const t = clamp(y / geo.end);
    const e = easeInOut(t);
    const { a, b } = geo;
    const scale = lerp(a.w / b.w, 1, e);
    const cx = lerp(a.cx, b.cx, e);
    const cy = lerp(a.cy, b.cy, e);
    fly.style.transform =
      `translate3d(${(cx - b.w / 2).toFixed(2)}px, ${(cy - b.h / 2).toFixed(2)}px, 0) perspective(1500px) rotateY(${(e * 360).toFixed(2)}deg) scale(${scale.toFixed(4)})`;
  }

  onScroll(update);
  measure();
  narrow.addEventListener("change", measure);
  window.addEventListener("resize", measure);
  window.addEventListener("load", measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  if ("ResizeObserver" in window) new ResizeObserver(measure).observe(main);
}
