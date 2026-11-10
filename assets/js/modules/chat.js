import { renderMarkdown } from "./markdown.js";

const STORAGE_KEY = "anant-portfolio-chat-v1";
const MAX_HISTORY = 12;

export function initPortfolioChat() {
  const launcher = document.getElementById("chatLauncher");
  const panel = document.getElementById("chatPanel");
  const closeButton = document.getElementById("chatClose");
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  const sendButton = document.getElementById("chatSend");
  const messagesEl = document.getElementById("chatMessages");
  const suggestions = document.getElementById("chatSuggestions");
  const statusEl = document.getElementById("chatStatus");

  if (!launcher || !panel || !form || !input || !sendButton || !messagesEl) return;

  const apiBase = String(window.PORTFOLIO_API_URL || "").trim().replace(/\/+$/, "");
  let history = loadHistory();
  let busy = false;

  history.forEach((message) => addMessage(message.role, message.content, false));
  if (history.length && suggestions) suggestions.hidden = true;

  if (!apiBase && statusEl) {
    statusEl.textContent = "Chat API setup is not complete yet.";
  }

  function loadHistory() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(saved)) return [];
      return saved.filter((item) =>
        item &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string"
      ).slice(-MAX_HISTORY);
    } catch {
      return [];
    }
  }

  function persistHistory() {
    history = history.slice(-MAX_HISTORY);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // Chat continues even if storage is disabled or full.
    }
  }

  function addMessage(role, content, persist) {
    const wrapper = document.createElement("div");
    wrapper.className = "chat-message " + (role === "user" ? "user-message" : "assistant-message");
    const label = document.createElement("span");
    label.className = "message-label";
    label.textContent = role === "user" ? "YOU" : "PORTFOLIO GUIDE";
    const messageContent = document.createElement("div");
    messageContent.className = "message-content";
    if (role === "assistant") {
      renderMarkdown(messageContent, content);
    } else {
      const messageText = document.createElement("p");
      messageText.textContent = content;
      messageContent.append(messageText);
    }
    wrapper.append(label, messageContent);
    messagesEl.append(wrapper);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    if (persist) {
      history.push({ role, content });
      persistHistory();
    }
    return wrapper;
  }

  function showTyping() {
    const typing = document.createElement("div");
    typing.className = "chat-typing";
    typing.id = "chatTyping";
    typing.setAttribute("aria-label", "Assistant is responding");
    for (let index = 0; index < 3; index += 1) typing.append(document.createElement("span"));
    messagesEl.append(typing);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    document.getElementById("chatTyping")?.remove();
  }

  function setBusy(value) {
    busy = value;
    sendButton.disabled = value;
    input.disabled = value;
    sendButton.textContent = value ? "…" : "↑";
  }

  function openChat() {
    panel.hidden = false;
    launcher.setAttribute("aria-expanded", "true");
    window.setTimeout(() => input.focus(), 50);
  }

  function closeChat() {
    panel.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
  }

  launcher.addEventListener("click", () => {
    if (panel.hidden) openChat();
    else closeChat();
  });
  closeButton?.addEventListener("click", closeChat);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) closeChat();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await sendMessage(input.value);
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 100) + "px";
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  suggestions?.querySelectorAll("[data-chat-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      openChat();
      sendMessage(button.getAttribute("data-chat-prompt") || "");
    });
  });

  async function sendMessage(value) {
    const prompt = String(value || "").trim();
    if (!prompt || busy) return;

    addMessage("user", prompt, true);
    input.value = "";
    input.style.height = "auto";
    if (suggestions) suggestions.hidden = true;

    if (!apiBase) {
      addMessage("assistant", "The portfolio is live, but the Bedrock API has not been connected yet. Add the API base URL to portfolio_api_url in _config.yml after the backend is deployed.", false);
      return;
    }

    setBusy(true);
    showTyping();
    try {
      const response = await fetch(apiBase + "/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-10) })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "The assistant could not complete that request. Please try again.");
      }
      if (typeof result.reply !== "string" || !result.reply.trim()) {
        throw new Error("The assistant returned an empty response.");
      }
      hideTyping();
      addMessage("assistant", result.reply.trim(), true);
    } catch (error) {
      hideTyping();
      addMessage("assistant", error.message || "The chat service is temporarily unavailable. Please try again.", false);
    } finally {
      setBusy(false);
      input.focus();
    }
  }
}
