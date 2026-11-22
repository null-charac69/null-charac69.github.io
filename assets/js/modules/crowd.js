import { reduced } from "./scroll.js";

// Footer band: a halftone portrait of Anant drawn on a canvas, one dot per sampled cell of his
// photo (assets/illustrations/portrait-dots.json). The dots assemble when the band scrolls into
// view (every time it does) and shimmer while idle. Rows of words drift past behind the portrait (CSS, see .stream).
const LEVELS = 35;

function decode(data) {
  const alpha = "0123456789abcdefghijklmnopqrstuvwxyz";
  const cells = [];
  data.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const v = alpha.indexOf(row[x]);
      if (v > 0) cells.push({ cx: x, cy: y, d: v / LEVELS });
    }
  });
  return { n: data.n, cells };
}

export async function initCrowd() {
  const crowd = document.getElementById("crowd");
  const canvas = document.getElementById("crowdCanvas");
  if (!crowd || !canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let portrait;
  try {
    const response = await fetch(crowd.dataset.dots);
    portrait = decode(await response.json());
  } catch (error) {
    console.error("[Portfolio] Portrait dots failed:", error);
    return;
  }

  const dots = portrait.cells.map((c) => ({ ...c, hx: 0, hy: 0, x: 0, y: 0, vx: 0, vy: 0, r: 0 }));

  let W = 0, H = 0, dpr = 1, cell = 1;
  let assembled = reduced;
  let visible = false, raf = 0, started = 0;

  function layout() {
    const rect = crowd.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const size = H * 0.98;
    cell = size / portrait.n;
    const left = (W - size) / 2, top = H - size;
    dots.forEach((d) => {
      d.hx = left + (d.cx + 0.5) * cell;
      d.hy = top + (d.cy + 0.5) * cell;
      d.r = Math.max(0.6, d.d * cell * 0.6);
      if (assembled) { d.x = d.hx; d.y = d.hy; }
    });
  }

  function scatter() {
    dots.forEach((d) => {
      const side = Math.random() < 0.5 ? -1 : 1;
      d.x = W / 2 + side * (W * 0.25 + Math.random() * W * 0.4);
      d.y = Math.random() * H;
      d.delay = Math.random() * 500 + (d.cy / portrait.n) * 500;
    });
  }

  function draw(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Clear the words behind the figure so the silhouette reads.
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    const pad = cell * 0.62;
    for (const d of dots) ctx.rect(d.hx - pad, d.hy - pad, pad * 2, pad * 2);
    ctx.fill();

    // Dots, with a slow shimmer while idle.
    ctx.fillStyle = "#0a0a0a";
    ctx.beginPath();
    for (const d of dots) {
      const shimmer = reduced ? 1 : 1 + 0.1 * Math.sin(t * 0.0018 - d.hx * 0.025 - d.hy * 0.018);
      const r = d.r * shimmer;
      if (r > 0.3) {
        ctx.moveTo(d.x + r, d.y);
        ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  }

  function step(t) {
    raf = 0;
    const since = t - started;
    if (!assembled) {
      for (const d of dots) {
        if (since < d.delay) continue;
        d.vx = (d.vx + (d.hx - d.x) * 0.045) * 0.84;
        d.vy = (d.vy + (d.hy - d.y) * 0.045) * 0.84;
        d.x += d.vx;
        d.y += d.vy;
      }
      if (since > 2800) { assembled = true; for (const d of dots) { d.x = d.hx; d.y = d.hy; } }
    }
    draw(t);
    if (visible) raf = requestAnimationFrame(step);
  }
  const kick = () => { if (!raf && visible && !reduced) raf = requestAnimationFrame(step); };

  layout();
  if (reduced) draw(0); else scatter();

  new ResizeObserver(() => { layout(); if (reduced) draw(0); }).observe(crowd);

  // Every visit replays it: the dots scatter once the band is fully out of view and
  // assemble again the next time it scrolls in.
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && entry.intersectionRatio >= 0.25;
    crowd.classList.toggle("paused", !entry.isIntersecting);
    if (visible && !started) started = performance.now();
    if (visible) kick();
    if (!entry.isIntersecting && !reduced && assembled) {
      assembled = false;
      started = 0;
      scatter();
      for (const d of dots) { d.vx = 0; d.vy = 0; }
    }
  }, { threshold: [0, 0.25] }).observe(crowd);
}
