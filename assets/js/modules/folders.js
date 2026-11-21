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
