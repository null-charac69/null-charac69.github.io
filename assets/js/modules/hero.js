import { onScroll, reduced, clamp, easeOutExpo } from "./scroll.js";

// Decorative code, revealed only inside the cursor spotlight.
const CODE = [
  "graph = StateGraph(AgentState)",
  "graph.add_node('planner', plan_task)",
  "graph.add_conditional_edges('critic', route_revision, {'revise': 'planner', 'done': END})",
  "def hybrid_search(query, k=20): dense = store.search(embed(query), k); sparse = bm25.top(query, k)",
  "scores = reciprocal_rank_fusion([dense, sparse], k=60)",
  "ranked = reranker.rank(query, candidates)[:5]",
  "async for event in graph.astream(state): yield sse(event)",
  "class Answer(BaseModel): text: str; citations: list[Citation]",
  "report = evaluate(dataset, metrics=[faithfulness, context_precision, answer_relevancy])",
  "if not verify_citations(answer, docs): return retry_with_feedback(state)",
  "cache.setex(key, 3600, json.dumps(result))",
  "session = ort.InferenceSession('model.int4.onnx', providers=providers)",
  "route = router.pick(task, cost_ceiling=budget, latency_slo=slo)",
  "state = {'messages': [], 'plan': None, 'draft': None, 'revisions': 0}",
  "for chunk in splitter.split(doc): index.upsert(embed(chunk), metadata=chunk.meta)",
  "with trace('retrieval'): hits = retriever.invoke(question)",
];

export function initHero() {
  const hero = document.getElementById("home");
  const title = document.getElementById("heroTitle");
  const canvas = document.getElementById("heroCanvas");
  if (!hero || !title) return;

  initTitle(hero, title);
  if (canvas) initSpotlight(hero, canvas);
}

/* ---- Kinetic title: lands from a 3D split on load, splays apart again as you scroll away ---- */
function initTitle(hero, title) {
  const l1 = title.querySelector(".hero-line-1");
  const l2 = title.querySelector(".hero-line-2");
  if (!l1 || !l2 || reduced) return;

  let load = 1;   // 1 = split apart, 0 = locked flat
  let scroll = 0; // 0 at top, 1 once the hero has scrolled away

  const apply = () => {
    const p = clamp(load + scroll);
    const q = 1 - p;
    l1.style.transform = `translate3d(${-p * 15}vw, ${-p * 2}vh, 0) rotateX(${p * 28}deg) rotateY(${p * 40}deg) scale(${1 - p * 0.1})`;
    l2.style.transform = `translate3d(${p * 15}vw, ${p * 2}vh, 0) rotateX(${-p * 28}deg) rotateY(${-p * 40}deg) scale(${1 - p * 0.1})`;
    const o = 0.12 + q * 0.88;
    l1.style.opacity = o;
    l2.style.opacity = o;
  };

  apply();
  const start = performance.now() + 180;
  const step = (now) => {
    const t = clamp((now - start) / 1500);
    load = 1 - easeOutExpo(t);
    apply();
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);

  onScroll((y, vh) => {
    scroll = clamp(y / (vh * 0.8));
    apply();
  });
}

/* ---- Cursor spotlight: faint scanlines everywhere, code only inside the soft radial mask ---- */
function initSpotlight(hero, canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const layer = document.createElement("canvas");
  const lctx = layer.getContext("2d");
  const coarse = window.matchMedia("(hover: none)").matches;

  let w = 0, h = 0, dpr = 1;
  let px = 0, py = 0, tx = 0, ty = 0;
  let intensity = 0, targetIntensity = 0;
  let visible = true, raf = 0, drift = coarse;

  function inkColour() {
    const rgb = getComputedStyle(document.documentElement).getPropertyValue("--ink-rgb").trim() || "255,255,255";
    return `rgba(${rgb},.62)`;
  }

  function buildLayer() {
    layer.width = canvas.width;
    layer.height = canvas.height;
    lctx.clearRect(0, 0, layer.width, layer.height);
    const size = 12 * dpr;
    const lineHeight = 19 * dpr;
    lctx.font = `${size}px 'JetBrains Mono', ui-monospace, monospace`;
    lctx.fillStyle = inkColour();
    lctx.textBaseline = "top";
    const rows = Math.ceil(layer.height / lineHeight);
    for (let r = 0; r < rows; r += 1) {
      const text = CODE[(r * 5 + 3) % CODE.length];
      const shift = -((r * 83) % 260) * dpr;
      let line = "";
      while (line.length * size * 0.6 < layer.width + 300 * dpr) line += text + "     ";
      lctx.fillText(line, shift, r * lineHeight + 3 * dpr);
    }
  }

  function draw() {
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (intensity < 0.005) return;
    ctx.drawImage(layer, 0, 0);
    const R = Math.max(220, Math.min(w, h) * 0.34) * dpr;
    const gx = px * dpr, gy = py * dpr;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, R);
    g.addColorStop(0, `rgba(0,0,0,${intensity})`);
    g.addColorStop(0.5, `rgba(0,0,0,${intensity * 0.5})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "source-over";
  }

  function frame(now) {
    raf = 0;
    if (drift) {
      tx = w * (0.5 + 0.32 * Math.cos(now * 0.00035));
      ty = h * (0.42 + 0.26 * Math.sin(now * 0.00052));
      targetIntensity = 0.85;
    }
    px += (tx - px) * 0.12;
    py += (ty - py) * 0.12;
    intensity += (targetIntensity - intensity) * 0.1;
    draw();
    const settling = Math.abs(tx - px) > 0.4 || Math.abs(ty - py) > 0.4 || Math.abs(targetIntensity - intensity) > 0.01;
    if (visible && (drift || settling)) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const rect = hero.getBoundingClientRect();
    w = rect.width; h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    buildLayer();
    if (!px && !py) { px = tx = w / 2; py = ty = h * 0.4; }
    draw();
  }

  const ready = (document.fonts && document.fonts.load ? document.fonts.load("12px 'JetBrains Mono'") : Promise.resolve()).catch(() => {});
  ready.then(() => {
    resize();
    if (reduced) { px = w / 2; py = h * 0.4; intensity = 0.55; draw(); return; }

    new ResizeObserver(resize).observe(hero);
    window.addEventListener("themechange", () => { buildLayer(); draw(); });

    if (!coarse) {
      hero.addEventListener("pointermove", (event) => {
        const rect = hero.getBoundingClientRect();
        tx = event.clientX - rect.left;
        ty = event.clientY - rect.top;
        targetIntensity = 1;
        drift = false;
        kick();
      });
      hero.addEventListener("pointerleave", () => { targetIntensity = 0; kick(); });
    }

    // Only animate while the hero is on screen.
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) kick();
    }).observe(hero);
    kick();
  });
}
