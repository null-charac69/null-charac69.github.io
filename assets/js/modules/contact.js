import { reduced } from "./scroll.js";

const EMAIL = "anant.thakur2000@gmail.com";
const GLYPHS = ["{", "}", "<", ">", "/", "*", "[", "]", "0", "1", "=>", "()"];

// "Create email draft": builds a mailto: link, so no form backend is needed.
function initForm() {
  const form = document.getElementById("contactForm");
  const note = document.getElementById("cfNote");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = form.elements.name.value.trim();
    const from = form.elements.email.value.trim();
    const message = form.elements.message.value.trim();
    if (!name && !message) {
      if (note) note.textContent = "Add a few words first and I'll prepare the draft.";
      form.elements.message.focus();
      return;
    }
    const subject = name ? "Hello Anant, from " + name : "Hello Anant";
    const body = message + (name || from ? "\n\n" + [name, from].filter(Boolean).join("\n") : "");
    window.location.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    if (note) note.textContent = "Opening your email app. If nothing opens, write to " + EMAIL + ".";
  });
}

// Social placeholders: a burst of code glyphs and a short note.
function initPlaceholders() {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  document.body.append(toast);
  let timer = 0;
  const say = (text) => {
    toast.textContent = text;
    toast.classList.add("show");
    window.clearTimeout(timer);
    timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
  };
  const messages = {
    x: "Not set up yet. LinkedIn or email is the best way to reach me.",
    resume: "Résumé on request. Email me and I'll send it over.",
  };

  document.querySelectorAll("[data-placeholder]").forEach((button) => {
    button.addEventListener("click", (event) => {
      say(messages[button.dataset.placeholder] || "Coming soon.");
      if (!reduced) burst(event.clientX || window.innerWidth / 2, event.clientY || window.innerHeight / 2);
    });
  });
}

function burst(x, y) {
  const canvas = document.createElement("canvas");
  canvas.className = "burst";
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  document.body.append(canvas);
  const ctx = canvas.getContext("2d");
  const ink = getComputedStyle(document.documentElement).getPropertyValue("--ink-rgb").trim() || "255,255,255";
  const particles = Array.from({ length: 42 }, () => {
    const a = Math.random() * Math.PI * 2;
    const s = 3 + Math.random() * 7;
    return { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3, r: (Math.random() - 0.5) * 0.3, g: GLYPHS[(Math.random() * GLYPHS.length) | 0], size: 13 + Math.random() * 14 };
  });
  const start = performance.now();
  (function tick(now) {
    const t = (now - start) / 1300;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);
    particles.forEach((p) => {
      p.vy += 0.28; p.vx *= 0.985; p.x += p.vx; p.y += p.vy;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r * t * 6);
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.fillStyle = `rgb(${ink})`;
      ctx.font = `500 ${p.size}px 'JetBrains Mono', monospace`;
      ctx.fillText(p.g, 0, 0);
      ctx.restore();
    });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (t < 1) requestAnimationFrame(tick);
    else canvas.remove();
  })(start);
}

export function initContact() {
  initForm();
  initPlaceholders();
}
