import { reduced, onScroll, clamp } from "./scroll.js";

// Scroll scenes, scrubbed like the timeline wave: every [data-scrub] element gets --p (0..1)
// from where it sits in the viewport. It builds as the element comes in from either edge and
// unwinds as it leaves, so each pass replays it, in both directions. CSS ("Scroll scenes" in
// components.css) turns --p into motion; without JS or with reduced motion --p falls back to 1
// and everything simply shows.
//   data-scrub="enter,exit"  enter: share of the viewport height over which it builds (default .45)
//                            exit: share at the top where it unwinds again (default .15, 0 = never)
//   data-peek                also sets --c, 1 at the middle of the viewport (project folders)
//   data-split               heading whose words tumble up out of a mask
//   data-stagger="sel"       numbers matching descendants with --i (and sets --n on the group)
//   data-count="500"         number that counts up with its scene
//   data-scramble            text that decodes from random characters with its scene

const smooth = (t) => t * t * (3 - 2 * t);
const NOISE = "abcdefghijklmnopqrstuvwxyz0123456789";
// Repeatable pseudo-random numbers, so the scattered tags land the same way every visit.
const rand = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };

function splitWords(heading) {
  const text = [...heading.childNodes].map((n) => (n.nodeName === "BR" ? " " : n.textContent)).join("").replace(/\s+/g, " ").trim();
  [...heading.childNodes].forEach((node) => {
    if (node.nodeType !== Node.TEXT_NODE) return;
    const fragment = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { fragment.append(part); return; }
      const mask = document.createElement("span");
      const word = document.createElement("span");
      mask.className = "w";
      mask.setAttribute("aria-hidden", "true");
      word.textContent = part;
      mask.append(word);
      fragment.append(mask);
    });
    node.replaceWith(fragment);
  });
  const words = heading.querySelectorAll(".w");
  words.forEach((word, i) => word.style.setProperty("--i", String(i)));
  heading.style.setProperty("--n", String(words.length));
  // Screen readers get the heading as one phrase, not word by word.
  const spoken = document.createElement("span");
  spoken.className = "visually-hidden";
  spoken.textContent = text;
  heading.prepend(spoken);
  heading.querySelectorAll("br").forEach((br) => br.setAttribute("aria-hidden", "true"));
  if (!heading.hasAttribute("data-scrub")) heading.setAttribute("data-scrub", "0.4,0.12");
}

// Wrap every word of a passage so it can ink in as the reader moves down it.
function inkWords(block) {
  let i = 0;
  block.querySelectorAll("p").forEach((p) => {
    const fragment = document.createDocumentFragment();
    p.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { fragment.append(part); return; }
      const word = document.createElement("span");
      word.className = "wd";
      word.style.setProperty("--i", String(i++));
      word.textContent = part;
      fragment.append(word);
    });
    p.replaceChildren(fragment);
  });
  block.style.setProperty("--n", String(i));
}

// Keep the real sentence for screen readers while the visible copy animates.
function shadowText(el) {
  const spoken = document.createElement("span");
  spoken.className = "visually-hidden";
  spoken.textContent = el.textContent;
  const shown = document.createElement("span");
  shown.setAttribute("aria-hidden", "true");
  shown.append(...el.childNodes);
  el.append(spoken, shown);
}

function scramble(el, p) {
  const text = el.dataset.text;
  if (p >= 1) { if (el.textContent !== text) el.textContent = text; return; }
  const solved = Math.floor(text.length * p);
  let out = text.slice(0, solved);
  for (let i = solved; i < text.length; i += 1) {
    const ch = text[i];
    out += ch === "@" || ch === "." ? ch : NOISE[Math.floor(Math.random() * NOISE.length)];
  }
  el.textContent = out;
}

export function initReveal() {
  if (reduced) return;

  document.querySelectorAll("[data-split]").forEach(splitWords);
  document.querySelectorAll(".ink[data-scrub]").forEach(inkWords);
  document.querySelectorAll("[data-stagger]").forEach((group) => {
    const items = group.querySelectorAll(group.dataset.stagger);
    items.forEach((item, i) => item.style.setProperty("--i", String(i)));
    group.style.setProperty("--n", String(items.length));
  });
  document.querySelectorAll(".pills").forEach((list) => {
    const pills = list.querySelectorAll(".pill");
    list.style.setProperty("--n", String(pills.length));
    pills.forEach((pill, i) => {
      pill.style.setProperty("--i", String(i));
      pill.style.setProperty("--dx", ((rand(i, 1) - 0.5) * 320).toFixed(0) + "px");
      pill.style.setProperty("--dy", (80 + rand(i, 2) * 180).toFixed(0) + "px");
      pill.style.setProperty("--dr", ((rand(i, 3) - 0.5) * 70).toFixed(0) + "deg");
    });
  });
  document.querySelectorAll("[data-count]").forEach((el) => {
    const host = el.closest("[data-scrub]");
    if (host && !host.dataset.shadowed) { shadowText(host); host.dataset.shadowed = "1"; }
  });
  document.querySelectorAll("[data-scramble]").forEach((el) => {
    el.dataset.text = el.textContent.trim();
    el.setAttribute("aria-label", el.dataset.text);
  });

  const scenes = [...document.querySelectorAll("[data-scrub]")].map((el) => {
    const [enter, exit] = (el.dataset.scrub || "").split(",").map(Number);
    return {
      el,
      enter: enter > 0 ? enter : 0.45,
      exit: Number.isFinite(exit) ? exit : 0.15,
      peek: el.hasAttribute("data-peek"),
      counts: [...el.querySelectorAll("[data-count]")],
      scrambles: [...el.querySelectorAll("[data-scramble]")],
      p: -1, c: -1, tp: 1, tc: 0,
    };
  });

  let raf = 0;

  function paint(s) {
    const e = smooth(s.p);
    s.el.style.setProperty("--p", e.toFixed(4));
    // Facts must be right whenever the reader is looking, so these finish ahead of their scene.
    const early = clamp(s.p * 1.5);
    s.counts.forEach((el) => { el.textContent = String(Math.round(Number(el.dataset.count) * smooth(early))); });
    s.scrambles.forEach((el) => scramble(el, early));
  }

  function frame() {
    raf = 0;
    let moving = false;
    scenes.forEach((s) => {
      // Ease toward the scroll target, so fast flicks still read as motion.
      const step = (from, to) => {
        if (from < 0) return to;
        const next = from + (to - from) * 0.14;
        if (Math.abs(to - next) < 0.002) return to;
        moving = true;
        return next;
      };
      const p = step(s.p, s.tp);
      if (p !== s.p) { s.p = p; paint(s); }
      if (s.peek) {
        const c = step(s.c, s.tc);
        if (c !== s.c) { s.c = c; s.el.style.setProperty("--c", smooth(c).toFixed(4)); }
      }
    });
    if (moving) raf = requestAnimationFrame(frame);
  }

  // Layout position, not getBoundingClientRect: some scenes move themselves (the folders rise),
  // and measuring the moved box would feed back into their own progress.
  const pageTop = (el) => { let top = 0; for (let n = el; n; n = n.offsetParent) top += n.offsetTop; return top; };

  onScroll((y, vh) => {
    scenes.forEach((s) => {
      const top = pageTop(s.el) - y;
      const bottom = top + s.el.offsetHeight;
      const enter = clamp((vh - top) / (vh * s.enter));
      const exit = s.exit > 0 ? clamp(bottom / (vh * s.exit)) : 1;
      s.tp = Math.min(enter, exit);
      if (s.peek) s.tc = clamp(1 - Math.abs((top + bottom) / 2 - vh * 0.5) / (vh * 0.4));
    });
    if (!raf) raf = requestAnimationFrame(frame);
  });
}
