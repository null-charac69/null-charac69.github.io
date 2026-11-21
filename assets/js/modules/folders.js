// Project folders open their write-up in a native <dialog>.
export function initFolders() {
  const dialogs = new Map();
  document.querySelectorAll("dialog.case").forEach((dialog) => dialogs.set(dialog.id, dialog));
  let trigger = null;

  document.querySelectorAll("[data-case-open]").forEach((button) => {
    button.addEventListener("click", () => {
      const dialog = dialogs.get(button.dataset.caseOpen);
      if (!dialog || typeof dialog.showModal !== "function") return;
      trigger = button;
      document.documentElement.style.overflow = "hidden";
      dialog.showModal();
    });
  });

  dialogs.forEach((dialog) => {
    dialog.querySelector("[data-case-close]")?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener("close", () => {
      document.documentElement.style.overflow = "";
      if (trigger) trigger.focus({ preventScroll: true });
    });
  });
}
