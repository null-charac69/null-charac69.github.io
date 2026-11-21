// One shared scroll loop: modules subscribe instead of each adding listeners.
export const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const subscribers = new Set();
let queued = false;

function run() {
  queued = false;
  const y = window.scrollY;
  const vh = window.innerHeight;
  subscribers.forEach((fn) => fn(y, vh));
}

export function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(run);
}

export function onScroll(fn) {
  subscribers.add(fn);
  schedule();
  return () => subscribers.delete(fn);
}

window.addEventListener("scroll", schedule, { passive: true });
window.addEventListener("resize", schedule);

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
