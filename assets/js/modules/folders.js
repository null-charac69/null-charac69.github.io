import { reduced } from "./scroll.js";

// Project folders open their write-up in a native <dialog>. Closing plays a short
// exit animation first (skipped for reduced motion).
export function initFolders() {
  const dialogs = new Map();
  document.querySelectorAll("dialog.case").forEach((dialog) => dialogs.set(dialog.id, dialog));
  let trigger = null;

  document.querySelectorAll("[data-case-open]").forEach((button) => {
    button.addEventListener("click", () => {
      const dialog = dialogs.get(button.dataset.caseOpen);
      if (!dialog || typeof dialog.showModal !== "function") return;
      trigger = button;
      dialog.classList.remove("closing");
      document.documentElement.style.overflow = "hidden";
      dialog.showModal();
    });
  });

  function animateClose(dialog) {
    if (!dialog.open || dialog.classList.contains("closing")) return;
    if (reduced) {
      dialog.close();
      return;
    }
    dialog.classList.add("closing");
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      dialog.classList.remove("closing");
      dialog.close();
    };
    dialog.addEventListener("animationend", (event) => { if (event.target === dialog) finish(); }, { once: true });
    window.setTimeout(finish, 400); // in case animationend never fires
  }

  initCursor();

  dialogs.forEach((dialog) => {
    dialog.querySelector("[data-case-close]")?.addEventListener("click", () => animateClose(dialog));
    dialog.addEventListener("click", (event) => { if (event.target === dialog) animateClose(dialog); });
    // Escape fires "cancel"; animate instead of the instant default close.
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      animateClose(dialog);
    });
    dialog.addEventListener("close", () => {
      dialog.classList.remove("closing");
      document.documentElement.style.overflow = "";
      if (trigger) trigger.focus({ preventScroll: true });
    });
  });
}

// A round "Open" label that follows a fine pointer over the folders. Mouse and pen only;
// skipped for touch and reduced motion.
function initCursor() {
  if (reduced || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const folders = document.querySelectorAll(".folder");
  if (!folders.length) return;
  const cursor = document.createElement("div");
  cursor.className = "folder-cursor";
  cursor.setAttribute("aria-hidden", "true");
  cursor.textContent = "Open";
  document.body.append(cursor);
  let frame = 0, x = 0, y = 0;
  const place = () => {
    frame = 0;
    cursor.style.setProperty("--cx", x + "px");
    cursor.style.setProperty("--cy", y + "px");
  };
  folders.forEach((folder) => {
    folder.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      x = event.clientX; y = event.clientY;
      if (!frame) frame = requestAnimationFrame(place);
      cursor.classList.add("on");
    });
    folder.addEventListener("pointerleave", () => cursor.classList.remove("on"));
    folder.addEventListener("click", () => cursor.classList.remove("on"));
  });
  window.addEventListener("scroll", () => cursor.classList.remove("on"), { passive: true });
}
