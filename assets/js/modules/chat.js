(() => {
  "use strict";

  const launcher = document.getElementById("chatLauncher");
  const panel = document.getElementById("chatPanel");
  const closeButton = document.getElementById("chatClose");
  const input = document.getElementById("chatInput");
  const form = document.getElementById("chatForm");
  const sendButton = document.getElementById("chatSend");
  const messagesEl = document.getElementById("chatMessages");
  const suggestions = document.getElementById("chatSuggestions");
  const statusEl = document.getElementById("chatStatus");
  const backdrop = document.getElementById("chatBackdrop");

  if (!launcher || !panel || !closeButton || !input || !form || !sendButton || !messagesEl) {
    if (statusEl) statusEl.textContent = "The chat interface could not initialise because part of the page is missing.";
    return;
  }

  const STORAGE_KEY = "anant-portfolio-chat-v1";
  const MAX_HISTORY = 12;
  const API_BASE = String(window.PORTFOLIO_API_URL || "").trim().replace(/\/+$/, "");
  let history = loadHistory();
  let busy = false;

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
      // Chat remains usable when browser storage is disabled or full.
    }
  }

  function appendInline(parent, source) {
    const value = String(source ?? "");
    const pattern = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)|\x60([^\x60\n]+)\x60|\*\*([\s\S]+?)\*\*|__([\s\S]+?)__|~~([\s\S]+?)~~|\*([^*\n]+)\*)/g;
    let cursor = 0;
    let match;

    while ((match = pattern.exec(value)) !== null) {
      if (match.index > cursor) parent.append(document.createTextNode(value.slice(cursor, match.index)));

      // Group 1 is the whole alternation; 2/3 are the link label and URL.
      if (match[2] !== undefined && match[3] !== undefined) {
        const link = document.createElement("a");
        link.href = match[3];
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        appendInline(link, match[2]);
        parent.append(link);
      } else if (match[4]) {
        const code = document.createElement("code");
        code.textContent = match[4];
        parent.append(code);
      } else if (match[5] || match[6]) {
        const strong = document.createElement("strong");
        appendInline(strong, match[5] || match[6]);
        parent.append(strong);
      } else if (match[7]) {
        const deleted = document.createElement("del");
        appendInline(deleted, match[7]);
        parent.append(deleted);
      } else {
        const emphasis = document.createElement("em");
        appendInline(emphasis, match[8]);
        parent.append(emphasis);
      }
      cursor = pattern.lastIndex;
    }

    if (cursor < value.length) parent.append(document.createTextNode(value.slice(cursor)));
  }

  function renderAssistantText(target, source) {
    const lines = String(source ?? "").replace(/\r\n?/g, "\n").split("\n");
    const fragment = document.createDocumentFragment();
    let index = 0;

    function readListMarker(line) {
      const match = line.match(/^(\s{0,3})([-+*]|\d+[.)])(?:[ \t]+(.*))?$/);
      if (!match) return null;
      return {
        indent: match[1].length,
        marker: match[2],
        ordered: /^\d/.test(match[2]),
        start: /^\d/.test(match[2]) ? Number.parseInt(match[2], 10) : 1,
        text: (match[3] || "").trim()
      };
    }

    function isHorizontalRule(line) {
      return /^\s{0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/.test(line);
    }

    function isTableStart(at) {
      return at + 1 < lines.length &&
        lines[at].includes("|") &&
        /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[at + 1]);
    }

    function isBlockStart(line, at) {
      return /^\s{0,3}(?:\x60{3,}|~{3,}|#{1,5}\s|>)/.test(line) ||
        isHorizontalRule(line) ||
        Boolean(readListMarker(line)) ||
        isTableStart(at);
    }

    function splitTableRow(line) {
      let value = line.trim();
      if (value.startsWith("|")) value = value.slice(1);
      if (value.endsWith("|")) value = value.slice(0, -1);
      const cells = [];
      let cell = "";
      let escaped = false;
      for (const character of value) {
        if (character === "|" && !escaped) {
          cells.push(cell.trim());
          cell = "";
        } else if (character === "\\" && !escaped) {
          escaped = true;
        } else {
          cell += character;
          escaped = false;
        }
      }
      cells.push(cell.trim());
      return cells;
    }

    function renderTable() {
      const headers = splitTableRow(lines[index]);
      const alignments = splitTableRow(lines[index + 1]).map((cell) => {
        const left = cell.startsWith(":");
        const right = cell.endsWith(":");
        if (left && right) return "center";
        if (right) return "right";
        return "left";
      });

      const wrap = document.createElement("div");
      wrap.className = "chat-table-wrap";
      const table = document.createElement("table");
      table.className = "chat-markdown-table";
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");

      headers.forEach((value, column) => {
        const cell = document.createElement("th");
        cell.style.textAlign = alignments[column] || "left";
        appendInline(cell, value);
        headerRow.append(cell);
      });
      thead.append(headerRow);
      table.append(thead);

      const tbody = document.createElement("tbody");
      index += 2;
      while (index < lines.length && lines[index].trim() && lines[index].includes("|")) {
        const values = splitTableRow(lines[index]);
        const row = document.createElement("tr");
        headers.forEach((_, column) => {
          const cell = document.createElement("td");
          cell.style.textAlign = alignments[column] || "left";
          appendInline(cell, values[column] || "");
          row.append(cell);
        });
        tbody.append(row);
        index += 1;
      }
      table.append(tbody);
      wrap.append(table);
      fragment.append(wrap);
    }

    while (index < lines.length) {
      const line = lines[index];

      if (!line.trim()) {
        index += 1;
        continue;
      }

      const fence = line.match(/^\s{0,3}(\x60{3,}|~{3,})([\w+-]*)\s*$/);
      if (fence) {
        const fenceChar = fence[1][0];
        const codeLines = [];
        index += 1;
        while (index < lines.length && !new RegExp("^\\s{0,3}" + (fenceChar === "\x60" ? "\\x60" : "~") + "{" + fence[1].length + ",}\\s*$").test(lines[index])) {
          codeLines.push(lines[index]);
          index += 1;
        }
        if (index < lines.length) index += 1;
        const pre = document.createElement("pre");
        const code = document.createElement("code");
        if (fence[2]) code.className = "language-" + fence[2];
        code.textContent = codeLines.join("\n");
        pre.append(code);
        fragment.append(pre);
        continue;
      }

      const heading = line.match(/^\s{0,3}(#{1,5})\s+(.+?)\s*#*\s*$/);
      if (heading) {
        const element = document.createElement("h" + Math.min(heading[1].length + 1, 6));
        appendInline(element, heading[2]);
        fragment.append(element);
        index += 1;
        continue;
      }

      if (isHorizontalRule(line)) {
        fragment.append(document.createElement("hr"));
        index += 1;
        continue;
      }

      if (isTableStart(index)) {
        renderTable();
        continue;
      }

      if (/^\s{0,3}>/.test(line)) {
        const quote = document.createElement("blockquote");
        while (index < lines.length && /^\s{0,3}>/.test(lines[index])) {
          const paragraph = document.createElement("p");
          appendInline(paragraph, lines[index].replace(/^\s{0,3}>\s?/, ""));
          quote.append(paragraph);
          index += 1;
        }
        fragment.append(quote);
        continue;
      }

      const firstMarker = readListMarker(line);
      if (firstMarker) {
        const list = document.createElement(firstMarker.ordered ? "ol" : "ul");
        if (firstMarker.ordered && firstMarker.start > 1) list.setAttribute("start", String(firstMarker.start));

        while (index < lines.length) {
          const marker = readListMarker(lines[index]);
          if (!marker || marker.ordered !== firstMarker.ordered) break;

          let itemText = marker.text;
          index += 1;

          if (!itemText) {
            // Accept the model's occasional split form: a bare "1." followed by its text.
            let lookAhead = index;
            while (lookAhead < lines.length && !lines[lookAhead].trim()) lookAhead += 1;
            if (lookAhead < lines.length && !readListMarker(lines[lookAhead]) && !isBlockStart(lines[lookAhead], lookAhead)) {
              index = lookAhead;
              const continuation = [];
              while (index < lines.length && lines[index].trim() &&
                !readListMarker(lines[index]) && !isBlockStart(lines[index], index)) {
                continuation.push(lines[index].trim());
                index += 1;
              }
              itemText = continuation.join(" ");
            } else {
              index = lookAhead;
            }
          } else {
            const continuation = [];
            while (index < lines.length && lines[index].trim() &&
              !readListMarker(lines[index]) && !isBlockStart(lines[index], index)) {
              continuation.push(lines[index].trim());
              index += 1;
            }
            if (continuation.length) itemText += " " + continuation.join(" ");
          }

          const item = document.createElement("li");
          if (itemText) appendInline(item, itemText);
          list.append(item);

          // Blank lines between list items are allowed; blank lines before a paragraph are not swallowed.
          const afterItem = index;
          while (index < lines.length && !lines[index].trim()) index += 1;
          const nextMarker = index < lines.length ? readListMarker(lines[index]) : null;
          if (!nextMarker || nextMarker.ordered !== firstMarker.ordered) {
            index = afterItem;
            break;
          }
        }

        fragment.append(list);
        continue;
      }

      const paragraphLines = [line.trim()];
      index += 1;
      while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index], index)) {
        paragraphLines.push(lines[index].trim());
        index += 1;
      }
      const paragraph = document.createElement("p");
      appendInline(paragraph, paragraphLines.join(" "));
      fragment.append(paragraph);
    }

    target.replaceChildren(fragment);
  }

  function addMessage(role, content, persist) {
    const wrapper = document.createElement("div");
    wrapper.className = "chat-message " + (role === "user" ? "user-message" : "assistant-message");

    const label = document.createElement("span");
    label.className = "message-label";
    label.textContent = role === "user" ? "You" : "Anant's Assistant";

    const messageContent = document.createElement("div");
    messageContent.className = "message-content";
    if (role === "assistant") {
      renderAssistantText(messageContent, content);
    } else {
      const paragraph = document.createElement("p");
      paragraph.textContent = content;
      messageContent.append(paragraph);
    }

    wrapper.append(label, messageContent);
    messagesEl.querySelector(".chat-empty")?.remove();
    messagesEl.append(wrapper);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    if (persist) {
      history.push({ role, content });
      persistHistory();
    }
    return wrapper;
  }

  function findTypingIndicator() {
    return document.getElementById("chatTyping");
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
    findTypingIndicator()?.remove();
  }

  function setBusy(value) {
    busy = value;
    sendButton.disabled = value;
    if (clearButton) clearButton.disabled = value;
    input.disabled = value;
    if (suggestions) {
      suggestions.querySelectorAll("[data-chat-prompt]").forEach((button) => {
        button.disabled = value;
      });
    }
    sendButton.textContent = value ? "…" : "↑";
  }

  function openChat() {
    panel.hidden = false;
    if (backdrop) backdrop.hidden = false;
    launcher.setAttribute("aria-expanded", "true");
    window.setTimeout(() => input.focus(), 50);
  }

  function closeChat() {
    panel.hidden = true;
    if (backdrop) backdrop.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
  }

  launcher.addEventListener("click", () => {
    if (panel.hidden) openChat();
    else closeChat();
  });
  closeButton.addEventListener("click", closeChat);
  backdrop?.addEventListener("click", closeChat);

  const GREETING = messagesEl.firstElementChild ? messagesEl.firstElementChild.cloneNode(true) : null;
  const clearButton = document.getElementById("chatClear");
  clearButton?.addEventListener("click", () => {
    if (busy) return;
    history = [];
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clear if storage is unavailable.
    }
    messagesEl.replaceChildren(...(GREETING ? [GREETING.cloneNode(true)] : []));
    if (suggestions) suggestions.hidden = false;
    input.focus();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) closeChat();
  });
  document.querySelectorAll("[data-chat-open]").forEach((button) => {
    button.addEventListener("click", openChat);
  });

  // The question box in the hero: open the panel and send straight away.
  // An empty box sends its placeholder, which is a real example question.
  document.querySelectorAll("[data-chat-ask]").forEach((askForm) => {
    askForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const field = askForm.querySelector("input");
      const question = field ? field.value.trim() || field.placeholder : "";
      if (field) field.value = "";
      openChat();
      sendMessage(question, true);
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await sendMessage(input.value, true);
  });

  const syncSend = () => form.classList.toggle("has-text", input.value.trim().length > 0);
  input.addEventListener("input", () => {
    syncSend();
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 112) + "px";
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (typeof form.requestSubmit === "function") form.requestSubmit();
      else form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    }
  });

  suggestions?.querySelectorAll("[data-chat-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      sendMessage(button.getAttribute("data-chat-prompt") || "", false);
    });
  });

  function buildApiHistory() {
    const messages = history.slice(-10).map((message) => {
      let content = String(message.content || "");
      if (message.role === "assistant" && content.length > 1700) {
        const note = "\n[Earlier assistant reply shortened for conversation context.]";
        content = content.slice(0, 1700 - note.length) + note;
      }
      return { role: message.role, content };
    });

    const encoder = typeof TextEncoder === "function" ? new TextEncoder() : null;
    const requestBody = () => JSON.stringify({ messages });
    const byteLength = (value) => encoder ? encoder.encode(value).length : value.length * 4;

    let body = requestBody();
    while (messages.length > 1 && byteLength(body) > 12000) {
      messages.shift();
      body = requestBody();
    }
    return messages;
  }

  // Used when the live assistant can't be reached (or has no API configured): answers
  // only from facts already published on this page.
  const FALLBACKS = [
    [/agentos|multi.?agent|langgraph|critic|planner/i, "AgentOS takes an open-ended research question and returns a structured Markdown report with citations. It's a LangGraph state graph with five stages: a planner, web search, retrieval, a code executor and a critic. The critic can send the draft back for another pass, with a cap so it can't loop forever. FastAPI streams progress over server-sent events, Qdrant keeps memory of earlier runs and Redis handles caching."],
    [/rag|hybrid|bm25|dense|retriev|rerank|ragas/i, "The hybrid RAG pipeline (the hrag-app repo) runs dense BGE embeddings in Qdrant alongside BM25 and merges the two rankings with Reciprocal Rank Fusion. A BGE cross-encoder reranks the shortlist, each answer goes through a citation check, and RAGAS scores the pipeline."],
    [/the ?cut|fitness|nutrition|tracker|coach|supabase|deepseek/i, "The Cut is a personal nutrition, training and transformation tracker (live at the-cut-tracker.vercel.app). An AI planner builds a nutrition plan and training week from your profile, always as a draft you apply. Database rules on Supabase Realtime turn your logs into live insights, and a tool-using coach reviews plan edits but can only propose drafts, never change your plan directly. The LLM runs behind a provider-agnostic adapter, currently DeepSeek V3.2 on Amazon Bedrock."],
    [/health|mri|x-?ray|patient|clinical/i, "Healthcare Analytics is an applied ML prototype: image classification for MRI and chest X-rays, plus prediction models for patient risk, length of stay and readmission. It has a React front end, FastAPI and PyTorch behind it, and MLflow and DVC for tracking experiments and data. None of it has been clinically validated."],
    [/tata|elxsi|work|job|experience|career|intern|role/i, "Anant has been a Generative AI Engineer at Tata Elxsi in Pune since July 2023, after an AI/ML internship there from January to July 2023. He has worked on a LangGraph multi-agent document-intelligence system, a hybrid RAG pipeline with a RAGAS evaluation harness, and LLM serving on ONNX Runtime."],
    [/skill|stack|tool|tech|language|python|cloud|aws|azure/i, "The main areas are agentic AI (LangGraph, LangChain, multi-agent orchestration), retrieval (Qdrant, FAISS, Elasticsearch, BM25 plus dense, reranking), evaluation (RAGAS, LangSmith, DeepEval), fine-tuning (LoRA/QLoRA, SFT, DPO, ONNX Runtime) and a production stack of Python, FastAPI, Docker, Kubernetes, Redis, AWS, Azure and GCP. The Tech Stack section has the full list."],
    [/educat|degree|college|university|nit|study|mechanical|graduat/i, "Anant has a B.Tech in Mechanical Engineering from NIT Srinagar (August 2019 to August 2023) and moved into AI after graduating."],
    [/contact|email|hire|reach|available|opportunit|linkedin|github/i, "Anant is open to new opportunities. The quickest way to reach him is email at anant.thakur2000@gmail.com; he's also on LinkedIn and GitHub (null-charac69)."],
  ];
  function fallbackAnswer(prompt) {
    const hit = FALLBACKS.find(([pattern]) => pattern.test(prompt));
    const answer = hit
      ? hit[1]
      : "I can only answer from what's published on this page right now. Try asking about AgentOS, the hybrid RAG pipeline, The Cut, Healthcare Analytics, his work at Tata Elxsi, his skills, his education, or how to get in touch.";
    return answer + "\n\n(Answered from the page itself, because the live assistant is unavailable.)";
  }

  async function sendMessage(value, restoreInputFocus) {
    const prompt = String(value || "").trim();
    if (!prompt || busy) return;

    addMessage("user", prompt, true);
    input.value = "";
    syncSend();
    input.style.height = "auto";
    if (suggestions) suggestions.hidden = true;

    if (!API_BASE) {
      addMessage("assistant", fallbackAnswer(prompt), false);
      return;
    }

    setBusy(true);
    showTyping();
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeoutId = controller ? window.setTimeout(() => controller.abort(), 55000) : null;

    try {
      const response = await fetch(API_BASE + "/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: buildApiHistory() }),
        signal: controller ? controller.signal : undefined
      });
      const result = await response.json().catch(() => ({}));
      if (response.status >= 500) {
        hideTyping();
        addMessage("assistant", fallbackAnswer(prompt), false);
        return;
      }
      if (!response.ok) {
        throw new Error(result.error || "The assistant could not complete that request. Please try again.");
      }
      if (typeof result.reply !== "string" || !result.reply.trim()) {
        throw new Error("The assistant returned an empty response. Please try again.");
      }
      hideTyping();
      addMessage("assistant", result.reply.trim(), true);
    } catch (error) {
      hideTyping();
      if (error?.name === "AbortError") {
        addMessage("assistant", "That request timed out. Please try again.", false);
      } else if (error?.name === "TypeError") {
        addMessage("assistant", fallbackAnswer(prompt), false);
      } else {
        addMessage("assistant", error?.message || "The chat service is temporarily unavailable. Please try again.", false);
      }
    } finally {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      setBusy(false);
      if (restoreInputFocus && !panel.hidden) input.focus();
    }
  }

  history.forEach((message) => addMessage(message.role, message.content, false));
  if (history.length && suggestions) suggestions.hidden = true;
  if (statusEl && !API_BASE) statusEl.textContent = "Answers come from the page (live assistant not configured)";
})();