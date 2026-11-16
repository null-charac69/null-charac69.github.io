// The name is set in a variable font. Letters near the pointer thin out, as if
// the cursor were pressing into them; a single sweep plays on load. Resting
// weight is the heaviest, so the line can only get narrower and never overflows.

const HEAVY = 900;
const LIGHT = 140;

export function initHero() {
  const name = document.getElementById("heroName");
  if (!name) return;
  const letters = Array.from(name.querySelectorAll(".hl"));
  if (!letters.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let centres = [];
  let radius = 1;

  function measure() {
    // Measure at rest; positions drift while letters thin, which is fine.
    letters.forEach((letter) => letter.style.removeProperty("--w"));
    centres = letters.map((letter) => {
      const box = letter.getBoundingClientRect();
      return { x: box.left + box.width / 2 + window.scrollX, y: box.top + box.height / 2 + window.scrollY };
    });
    radius = Math.max(120, name.getBoundingClientRect().width * 0.2);
  }

  function press(pageX, pageY) {
    letters.forEach((letter, index) => {
      const distance = Math.hypot(pageX - centres[index].x, pageY - centres[index].y);
      const near = Math.max(0, 1 - distance / radius);
      const eased = near * near * (3 - 2 * near);
      letter.style.setProperty("--w", String(Math.round(HEAVY - (HEAVY - LIGHT) * eased)));
    });
  }

  function release() {
    letters.forEach((letter) => letter.style.removeProperty("--w"));
  }

  function sweep() {
    const box = name.getBoundingClientRect();
    const y = box.top + box.height / 2 + window.scrollY;
    const from = box.left - radius;
    const to = box.right + radius;
    const duration = 1300;
    let start = 0;
    const frame = (now) => {
      if (!start) start = now;
      const progress = Math.min(1, (now - start) / duration);
      press(from + (to - from) * progress, y);
      if (progress < 1) window.requestAnimationFrame(frame);
      else release();
    };
    window.requestAnimationFrame(frame);
  }

  let queued = false;
  let last = null;
  window.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    last = event;
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(() => {
      queued = false;
      press(last.pageX, last.pageY);
    });
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", release);

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(measure, 150);
  });

  const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(() => {
    measure();
    window.setTimeout(sweep, 250);
  });
}
