(function () {
  "use strict";

  var launcher = document.getElementById("chatLauncher");
  var panel = document.getElementById("chatPanel");
  var closeButton = document.getElementById("chatClose");
  var form = document.getElementById("chatForm");
  var input = document.getElementById("chatInput");
  var sendButton = document.getElementById("chatSend");
  var messagesEl = document.getElementById("chatMessages");
  var suggestions = document.getElementById("chatSuggestions");
  var statusEl = document.getElementById("chatStatus");
  var storageKey = "anant-portfolio-chat-v1";
  var apiBase = (window.PORTFOLIO_API_URL || "").trim().replace(/\/+$/, "");
  var history = loadHistory();
  var busy = false;

  function loadHistory() {
    try {
      var saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (!Array.isArray(saved)) return [];
      return saved.filter(function (item) {
        return item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string";
      }).slice(-12);
    } catch (error) {
      return [];
    }
  }

  function persistHistory() {
    history = history.slice(-12);
    try { localStorage.setItem(storageKey, JSON.stringify(history)); } catch (error) {}
  }

  function addMessage(role, content, persist) {
    var wrapper = document.createElement("div");
    wrapper.className = "chat-message " + (role === "user" ? "user-message" : "assistant-message");
    var label = document.createElement("span");
    label.className = "message-label";
    label.textContent = role === "user" ? "YOU" : "PORTFOLIO GUIDE";
    var messageText = document.createElement("p");
    messageText.textContent = content;
    wrapper.appendChild(label);
    wrapper.appendChild(messageText);
    messagesEl.appendChild(wrapper);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    if (persist) {
      history.push({ role: role, content: content });
      persistHistory();
    }
    return wrapper;
  }

  function showTyping() {
    var typing = document.createElement("div");
    typing.className = "chat-typing";
    typing.id = "chatTyping";
    typing.setAttribute("aria-label", "Assistant is responding");
    for (var i = 0; i < 3; i++) typing.appendChild(document.createElement("span"));
    messagesEl.appendChild(typing);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    var typing = document.getElementById("chatTyping");
    if (typing) typing.remove();
  }

  function setBusy(value) {
    busy = value;
    sendButton.disabled = value;
    input.disabled = value;
    sendButton.innerHTML = value ? "…" : "<span aria-hidden=\"true\">↑</span>";
  }

  function openChat() {
    panel.hidden = false;
    launcher.setAttribute("aria-expanded", "true");
    window.setTimeout(function () { input.focus(); }, 50);
  }

  function closeChat() {
    panel.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
  }

  launcher.addEventListener("click", function () {
    if (panel.hidden) openChat();
    else closeChat();
  });
  closeButton.addEventListener("click", closeChat);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !panel.hidden) closeChat();
  });

  history.forEach(function (message) { addMessage(message.role, message.content, false); });
  if (!apiBase) statusEl.textContent = "Deployment setup required before the assistant can respond.";

  async function sendMessage(value) {
    var prompt = value.trim();
    if (!prompt || busy) return;
    addMessage("user", prompt, true);
    input.value = "";
    input.style.height = "auto";
    suggestions.hidden = true;

    if (!apiBase) {
      addMessage("assistant", "The chat service is not connected yet. The portfolio is available, but the AWS Bedrock API URL still needs to be added to the PORTFOLIO_API_URL repository variable after the backend is deployed.", false);
      return;
    }

    setBusy(true);
    showTyping();
    try {
      var response = await fetch(apiBase + "/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-10) })
      });
      var result = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(result.error || "The assistant could not complete that request. Please try again.");
      if (typeof result.reply !== "string" || !result.reply.trim()) throw new Error("The assistant returned an empty response.");
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

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    sendMessage(input.value);
  });
  input.addEventListener("input", function () {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 100) + "px";
  });
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  suggestions.querySelectorAll("[data-chat-prompt]").forEach(function (button) {
    button.addEventListener("click", function () {
      openChat();
      sendMessage(button.getAttribute("data-chat-prompt"));
    });
  });
})();
