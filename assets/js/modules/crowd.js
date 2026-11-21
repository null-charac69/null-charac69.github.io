import { reduced } from "./scroll.js";

// Footer band: a halftone portrait of Anant drawn on a canvas, one dot per sampled cell of his
// photo (assets/illustrations/portrait-dots.json). The dots assemble when the band scrolls into
// view and shimmer while idle. Around the cursor, dots turn into code glyphs (same shading, so the
// face stays readable) and a soft spotlight reveals faint scanlines and code behind him, like the
// hero. Rows of words drift past behind the portrait (CSS, see .stream).
const LEVELS = 35;
const GLYPHS = "{}[]<>/=+*#01;:()AGENTRAGLLMAPIQDRNTFS".split("");
const CODE = [
  "graph = StateGraph(AgentState)",
  "graph.add_conditional_edges('critic', route, {'revise': 'planner', 'done': END})",
  "scores = reciprocal_rank_fusion([dense, sparse], k=60)",
  "ranked = reranker.rank(query, candidates)[:5]",
  "async for event in graph.astream(state): yield sse(event)",
  "if not verify_citations(answer, docs): return retry(state)",
  "plan = coach.propose_draft(live_plan, logs)  # never edits directly",
  "report = evaluate(dataset, metrics=[faithfulness, context_precision])",
];

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

  const dots = portrait.cells.map((c, i) => ({ ...c, hx: 0, hy: 0, x: 0, y: 0, vx: 0, vy: 0, r: 0, g: GLYPHS[(i * 7 + c.cx * 3 + c.cy) % GLYPHS.length] }));
  const spot = document.createElement("canvas");
  const sctx = spot.getContext("2d");
  const codeLayer = document.createElement("canvas");
  const cctx = codeLayer.getContext("2d");

  let W = 0, H = 0, dpr = 1, cell = 1;
  const lens = { x: 0, y: 0, tx: 0, ty: 0, k: 0, target: 0 };   // k: 0..1 fade of the effect
  let assembled = reduced;
  let visible = false, raf = 0, started = 0, tapUntil = 0;

  function buildCodeLayer() {
    codeLayer.width = spot.width = canvas.width;
    codeLayer.height = spot.height = canvas.height;
    cctx.clearRect(0, 0, codeLayer.width, codeLayer.height);
    cctx.fillStyle = "rgba(10,10,10,.07)";                       // scanlines
    for (let y = 0; y < codeLayer.height; y += 4 * dpr) cctx.fillRect(0, y, codeLayer.width, dpr);
    const size = 12 * dpr, lh = 19 * dpr;
    cctx.font = `${size}px 'JetBrains Mono', ui-monospace, monospace`;
    cctx.fillStyle = "rgba(10,10,10,.55)";
    cctx.textBaseline = "top";
    for (let r = 0, y = 4 * dpr; y < codeLayer.height; r += 1, y += lh) {
      const text = CODE[(r * 3 + 1) % CODE.length];
      let line = "";
      while (line.length * size * 0.6 < codeLayer.width + 300 * dpr) line += text + "     ";
      cctx.fillText(line, -((r * 97) % 280) * dpr, y);
    }
  }

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
    buildCodeLayer();
  }

  function scatter() {
    dots.forEach((d) => {
      const side = Math.random() < 0.5 ? -1 : 1;
      d.x = W / 2 + side * (W * 0.25 + Math.random() * W * 0.4);
      d.y = Math.random() * H;
      d.delay = Math.random() * 500 + (d.cy / portrait.n) * 500;
    });
  }

  const smooth = (e) => e * e * (3 - 2 * e);

  function draw(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Code spotlight behind the portrait.
    if (lens.k > 0.01) {
      const R = Math.max(240, H * 0.7) * dpr;
      const gx = lens.x * dpr, gy = lens.y * dpr;
      sctx.globalCompositeOperation = "source-over";
      sctx.clearRect(0, 0, spot.width, spot.height);
      sctx.drawImage(codeLayer, 0, 0);
      const g = sctx.createRadialGradient(gx, gy, 0, gx, gy, R);
      g.addColorStop(0, `rgba(0,0,0,${lens.k})`);
      g.addColorStop(0.55, `rgba(0,0,0,${lens.k * 0.45})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      sctx.globalCompositeOperation = "destination-in";
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, spot.width, spot.height);
      ctx.drawImage(spot, 0, 0);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Clear the words and code behind the figure so the silhouette reads.
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    const pad = cell * 0.62;
    for (const d of dots) ctx.rect(d.hx - pad, d.hy - pad, pad * 2, pad * 2);
    ctx.fill();

    // Dots, shrinking where the code lens takes over.
    const LR = Math.max(80, H * 0.24);
    const glyphs = [];
    ctx.fillStyle = "#0a0a0a";
    ctx.beginPath();
    for (const d of dots) {
      let m = 0;
      if (lens.k > 0.01) {
        const dist = Math.hypot(d.x - lens.x, d.y - lens.y);
        if (dist < LR) m = smooth(1 - dist / LR) * lens.k;
      }
      const shimmer = reduced ? 1 : 1 + 0.1 * Math.sin(t * 0.0018 - d.hx * 0.025 - d.hy * 0.018);
      const r = d.r * shimmer * (1 - m);
      if (m > 0.05 && d.cx % 2 === 0 && d.cy % 2 === 0) glyphs.push([d, m]);
      if (r > 0.3) {
        ctx.moveTo(d.x + r, d.y);
        ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      }
    }
    ctx.fill();

    // Glyphs, bucketed by size so the font is set only a few times per frame.
    if (glyphs.length) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const buckets = new Map();
      for (const [d, m] of glyphs) {
        const size = Math.max(8, Math.round(cell * 2.05));
        if (!buckets.has(size)) buckets.set(size, []);
        buckets.get(size).push([d, m]);
      }
      buckets.forEach((list, size) => {
        ctx.font = `700 ${size}px 'JetBrains Mono', ui-monospace, monospace`;
        for (const [d, m] of list) {
          ctx.globalAlpha = Math.min(1, m * 1.3) * (0.3 + 0.7 * d.d);
          ctx.fillText(d.g, d.x, d.y);
        }
      });
      ctx.globalAlpha = 1;
    }
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
    if (tapUntil && t > tapUntil) { lens.target = 0; tapUntil = 0; }
    lens.x += (lens.tx - lens.x) * 0.2;
    lens.y += (lens.ty - lens.y) * 0.2;
    lens.k += (lens.target - lens.k) * 0.1;
    draw(t);
    if (visible) raf = requestAnimationFrame(step);
  }
  const kick = () => { if (!raf && visible && !reduced) raf = requestAnimationFrame(step); };

  layout();
  if (reduced) draw(0); else scatter();

  new ResizeObserver(() => { layout(); if (reduced) draw(0); }).observe(crowd);
  if (document.fonts && document.fonts.load) document.fonts.load("12px 'JetBrains Mono'").then(buildCodeLayer).catch(() => {});

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    crowd.classList.toggle("paused", !visible);
    if (visible && !started) started = performance.now();
    if (visible) kick();
  }, { threshold: 0.25 }).observe(crowd);

  if (reduced) return;

  const local = (event) => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  crowd.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") return;
    const p = local(event);
    if (lens.k < 0.02) { lens.x = p.x; lens.y = p.y; }
    lens.tx = p.x; lens.ty = p.y; lens.target = 1;
    kick();
  });
  crowd.addEventListener("pointerleave", () => { lens.target = 0; });
  // Touch: a tap opens the code lens where the finger lands for a moment.
  crowd.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch") return;
    const p = local(event);
    lens.x = lens.tx = p.x; lens.y = lens.ty = p.y; lens.target = 1;
    tapUntil = performance.now() + 1400;
    kick();
  });
}
