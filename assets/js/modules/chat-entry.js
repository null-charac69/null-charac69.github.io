const launcher = document.getElementById("chatLauncher");
const panel = document.getElementById("chatPanel");
const closeButton = document.getElementById("chatClose");
const input = document.getElementById("chatInput");

function openChat() {
  if (!launcher || !panel) return;
  panel.hidden = false;
  launcher.setAttribute("aria-expanded", "true");
  window.setTimeout(() => input?.focus(), 50);
}

function closeChat() {
  if (!launcher || !panel) return;
  panel.hidden = true;
  launcher.setAttribute("aria-expanded", "false");
  launcher.focus();
}

if (launcher && panel) {
  launcher.addEventListener("click", () => {
    if (panel.hidden) openChat();
    else closeChat();
  });
  closeButton?.addEventListener("click", closeChat);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) closeChat();
  });
  document.querySelectorAll("[data-chat-open]").forEach((button) => {
    button.addEventListener("click", openChat);
  });
}

import("./chat.js")
  .then(({ initPortfolioChat }) => initPortfolioChat())
  .catch((error) => {
    console.error("Portfolio chat failed to initialize:", error);
    const status = document.getElementById("chatStatus");
    if (status) status.textContent = "The chat service could not load. Refresh the page to try again.";
  });
