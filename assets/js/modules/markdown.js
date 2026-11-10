const INLINE_TOKEN = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)|\x60([^\x60\n]+)\x60|\*\*([\s\S]+?)\*\*|__([\s\S]+?)__|~~([\s\S]+?)~~|\*([^*\n]+)\*|_([^_\n]+)_/g;

function appendInline(parent, source) {
  const text = String(source ?? "");
  const tokenPattern = new RegExp(INLINE_TOKEN.source, "g");
  let cursor = 0;
  let match;

  while ((match = tokenPattern.exec(text)) !== null) {
    if (match.index > cursor) {
      parent.append(document.createTextNode(text.slice(cursor, match.index)));
    }

    if (match[1]) {
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
      appendInline(emphasis, match[8] || match[9]);
      parent.append(emphasis);
    }

    cursor = tokenPattern.lastIndex;
  }

  if (cursor < text.length) {
    parent.append(document.createTextNode(text.slice(cursor)));
  }
}

function splitTableRow(line) {
  let value = line.trim();
  if (value.startsWith("|")) value = value.slice(1);
  if (value.endsWith("|")) value = value.slice(0, -1);
  return value.split("|").map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

function isListItem(line) {
  return /^\s{0,3}(?:[-+*]|\d+[.)])\s+/.test(line);
}

function isBlockStart(lines, index) {
  const line = lines[index] || "";
  if (!line.trim()) return true;
  if (/^\s*\x60{3,}/.test(line)) return true;
  if (/^\s{0,3}#{1,6}\s+/.test(line)) return true;
  if (/^\s{0,3}>/.test(line)) return true;
  if (isListItem(line)) return true;
  if (/^\s{0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/.test(line)) return true;
  return index + 1 < lines.length &&
    line.includes("|") &&
    /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1]);
}

function renderTable(lines, start, target) {
  const headers = splitTableRow(lines[start]);
  const alignments = splitTableRow(lines[start + 1]).map((cell) => {
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

  headers.forEach((value, index) => {
    const cell = document.createElement("th");
    cell.style.textAlign = alignments[index] || "left";
    appendInline(cell, value);
    headerRow.append(cell);
  });
  thead.append(headerRow);
  table.append(thead);

  const tbody = document.createElement("tbody");
  let cursor = start + 2;
  while (cursor < lines.length && lines[cursor].trim().includes("|")) {
    const values = splitTableRow(lines[cursor]);
    if (!values.length) break;
    const row = document.createElement("tr");
    headers.forEach((_, index) => {
      const cell = document.createElement("td");
      cell.style.textAlign = alignments[index] || "left";
      appendInline(cell, values[index] || "");
      row.append(cell);
    });
    tbody.append(row);
    cursor += 1;
  }

  table.append(tbody);
  wrap.append(table);
  target.append(wrap);
  return cursor;
}

/**
 * Render a safe Markdown subset into a message container.
 * Raw HTML is never interpreted; links are limited to http(s) and mailto.
 */
export function renderMarkdown(target, source) {
  const lines = String(source ?? "").replace(/\r\n?/g, "\n").split("\n");
  const fragment = document.createDocumentFragment();
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^\s*\x60{3,}([\w+-]*)\s*$/);
    if (fence) {
      const codeLines = [];
      index += 1;
      while (index < lines.length && !/^\s*\x60{3,}\s*$/.test(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      code.className = fence[1] ? "language-" + fence[1] : "";
      code.textContent = codeLines.join("\n");
      pre.append(code);
      fragment.append(pre);
      continue;
    }

    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 6);
      const element = document.createElement("h" + level);
      appendInline(element, heading[2]);
      fragment.append(element);
      index += 1;
      continue;
    }

    if (/^\s{0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/.test(line)) {
      fragment.append(document.createElement("hr"));
      index += 1;
      continue;
    }

    if (index + 1 < lines.length && line.includes("|") &&
        /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1])) {
      index = renderTable(lines, index, fragment);
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

    if (isListItem(line)) {
      const ordered = /^\s{0,3}\d+[.)]\s+/.test(line);
      const list = document.createElement(ordered ? "ol" : "ul");
      while (index < lines.length && isListItem(lines[index])) {
        const currentOrdered = /^\s{0,3}\d+[.)]\s+/.test(lines[index]);
        if (currentOrdered !== ordered) break;
        const item = document.createElement("li");
        appendInline(item, lines[index].replace(/^\s{0,3}(?:[-+*]|\d+[.)])\s+/, ""));
        list.append(item);
        index += 1;
      }
      fragment.append(list);
      continue;
    }

    const paragraphLines = [line.trim()];
    index += 1;
    while (index < lines.length && !isBlockStart(lines, index)) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    const paragraph = document.createElement("p");
    appendInline(paragraph, paragraphLines.join(" "));
    fragment.append(paragraph);
  }

  target.replaceChildren(fragment);
}
