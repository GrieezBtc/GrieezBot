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
    AVATAR_URL: 'https://res.cloudinary.com/dqqyvozdw/image/upload/v1794829406/lxzzqilpwcoxhypl940a.jpg',
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
    document.querySelectorAll('.avatar img').forEach(attachAvatarFallback);

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
