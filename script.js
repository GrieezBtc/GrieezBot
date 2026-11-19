/* ============================================================
   GrieezBot — frontend application logic
   Built by GrieeForge. Vanilla ES6+, no dependencies.
   All AI output is rendered through DOM APIs (textContent),
   never through innerHTML, so raw HTML can never execute.
   ============================================================ */
(() => {
  'use strict';

  /* ---------- Configuration ---------- */
  const CONFIG = {
    API_URL: '/api/chat',
    STORAGE_KEY: 'grieezbot.conversations.v1',
    ACTIVE_KEY: 'grieezbot.activeConversation.v1',
    AVATAR_INITIAL: 'G',
    MAX_HISTORY_MESSAGES: 20,
    MAX_HISTORY_CHARS: 60000,
    MAX_CONVERSATIONS: 100,
    REQUEST_TIMEOUT_MS: 65000,
    TITLE_MAX: 48,
    SCROLL_THRESHOLD: 120,
    FEEDBACK_MS: 1600,
    // Embedded 256px avatar (no external hosting needed).
    AVATAR_URL: 'data:image/jpeg;base64,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',
    MOBILE_BREAKPOINT: 860,
  };

  const MESSAGES = {
    network: 'Unable to connect to GrieezBot. Check your internet connection and try again.',
    unavailable: 'GrieezBot is temporarily unavailable. Please try again shortly.',
    timeout: 'GrieezBot took too long to respond. Please try again.',
    rateLimit: 'GrieezBot is receiving a lot of requests right now. Please wait a moment and try again.',
    invalid: 'GrieezBot sent back an unexpected response. Please try again.',
    interrupted: "This message didn't get a response. Please try again.",
    copyFailed: "Couldn't copy to the clipboard. Please copy it manually.",
    storageFull: 'Browser storage is full, so older conversations were removed.',
  };

  const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isDesktopInput = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* ---------- DOM references ---------- */
  const $ = (id) => document.getElementById(id);
  const els = {
    sidebar: $('sidebar'),
    sidebarClose: $('sidebarClose'),
    overlay: $('overlay'),
    menuBtn: $('menuBtn'),
    newChatSide: $('newChatSide'),
    newChatTop: $('newChatTop'),
    chatList: $('chatList'),
    chatListEmpty: $('chatListEmpty'),
    scroller: $('chatScroll'),
    welcome: $('welcome'),
    messages: $('messages'),
    jumpBtn: $('jumpBtn'),
    form: $('composer'),
    input: $('composerInput'),
    sendBtn: $('sendBtn'),
    toast: $('toast'),
  };

  /* ---------- State ---------- */
  const state = {
    conversations: [],
    activeId: null,
    pending: new Set(), // conversation ids with an in-flight request
    errors: new Map(), // conversation id -> error message
  };

  let toastTimer = null;

  /* ============================================================
     Utilities
     ============================================================ */
  const uid = () => {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  };

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const icon = (classes) => {
    const i = document.createElement('i');
    i.className = classes;
    i.setAttribute('aria-hidden', 'true');
    return i;
  };

  const makeError = (userMessage) => {
    const err = new Error(userMessage);
    err.userMessage = userMessage;
    return err;
  };

  const formatTime = (ts) => {
    try {
      return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const isMobileLayout = () => window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2800);
  }

  /* ============================================================
     Avatars (image with letter fallback)
     ============================================================ */
  function attachAvatarFallback(img) {
    const applyFallback = () => {
      const box = img.parentElement;
      if (!box || box.dataset.fallback) return;
      box.dataset.fallback = '1';
      box.classList.add('is-fallback');
      img.remove();
      box.textContent = CONFIG.AVATAR_INITIAL;
    };
    img.addEventListener('error', applyFallback, { once: true });
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) applyFallback();
  }

  function createAvatar(sizeClass = 'avatar-sm') {
    const box = el('span', `avatar ${sizeClass}`);
    const img = document.createElement('img');
    img.src = CONFIG.AVATAR_URL;
    img.alt = 'GrieezBot';
    img.width = 32;
    img.height = 32;
    img.decoding = 'async';
    box.appendChild(img);
    attachAvatarFallback(img);
    return box;
  }

  /* ============================================================
     Storage (localStorage, defensive)
     ============================================================ */
  function storageGet(key) {
    try { return window.localStorage.getItem(key); } catch { return null; }
  }
  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); return true; } catch { return false; }
  }

  function sanitizeConversation(raw) {
    if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !raw.id) return null;
    if (!Array.isArray(raw.messages)) return null;
    const now = Date.now();
    const messages = [];
    for (const m of raw.messages) {
      if (!m || typeof m !== 'object') continue;
      if (m.role !== 'user' && m.role !== 'assistant') continue;
      if (typeof m.content !== 'string' || !m.content.trim()) continue;
      messages.push({
        id: typeof m.id === 'string' && m.id ? m.id : uid(),
        role: m.role,
        content: m.content,
        timestamp: Number.isFinite(m.timestamp) ? m.timestamp : now,
        feedback: m.feedback === 'up' || m.feedback === 'down' ? m.feedback : null,
      });
    }
    if (!messages.length) return null;
    const createdAt = Number.isFinite(raw.createdAt) ? raw.createdAt : messages[0].timestamp;
    const updatedAt = Number.isFinite(raw.updatedAt) ? raw.updatedAt : messages[messages.length - 1].timestamp;
    const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim().slice(0, 120) : 'New chat';
    return { id: raw.id, title, createdAt, updatedAt, messages };
  }

  function loadConversations() {
    const raw = storageGet(CONFIG.STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('Unexpected storage shape');
      const seen = new Set();
      const list = [];
      for (const item of parsed) {
        const conv = sanitizeConversation(item);
        if (conv && !seen.has(conv.id)) {
          seen.add(conv.id);
          list.push(conv);
        }
      }
      return list;
    } catch {
      // Keep a copy of the corrupted data for debugging, then start clean.
      storageSet(`${CONFIG.STORAGE_KEY}.corrupt`, raw);
      return [];
    }
  }

  function persist() {
    let removedSome = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      if (storageSet(CONFIG.STORAGE_KEY, JSON.stringify(state.conversations))) {
        if (removedSome) showToast(MESSAGES.storageFull);
        return true;
      }
      // Probably quota exceeded: drop the oldest non-active conversation and retry.
      const candidates = state.conversations
        .filter((c) => c.id !== state.activeId)
        .sort((a, b) => a.updatedAt - b.updatedAt);
      if (!candidates.length) return false;
      state.conversations = state.conversations.filter((c) => c.id !== candidates[0].id);
      state.errors.delete(candidates[0].id);
      removedSome = true;
    }
    return false;
  }

  function saveActive() {
    if (state.activeId) storageSet(CONFIG.ACTIVE_KEY, state.activeId);
    else {
      try { window.localStorage.removeItem(CONFIG.ACTIVE_KEY); } catch { /* ignore */ }
    }
  }

  /* ============================================================
     Conversation helpers
     ============================================================ */
  const getConv = (id) => state.conversations.find((c) => c.id === id) || null;
  const getActive = () => (state.activeId ? getConv(state.activeId) : null);
  const isActivePending = () => Boolean(state.activeId && state.pending.has(state.activeId));

  function makeTitle(text) {
    const flat = text.replace(/\s+/g, ' ').trim();
    return flat.length > CONFIG.TITLE_MAX ? `${flat.slice(0, CONFIG.TITLE_MAX).trimEnd()}…` : flat || 'New chat';
  }

  function createConversation(firstText) {
    const now = Date.now();
    const conv = { id: uid(), title: makeTitle(firstText), createdAt: now, updatedAt: now, messages: [] };
    state.conversations.push(conv);
    if (state.conversations.length > CONFIG.MAX_CONVERSATIONS) {
      const oldest = [...state.conversations].sort((a, b) => a.updatedAt - b.updatedAt)[0];
      state.conversations = state.conversations.filter((c) => c.id !== oldest.id);
      state.errors.delete(oldest.id);
    }
    return conv;
  }

  function buildHistory(conv) {
    let history = conv.messages
      .slice(-CONFIG.MAX_HISTORY_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content }));
    const total = () => history.reduce((sum, m) => sum + m.content.length, 0);
    while (history.length > 1 && total() > CONFIG.MAX_HISTORY_CHARS) history.shift();
    while (history.length > 1 && history[0].role !== 'user') history.shift();
    return history;
  }

  /* ============================================================
     Safe Markdown renderer (DOM based — no innerHTML anywhere)
     ============================================================ */
  const INLINE_RE = /(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)|\*\*([^\s*][\s\S]*?)\*\*|\[([^\]\n]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|\*([^\s*][^*\n]*?)\*|~~([^\n]+?)~~|(https?:\/\/[^\s<>]+)/;
  const ITEM_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
  const FENCE_OPEN_RE = /^\s*(`{3,}|~{3,})\s*([\w+#.-]*)[^\n]*$/;
  const TABLE_SEP_RE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
  const HR_RE = /^\s*([-*_])(\s*\1){2,}\s*$/;

  function sanitizeUrl(raw) {
    try {
      const url = new URL(raw);
      return SAFE_PROTOCOLS.has(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }

  function appendText(parent, text) {
    if (!text) return;
    const parts = text.split('\n');
    parts.forEach((part, index) => {
      if (index > 0) parent.appendChild(document.createElement('br'));
      if (part) parent.appendChild(document.createTextNode(part));
    });
  }

  function appendInline(parent, text, depth = 0) {
    if (depth >= 4) {
      appendText(parent, text);
      return;
    }
    let rest = text;
    while (rest) {
      const m = INLINE_RE.exec(rest);
      if (!m) {
        appendText(parent, rest);
        break;
      }
      if (m.index > 0) appendText(parent, rest.slice(0, m.index));
      rest = rest.slice(m.index + m[0].length);

      if (m[1] !== undefined) {
        parent.appendChild(el('code', 'inline-code', m[2]));
      } else if (m[3] !== undefined) {
        const strong = document.createElement('strong');
        appendInline(strong, m[3], depth + 1);
        parent.appendChild(strong);
      } else if (m[4] !== undefined) {
        const href = sanitizeUrl(m[5]);
        if (href) {
          const a = document.createElement('a');
          a.href = href;
          a.target = '_blank';
          a.rel = 'noopener noreferrer nofollow';
          appendInline(a, m[4], depth + 1);
          parent.appendChild(a);
        } else {
          appendText(parent, m[0]); // unsafe protocol: show as plain text, not a link
        }
      } else if (m[6] !== undefined) {
        const em = document.createElement('em');
        appendInline(em, m[6], depth + 1);
        parent.appendChild(em);
      } else if (m[7] !== undefined) {
        const del = document.createElement('del');
        appendInline(del, m[7], depth + 1);
        parent.appendChild(del);
      } else if (m[8] !== undefined) {
        let url = m[8];
        let trail = '';
        while (/[.,;:!?'")\]]$/.test(url)) {
          trail = url.slice(-1) + trail;
          url = url.slice(0, -1);
        }
        const href = sanitizeUrl(url);
        if (href) {
          const a = document.createElement('a');
          a.href = href;
          a.target = '_blank';
          a.rel = 'noopener noreferrer nofollow';
          a.textContent = url;
          parent.appendChild(a);
        } else {
          appendText(parent, url);
        }
        appendText(parent, trail);
      }
    }
  }

  function createCodeBlock(code, lang) {
    const wrap = el('div', 'code-block');
    const header = el('div', 'code-header');
    header.appendChild(el('span', 'code-lang', lang ? lang.toLowerCase() : 'code'));

    const btn = el('button', 'copy-btn');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Copy code');
    btn.appendChild(icon('fa-regular fa-copy'));
    btn.appendChild(el('span', 'btn-label', 'Copy code'));
    header.appendChild(btn);

    const pre = document.createElement('pre');
    pre.tabIndex = 0; // lets keyboard users scroll long lines
    pre.setAttribute('aria-label', `${lang || 'Code'} snippet`);
    const codeEl = document.createElement('code');
    codeEl.textContent = code;
    pre.appendChild(codeEl);

    wrap.append(header, pre);
    return wrap;
  }

  const indentOf = (ws) => ws.replace(/\t/g, '    ').length;
  const closingFenceRe = (fence) => new RegExp(`^\\s*${fence[0]}{${fence.length},}\\s*$`);

  function collectFence(lines, startIndex, fence) {
    const closing = closingFenceRe(fence);
    const buf = [];
    let i = startIndex;
    while (i < lines.length && !closing.test(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    return { code: buf.join('\n'), next: i + 1 };
  }

  function parseList(lines, start) {
    const first = lines[start].match(ITEM_RE);
    const baseIndent = indentOf(first[1]);
    const ordered = /\d/.test(first[2]);
    const list = document.createElement(ordered ? 'ol' : 'ul');
    if (ordered) {
      const n = parseInt(first[2], 10);
      if (Number.isFinite(n) && n !== 1) list.start = n;
    }
    let i = start;
    let lastLi = null;

    while (i < lines.length) {
      const line = lines[i];

      if (line.trim() === '') {
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === '') j++;
        const next = j < lines.length ? lines[j].match(ITEM_RE) : null;
        if (next && indentOf(next[1]) >= baseIndent && (indentOf(next[1]) > baseIndent || /\d/.test(next[2]) === ordered)) {
          i = j;
          continue;
        }
        break;
      }

      const m = line.match(ITEM_RE);
      if (!m) {
        if (lastLi && /^\s+/.test(line)) {
          const fence = line.match(FENCE_OPEN_RE);
          if (fence) {
            const { code, next } = collectFence(lines, i + 1, fence[1]);
            lastLi.appendChild(createCodeBlock(code, fence[2]));
            i = next;
          } else {
            lastLi.appendChild(document.createElement('br'));
            appendInline(lastLi, line.trim());
            i++;
          }
          continue;
        }
        break;
      }

      const indent = indentOf(m[1]);
      if (indent < baseIndent) break;
      if (indent > baseIndent) {
        if (!lastLi) break;
        const nested = parseList(lines, i);
        lastLi.appendChild(nested.el);
        i = nested.next;
        continue;
      }
      if (/\d/.test(m[2]) !== ordered) break;

      lastLi = document.createElement('li');
      appendInline(lastLi, m[3]);
      list.appendChild(lastLi);
      i++;
    }
    return { el: list, next: i };
  }

  function splitTableRow(row) {
    let r = row.trim();
    if (r.startsWith('|')) r = r.slice(1);
    if (r.endsWith('|')) r = r.slice(0, -1);
    return r.split('|').map((c) => c.trim());
  }

  function parseTable(lines, start) {
    const headers = splitTableRow(lines[start]);
    const aligns = splitTableRow(lines[start + 1]).map((c) => {
      const left = c.startsWith(':');
      const right = c.endsWith(':');
      if (left && right) return 'center';
      if (right) return 'right';
      return left ? 'left' : '';
    });
    const wrap = el('div', 'table-wrap');
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    headers.forEach((h, idx) => {
      const th = document.createElement('th');
      th.scope = 'col';
      if (aligns[idx]) th.style.textAlign = aligns[idx];
      appendInline(th, h);
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    const tbody = document.createElement('tbody');
    let i = start + 2;
    while (i < lines.length && lines[i].trim() !== '' && lines[i].includes('|')) {
      const cells = splitTableRow(lines[i]);
      const tr = document.createElement('tr');
      for (let c = 0; c < headers.length; c++) {
        const td = document.createElement('td');
        if (aligns[c]) td.style.textAlign = aligns[c];
        appendInline(td, cells[c] || '');
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
      i++;
    }
    table.append(thead, tbody);
    wrap.appendChild(table);
    return { el: wrap, next: i };
  }

  function renderMarkdown(text) {
    const frag = document.createDocumentFragment();
    const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
    let paragraph = [];
    let i = 0;

    const flushParagraph = () => {
      if (!paragraph.length) return;
      const p = document.createElement('p');
      appendInline(p, paragraph.join('\n'));
      frag.appendChild(p);
      paragraph = [];
    };

    while (i < lines.length) {
      const line = lines[i];

      const fence = line.match(FENCE_OPEN_RE);
      if (fence) {
        flushParagraph();
        const { code, next } = collectFence(lines, i + 1, fence[1]);
        frag.appendChild(createCodeBlock(code, fence[2]));
        i = next;
        continue;
      }

      if (line.trim() === '') {
        flushParagraph();
        i++;
        continue;
      }

      const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (heading) {
        flushParagraph();
        const level = heading[1].length;
        const h = document.createElement(`h${Math.min(level + 2, 6)}`);
        h.className = `md-h${level}`;
        appendInline(h, heading[2]);
        frag.appendChild(h);
        i++;
        continue;
      }

      if (HR_RE.test(line)) {
        flushParagraph();
        frag.appendChild(document.createElement('hr'));
        i++;
        continue;
      }

      if (/^\s{0,3}>/.test(line)) {
        flushParagraph();
        const quoted = [];
        while (i < lines.length && /^\s{0,3}>/.test(lines[i])) {
          quoted.push(lines[i].replace(/^\s{0,3}>\s?/, ''));
          i++;
        }
        const bq = document.createElement('blockquote');
        bq.appendChild(renderMarkdown(quoted.join('\n')));
        frag.appendChild(bq);
        continue;
      }

      if (ITEM_RE.test(line)) {
        flushParagraph();
        const { el: list, next } = parseList(lines, i);
        frag.appendChild(list);
        i = next;
        continue;
      }

      if (line.includes('|') && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1]) && lines[i + 1].includes('-')) {
        flushParagraph();
        const { el: table, next } = parseTable(lines, i);
        frag.appendChild(table);
        i = next;
        continue;
      }

      paragraph.push(line);
      i++;
    }
    flushParagraph();
    return frag;
  }

  /* ============================================================
     Clipboard
     ============================================================ */
  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch { /* fall through to legacy path */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }

  function flashCopyButton(btn, ok) {
    const label = btn.querySelector('.btn-label');
    const ic = btn.querySelector('i');
    if (!label || !ic) return;
    if (!btn.dataset.label) btn.dataset.label = label.textContent;
    if (!btn.dataset.icon) btn.dataset.icon = ic.className;
    clearTimeout(Number(btn.dataset.timer));
    label.textContent = ok ? 'Copied' : 'Copy failed';
    ic.className = ok ? 'fa-solid fa-check' : 'fa-solid fa-triangle-exclamation';
    btn.classList.toggle('is-copied', ok);
    btn.dataset.timer = String(
      setTimeout(() => {
        label.textContent = btn.dataset.label;
        ic.className = btn.dataset.icon;
        btn.classList.remove('is-copied');
      }, CONFIG.FEEDBACK_MS)
    );
    if (!ok) showToast(MESSAGES.copyFailed);
  }

  /* ============================================================
     Message rendering
     ============================================================ */
  function createFeedbackButton(kind, active) {
    const btn = el('button', `action-btn${active ? ' active' : ''}`);
    btn.type = 'button';
    btn.dataset.action = kind;
    btn.setAttribute('aria-label', kind === 'up' ? 'Good response' : 'Bad response');
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    btn.appendChild(icon(`${active ? 'fa-solid' : 'fa-regular'} fa-thumbs-${kind}`));
    return btn;
  }

  function createUserMessage(msg) {
    const row = el('div', 'msg msg-user');
    row.dataset.id = msg.id;
    row.appendChild(el('div', 'bubble', msg.content));
    return row;
  }

  function createAiMessage(msg) {
    const row = el('div', 'msg msg-ai');
    row.dataset.id = msg.id;
    row.appendChild(createAvatar());

    const body = el('div', 'ai-body');
    const content = el('div', 'ai-content');
    content.appendChild(renderMarkdown(msg.content));

    const actions = el('div', 'ai-actions');
    const copy = el('button', 'action-btn');
    copy.type = 'button';
    copy.dataset.action = 'copy';
    copy.setAttribute('aria-label', 'Copy response');
    copy.appendChild(icon('fa-regular fa-copy'));
    copy.appendChild(el('span', 'btn-label', 'Copy'));

    const time = document.createElement('time');
    time.textContent = formatTime(msg.timestamp);
    time.dateTime = new Date(msg.timestamp).toISOString();
    time.title = new Date(msg.timestamp).toLocaleString();

    actions.append(copy, time, createFeedbackButton('up', msg.feedback === 'up'), createFeedbackButton('down', msg.feedback === 'down'));
    body.append(content, actions);
    row.appendChild(body);
    return row;
  }

  function createTyping() {
    const row = el('div', 'msg msg-ai');
    row.appendChild(createAvatar());
    const body = el('div', 'ai-body');
    const dots = el('div', 'typing');
    dots.setAttribute('role', 'status');
    dots.setAttribute('aria-label', 'GrieezBot is typing');
    dots.append(document.createElement('span'), document.createElement('span'), document.createElement('span'));
    body.appendChild(dots);
    row.appendChild(body);
    return row;
  }

  function createErrorRow(message) {
    const row = el('div', 'msg msg-ai msg-error');
    row.appendChild(createAvatar());
    const body = el('div', 'ai-body');
    const card = el('div', 'error-card');
    card.setAttribute('role', 'alert');
    card.appendChild(icon('fa-solid fa-circle-exclamation'));
    card.appendChild(el('p', '', message));
    const retry = el('button', 'retry-btn');
    retry.type = 'button';
    retry.dataset.action = 'retry';
    retry.appendChild(icon('fa-solid fa-rotate-right'));
    retry.appendChild(document.createTextNode('Retry'));
    card.appendChild(retry);
    body.appendChild(card);
    row.appendChild(body);
    return row;
  }

  const appendMessage = (msg) => {
    els.messages.appendChild(msg.role === 'user' ? createUserMessage(msg) : createAiMessage(msg));
  };

  function removeTail() {
    els.messages.querySelectorAll('.tail').forEach((n) => n.remove());
  }

  /** Shows the typing indicator or an error/retry row for the active conversation. */
  function syncTail() {
    removeTail();
    const conv = getActive();
    if (!conv || !conv.messages.length) return;
    let tail = null;
    if (state.pending.has(conv.id)) {
      tail = createTyping();
    } else {
      const last = conv.messages[conv.messages.length - 1];
      const message = state.errors.get(conv.id) || (last.role === 'user' ? MESSAGES.interrupted : null);
      if (message) tail = createErrorRow(message);
    }
    if (tail) {
      tail.classList.add('tail');
      els.messages.appendChild(tail);
    }
  }

  function setView(hasMessages) {
    els.welcome.hidden = hasMessages;
    els.messages.hidden = !hasMessages;
  }

  function renderChat() {
    els.messages.textContent = '';
    const conv = getActive();
    const has = Boolean(conv && conv.messages.length);
    setView(has);
    if (has) {
      const frag = document.createDocumentFragment();
      conv.messages.forEach((m) => frag.appendChild(m.role === 'user' ? createUserMessage(m) : createAiMessage(m)));
      els.messages.appendChild(frag);
      syncTail();
    }
    updateComposerState();
    scrollToBottom(true);
    updateJumpButton();
  }

  /* ---------- Scrolling ---------- */
  const isNearBottom = () => {
    const s = els.scroller;
    return s.scrollHeight - s.scrollTop - s.clientHeight < CONFIG.SCROLL_THRESHOLD;
  };

  function scrollToBottom(force) {
    if (!force && !isNearBottom()) return;
    const s = els.scroller;
    s.scrollTo({ top: s.scrollHeight, behavior: force || prefersReducedMotion.matches ? 'auto' : 'smooth' });
  }

  function updateJumpButton() {
    els.jumpBtn.hidden = els.messages.hidden || isNearBottom();
  }

  /* ============================================================
     Sidebar
     ============================================================ */
  function renderSidebar() {
    const sorted = [...state.conversations].sort((a, b) => b.updatedAt - a.updatedAt);
    els.chatList.textContent = '';
    els.chatListEmpty.hidden = sorted.length > 0;

    const frag = document.createDocumentFragment();
    for (const conv of sorted) {
      const li = el('li', `chat-item${conv.id === state.activeId ? ' active' : ''}`);
      const open = el('button', 'chat-open', conv.title);
      open.type = 'button';
      open.dataset.id = conv.id;
      open.title = conv.title;
      if (conv.id === state.activeId) open.setAttribute('aria-current', 'page');

      const del = el('button', 'chat-delete');
      del.type = 'button';
      del.dataset.id = conv.id;
      del.setAttribute('aria-label', `Delete conversation: ${conv.title}`);
      del.appendChild(icon('fa-regular fa-trash-can'));

      li.append(open, del);
      frag.appendChild(li);
    }
    els.chatList.appendChild(frag);
  }

  function openSidebar() {
    els.sidebar.classList.add('open');
    els.overlay.classList.add('open');
    els.menuBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('no-scroll');
    els.sidebarClose.focus({ preventScroll: true });
  }

  function closeSidebar(returnFocus = false) {
    if (!els.sidebar.classList.contains('open')) return;
    els.sidebar.classList.remove('open');
    els.overlay.classList.remove('open');
    els.menuBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('no-scroll');
    if (returnFocus) els.menuBtn.focus({ preventScroll: true });
  }

  function selectConversation(id) {
    if (!getConv(id)) return;
    state.activeId = id;
    saveActive();
    renderSidebar();
    renderChat();
    closeSidebar();
  }

  function startNewChat() {
    state.activeId = null;
    saveActive();
    renderSidebar();
    renderChat();
    closeSidebar();
    if (isDesktopInput.matches) els.input.focus({ preventScroll: true });
  }

  function deleteConversation(id) {
    state.conversations = state.conversations.filter((c) => c.id !== id);
    state.errors.delete(id);
    persist();
    if (state.activeId === id) {
      state.activeId = null;
      saveActive();
      renderChat();
    }
    renderSidebar();
  }

  /* ============================================================
     Composer
     ============================================================ */
  function autoGrow() {
    const input = els.input;
    input.style.height = 'auto';
    const next = Math.min(input.scrollHeight, 200);
    input.style.height = `${next}px`;
    input.style.overflowY = input.scrollHeight > 200 ? 'auto' : 'hidden';
  }

  function updateComposerState() {
    const hasText = els.input.value.trim().length > 0;
    const busy = isActivePending();
    els.sendBtn.disabled = !hasText || busy;
    els.form.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  function handleSubmit() {
    const text = els.input.value.trim();
    if (!text || isActivePending()) return;
    els.input.value = '';
    autoGrow();
    updateComposerState();
    sendMessage(text);
  }

  /* ============================================================
     Sending + API
     ============================================================ */
  function sendMessage(text) {
    let conv = getActive();
    const isFirst = !conv || conv.messages.length === 0;
    if (!conv) {
      conv = createConversation(text);
      state.activeId = conv.id;
      saveActive();
    }

    const now = Date.now();
    const msg = { id: uid(), role: 'user', content: text, timestamp: now, feedback: null };
    conv.messages.push(msg);
    conv.updatedAt = now;
    state.errors.delete(conv.id);
    persist();

    if (isFirst) {
      renderChat();
    } else {
      removeTail();
      setView(true);
      appendMessage(msg);
    }
    renderSidebar();
    requestReply(conv.id);
  }

  async function fetchReply(history) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);
    try {
      let res;
      try {
        res = await fetch(CONFIG.API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history }),
          signal: controller.signal,
        });
      } catch (err) {
        throw makeError(err && err.name === 'AbortError' ? MESSAGES.timeout : MESSAGES.network);
      }

      let data = null;
      try {
        data = await res.json();
      } catch (err) {
        if (err && err.name === 'AbortError') throw makeError(MESSAGES.timeout);
        data = null;
      }

      if (!res.ok) {
        const serverMessage = data && typeof data.error === 'string' && data.error.trim() ? data.error.trim() : null;
        throw makeError(serverMessage || (res.status === 429 ? MESSAGES.rateLimit : MESSAGES.unavailable));
      }
      if (!data || typeof data.reply !== 'string' || !data.reply.trim()) throw makeError(MESSAGES.invalid);
      return data.reply;
    } finally {
      clearTimeout(timer);
    }
  }

  async function requestReply(convId) {
    const conv = getConv(convId);
    if (!conv || state.pending.has(convId)) return;
    const last = conv.messages[conv.messages.length - 1];
    if (!last || last.role !== 'user') return;

    state.pending.add(convId);
    state.errors.delete(convId);
    if (convId === state.activeId) {
      const stick = isNearBottom();
      syncTail();
      if (stick) scrollToBottom(true);
    }
    updateComposerState();

    let reply = null;
    let errorText = null;
    try {
      reply = await fetchReply(buildHistory(conv));
    } catch (err) {
      errorText = (err && err.userMessage) || MESSAGES.unavailable;
    }

    state.pending.delete(convId);
    const current = getConv(convId);
    if (!current) {
      updateComposerState();
      return; // conversation was deleted while waiting
    }

    let msg = null;
    if (reply !== null) {
      msg = { id: uid(), role: 'assistant', content: reply, timestamp: Date.now(), feedback: null };
      current.messages.push(msg);
      current.updatedAt = msg.timestamp;
      persist();
    } else {
      state.errors.set(convId, errorText); // failed replies are never saved as assistant messages
    }

    renderSidebar();
    if (convId === state.activeId) {
      const stick = isNearBottom();
      removeTail();
      if (msg) appendMessage(msg);
      syncTail();
      if (stick) scrollToBottom(true);
      updateJumpButton();
    }
    updateComposerState();
  }

  /* ============================================================
     Event wiring
     ============================================================ */
  function updateFeedbackUI(row, feedback) {
    ['up', 'down'].forEach((kind) => {
      const btn = row.querySelector(`[data-action="${kind}"]`);
      if (!btn) return;
      const active = feedback === kind;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      const ic = btn.querySelector('i');
      if (ic) ic.className = `${active ? 'fa-solid' : 'fa-regular'} fa-thumbs-${kind}`;
    });
  }

  async function handleMessageClick(event) {
    const codeCopy = event.target.closest('.copy-btn');
    if (codeCopy && els.messages.contains(codeCopy)) {
      const codeEl = codeCopy.closest('.code-block')?.querySelector('pre code');
      if (codeEl) flashCopyButton(codeCopy, await copyText(codeEl.textContent));
      return;
    }

    const actionBtn = event.target.closest('[data-action]');
    if (!actionBtn || !els.messages.contains(actionBtn)) return;
    const action = actionBtn.dataset.action;
    const conv = getActive();
    if (!conv) return;

    if (action === 'retry') {
      requestReply(conv.id);
      return;
    }

    const row = actionBtn.closest('.msg');
    const msg = row ? conv.messages.find((m) => m.id === row.dataset.id) : null;
    if (!msg) return;

    if (action === 'copy') {
      flashCopyButton(actionBtn, await copyText(msg.content));
    } else if (action === 'up' || action === 'down') {
      msg.feedback = msg.feedback === action ? null : action;
      persist();
      updateFeedbackUI(row, msg.feedback);
    }
  }

  function handleChatListClick(event) {
    const del = event.target.closest('.chat-delete');
    if (del) {
      if (del.classList.contains('confirming')) {
        clearTimeout(Number(del.dataset.timer));
        deleteConversation(del.dataset.id);
      } else {
        del.classList.add('confirming');
        del.textContent = '';
        del.append(icon('fa-solid fa-trash-can'), document.createTextNode('Delete?'));
        del.setAttribute('aria-label', 'Confirm delete conversation');
        del.dataset.timer = String(
          setTimeout(() => {
            if (!del.isConnected) return;
            del.classList.remove('confirming');
            del.textContent = '';
            del.appendChild(icon('fa-regular fa-trash-can'));
            del.setAttribute('aria-label', 'Delete conversation');
          }, 3000)
        );
      }
      return;
    }
    const open = event.target.closest('.chat-open');
    if (open) selectConversation(open.dataset.id);
  }

  function init() {
    // Static avatars get their image from the single embedded source above.
    document.querySelectorAll('.avatar img').forEach((img) => {
      img.src = CONFIG.AVATAR_URL;
      attachAvatarFallback(img);
    });
    const favicon = document.getElementById('favicon');
    if (favicon) favicon.href = CONFIG.AVATAR_URL;

    state.conversations = loadConversations();
    const savedActive = storageGet(CONFIG.ACTIVE_KEY);
    state.activeId = savedActive && getConv(savedActive) ? savedActive : null;

    els.form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSubmit();
    });
    els.input.addEventListener('input', () => {
      autoGrow();
      updateComposerState();
    });
    els.input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.isComposing) return;
      const wantsSend = (!e.shiftKey && isDesktopInput.matches) || e.ctrlKey || e.metaKey;
      if (wantsSend) {
        e.preventDefault();
        handleSubmit();
      }
    });

    els.welcome.addEventListener('click', (e) => {
      const card = e.target.closest('.suggestion');
      if (card && card.dataset.prompt && !isActivePending()) sendMessage(card.dataset.prompt);
    });
    els.messages.addEventListener('click', handleMessageClick);
    els.chatList.addEventListener('click', handleChatListClick);

    els.newChatSide.addEventListener('click', startNewChat);
    els.newChatTop.addEventListener('click', startNewChat);
    els.menuBtn.addEventListener('click', openSidebar);
    els.sidebarClose.addEventListener('click', () => closeSidebar(true));
    els.overlay.addEventListener('click', () => closeSidebar(true));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSidebar(true);
    });
    window.addEventListener('resize', () => {
      if (!isMobileLayout()) closeSidebar();
    });

    els.scroller.addEventListener('scroll', updateJumpButton, { passive: true });
    els.jumpBtn.addEventListener('click', () => scrollToBottom(true));

    renderSidebar();
    renderChat();
    autoGrow();
    updateComposerState();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
