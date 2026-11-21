import { onScroll, reduced, clamp } from "./scroll.js";

// A sine wave that draws itself as the section scrolls into view. Milestones sit on its
// crests and troughs, so their text blocks stagger high and low. Narrow screens get a
// plain vertical line that draws the same way.
export function initTimeline() {
  const tl = document.getElementById("timeline");
  const svg = document.getElementById("tlWave");
  const base = document.getElementById("tlBase");
  const draw = document.getElementById("tlDraw");
  const grad = document.getElementById("tlGrad");
  const list = document.getElementById("tlList");
  if (!tl || !svg || !base || !draw || !list) return;

  const items = Array.from(list.querySelectorAll(".tl-item"));
  const narrow = window.matchMedia("(max-width: 900px)");
  const N = items.length;
  const H = 220, MID = 110, AMP = 58;
  let vertical = narrow.matches;
  let f0 = 0, f1 = 1, thresholds = [];

  function build() {
    vertical = narrow.matches;
    if (vertical) {
      items.forEach((li) => { li.style.left = ""; li.style.top = ""; });
      list.style.removeProperty("--tl-h");
      return;
    }
    const W = tl.clientWidth;
    const hp = W / N;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    grad.setAttribute("x2", W);

    // Extremum i sits at x = (i + 0.5) * hp; even i are crests, odd are troughs.
    const pts = [];
    for (let i = -1; i <= N; i += 1) pts.push([(i + 0.5) * hp, i % 2 === 0 ? MID - AMP : MID + AMP]);
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i += 1) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const k = (x1 - x0) * 0.364;
      d += ` C${(x0 + k).toFixed(1)} ${y0} ${(x1 - k).toFixed(1)} ${y1} ${x1.toFixed(1)} ${y1}`;
    }
    base.setAttribute("d", d);
    draw.setAttribute("d", d);

    // Path length is split equally between the N+2 extrema; x=0 and x=W fall mid-segment.
    f0 = 0.5 / (N + 1);
    f1 = (N + 0.5) / (N + 1);
    thresholds = items.map((_, i) => ((i + 1) / (N + 1) - f0) / (f1 - f0));

    let bottom = 0;
    items.forEach((li, i) => {
      li.style.left = ((i + 0.5) * hp).toFixed(1) + "px";
      li.style.top = (i % 2 === 0 ? MID - AMP : MID + AMP) + "px";
      li.classList.toggle("crest", i % 2 === 0);
      const body = li.querySelector(".tl-body");
      bottom = Math.max(bottom, parseFloat(li.style.top) + (i % 2 === 0 ? 54 : 30) + (body ? body.offsetHeight : 0));
    });
    list.style.setProperty("--tl-h", Math.ceil(bottom + 8) + "px");
  }

  function apply(p) {
    if (vertical) {
      tl.style.setProperty("--p", p.toFixed(3));
      const rect = list.getBoundingClientRect();
      items.forEach((li) => {
        const node = li.querySelector(".tl-node");
        const y = node ? node.getBoundingClientRect().top - rect.top : 0;
        li.classList.toggle("on", p * rect.height >= y - 4);
      });
      return;
    }
    const f = f0 + (f1 - f0) * p;
    draw.style.strokeDashoffset = (1 - f).toFixed(4);
    items.forEach((li, i) => li.classList.toggle("on", p >= thresholds[i] - 0.001));
  }

  function progress(vh) {
    const rect = tl.getBoundingClientRect();
    return vertical
      ? clamp((vh * 0.78 - rect.top) / Math.max(rect.height, 1))
      : clamp((vh * 0.88 - rect.top) / (vh * 0.55));
  }

  build();
  narrow.addEventListener("change", () => { build(); apply(reduced ? 1 : progress(window.innerHeight)); });
  if ("ResizeObserver" in window) new ResizeObserver(() => { build(); apply(reduced ? 1 : progress(window.innerHeight)); }).observe(tl);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);

  if (reduced) { apply(1); return; }
  onScroll((_, vh) => apply(progress(vh)));
}
