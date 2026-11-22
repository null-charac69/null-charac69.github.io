import { reduced } from "./scroll.js";

const EMAIL = "anant.thakur2000@gmail.com";
const GLYPHS = ["{", "}", "<", ">", "/", "*", "[", "]", "0", "1", "=>", "()"];

// "Create email draft": builds a mailto: link, so no form backend is needed. Empty or
// malformed fields get an inline hint under the field instead of a silent no-op.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function initForm() {
  const form = document.getElementById("contactForm");
  const note = document.getElementById("cfNote");
  if (!form) return;

  const fieldOf = (input) => input.closest(".cf-field");
  function hint(input, text) {
    const field = fieldOf(input);
    if (!field) return;
    let err = field.querySelector(".cf-err");
    if (!err) {
      err = document.createElement("span");
      err.className = "cf-err";
      err.id = input.id + "Err";
      field.append(err);
    }
    err.textContent = text;
    field.classList.toggle("invalid", Boolean(text));
    if (text) {
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", err.id);
      if (!reduced) {
        field.classList.remove("shake");
        void field.offsetWidth; // restart the animation
        field.classList.add("shake");
      }
    } else {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
    }
  }

  ["name", "email", "message"].forEach((key) => {
    form.elements[key].addEventListener("input", () => hint(form.elements[key], ""));
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = form.elements.name.value.trim();
    const from = form.elements.email.value.trim();
    const message = form.elements.message.value.trim();
    note?.classList.remove("ok");
    if (note) note.textContent = "";

    let first = null;
    if (from && !EMAIL_RE.test(from)) {
      hint(form.elements.email, "That email address doesn't look complete.");
      first = first || form.elements.email;
    }
    if (!message) {
      hint(form.elements.message, "Add a few words so the draft isn't empty.");
      first = first || form.elements.message;
    }
    if (first) {
      first.focus();
      return;
    }

    const subject = name ? "Hello Anant, from " + name : "Hello Anant";
    const body = message + (name || from ? "\n\n" + [name, from].filter(Boolean).join("\n") : "");
    window.location.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    if (note) {
      note.textContent = "Draft ready in your email app. Nothing opened? Write to " + EMAIL + ".";
      note.classList.add("ok");
    }
    say("Opening your email app with the draft…");
  });
}

// One shared toast for short confirmations.
let toast = null;
let toastTimer = 0;
function say(text) {
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    document.body.append(toast);
  }
  toast.textContent = text;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

// Social placeholders: a burst of code glyphs and a short note.
function initPlaceholders() {
  const messages = {
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
