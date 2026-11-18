"use strict";

const AI_NAME = "GrieezBot";
const AI_IMAGE =
  "https://res.cloudinary.com/dqqyvozdw/image/upload/v1794829406/lxzzqilpwcoxhypl940a.jpg";

const STORAGE_KEY = "grieezbot_chats_v1";
const MAX_STORED_CHATS = 30;

const elements = {
  sidebar: document.getElementById("sidebar"),
  sidebarOverlay: document.getElementById("sidebarOverlay"),
  menuButton: document.getElementById("menuButton"),
  newChatButton: document.getElementById("newChatButton"),
  chatHistory: document.getElementById("chatHistory"),
  conversation: document.getElementById("conversation"),
  messages: document.getElementById("messages"),
  chatForm: document.getElementById("chatForm"),
  messageInput: document.getElementById("messageInput"),
  sendButton: document.getElementById("sendButton")
};

let chats = loadChats();
let activeChatId = null;
let requestInProgress = false;
let typingElement = null;

initialize();

function initialize() {
  initializeImageFallbacks();
  bindEvents();
  renderHistory();

  const mostRecentChat = chats
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];

  if (mostRecentChat) {
    openChat(mostRecentChat.id);
  } else {
    startNewChat();
  }

  resizeInput();
  updateSendButton();
}

function bindEvents() {
  elements.chatForm.addEventListener("submit", handleSubmit);
  elements.messageInput.addEventListener("input", handleInput);

  elements.messageInput.addEventListener("keydown", (event) => {
    const isDesktop = window.matchMedia("(min-width: 801px)").matches;

    if (
      isDesktop &&
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.isComposing
    ) {
      event.preventDefault();

      if (!elements.sendButton.disabled) {
        elements.chatForm.requestSubmit();
      }
    }
  });

  elements.newChatButton.addEventListener("click", () => {
    startNewChat();
    closeSidebar();
    elements.messageInput.focus();
  });

  elements.menuButton.addEventListener("click", toggleSidebar);
  elements.sidebarOverlay.addEventListener("click", closeSidebar);

  window.addEventListener("resize", () => {
    if (window.innerWidth > 800) {
      closeSidebar();
    }
  });

  document.querySelectorAll(".suggestion-card").forEach((card) => {
    card.addEventListener("click", () => {
      const prompt = card.dataset.prompt || "";
      elements.messageInput.value = prompt;
      resizeInput();
      updateSendButton();
      elements.chatForm.requestSubmit();
    });
  });

  elements.chatHistory.addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-delete-chat]");
    const openButton = event.target.closest("[data-open-chat]");

    if (deleteButton) {
      event.stopPropagation();
      deleteChat(deleteButton.dataset.deleteChat);
      return;
    }

    if (openButton) {
      openChat(openButton.dataset.openChat);
      closeSidebar();
    }
  });

  elements.messages.addEventListener("click", async (event) => {
    const copyReplyButton = event.target.closest("[data-copy-reply]");
    const copyCodeButton = event.target.closest("[data-copy-code]");
    const feedbackButton = event.target.closest("[data-feedback]");

    if (copyReplyButton) {
      const messageId = copyReplyButton.dataset.copyReply;
      const chat = getActiveChat();
      const message = chat?.messages.find((item) => item.id === messageId);

      if (message) {
        const copied = await copyText(message.content);
        setTemporaryLabel(copyReplyButton, copied ? "Copied" : "Copy failed");
      }

      return;
    }

    if (copyCodeButton) {
      const codeBlock = copyCodeButton.closest(".code-block");
      const codeElement = codeBlock?.querySelector("code");

      if (codeElement) {
        const copied = await copyText(codeElement.textContent);
        setTemporaryLabel(
          copyCodeButton,
          copied ? "Copied" : "Copy failed",
          "Copy code"
        );
      }

      return;
    }

    if (feedbackButton) {
      updateFeedback(
        feedbackButton.dataset.messageId,
        feedbackButton.dataset.feedback
      );
    }
  });
}

function handleInput() {
  resizeInput();
  updateSendButton();
}

async function handleSubmit(event) {
  event.preventDefault();

  const content = elements.messageInput.value.trim();

  if (!content || requestInProgress) {
    return;
  }

  let chat = getActiveChat();

  if (!chat) {
    chat = createChat();
    chats.unshift(chat);
    activeChatId = chat.id;
  }

  const userMessage = {
    id: createId(),
    role: "user",
    content,
    createdAt: Date.now()
  };

  chat.messages.push(userMessage);

  if (!chat.title || chat.title === "New chat") {
    chat.title = createChatTitle(content);
  }

  chat.updatedAt = Date.now();

  elements.messageInput.value = "";
  resizeInput();
  setRequestState(true);
  saveChats();
  renderHistory();
  renderMessages();
  showTypingIndicator();
  scrollToBottom();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: chat.messages
          .filter(
            (message) =>
              message.role === "user" || message.role === "assistant"
          )
          .map(({ role, content: messageContent }) => ({
            role,
            content: messageContent
          }))
      })
    });

    const data = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(
        data?.error || "GrieezBot could not complete that request."
      );
    }

    if (!data || typeof data.reply !== "string" || !data.reply.trim()) {
      throw new Error("GrieezBot returned an empty response.");
    }

    removeTypingIndicator();

    chat.messages.push({
      id: createId(),
      role: "assistant",
      content: data.reply.trim(),
      createdAt: Date.now(),
      feedback: null
    });

    chat.updatedAt = Date.now();
    saveChats();
    renderHistory();
    renderMessages();
    scrollToBottom();
  } catch (error) {
    removeTypingIndicator();

    const friendlyMessage = getFriendlyError(error);

    chat.messages.push({
      id: createId(),
      role: "assistant",
      content: friendlyMessage,
      createdAt: Date.now(),
      feedback: null,
      isError: true
    });

    chat.updatedAt = Date.now();
    saveChats();
    renderHistory();
    renderMessages();
    scrollToBottom();
  } finally {
    setRequestState(false);
    elements.messageInput.focus();
  }
}

function createChat() {
  const now = Date.now();

  return {
    id: createId(),
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    messages: []
  };
}

function startNewChat() {
  removeTypingIndicator();

  const currentChat = getActiveChat();

  if (currentChat && currentChat.messages.length === 0) {
    activeChatId = currentChat.id;
  } else {
    const chat = createChat();
    chats.unshift(chat);
    activeChatId = chat.id;
    saveChats();
  }

  setRequestState(false);
  renderHistory();
  renderMessages();
}

function openChat(chatId) {
  const chat = chats.find((item) => item.id === chatId);

  if (!chat) {
    return;
  }

  removeTypingIndicator();
  activeChatId = chatId;
  setRequestState(false);
  renderHistory();
  renderMessages();
  scrollToBottom(false);
}

function deleteChat(chatId) {
  const wasActive = activeChatId === chatId;

  chats = chats.filter((chat) => chat.id !== chatId);
  saveChats();

  if (wasActive) {
    const nextChat = chats
      .slice()
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];

    if (nextChat) {
      activeChatId = nextChat.id;
      renderHistory();
      renderMessages();
    } else {
      activeChatId = null;
      startNewChat();
    }
  } else {
    renderHistory();
  }
}

function getActiveChat() {
  return chats.find((chat) => chat.id === activeChatId) || null;
}

function renderHistory() {
  const sortedChats = chats
    .filter((chat) => chat.messages.length > 0)
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt);

  if (sortedChats.length === 0) {
    elements.chatHistory.innerHTML = `
      <p class="history-empty">
        Your conversations will appear here after you send a message.
      </p>
    `;
    return;
  }

  elements.chatHistory.innerHTML = sortedChats
    .map(
      (chat) => `
        <div class="history-item ${
          chat.id === activeChatId ? "active" : ""
        }">
          <button
            class="history-open"
            type="button"
            data-open-chat="${escapeAttribute(chat.id)}"
            title="${escapeAttribute(chat.title)}"
          >
            <i class="fa-regular fa-message" aria-hidden="true"></i>
            <span class="history-title">${escapeHtml(chat.title)}</span>
          </button>

          <button
            class="history-delete"
            type="button"
            data-delete-chat="${escapeAttribute(chat.id)}"
            aria-label="Delete ${escapeAttribute(chat.title)}"
            title="Delete chat"
          >
            <i class="fa-regular fa-trash-can" aria-hidden="true"></i>
          </button>
        </div>
      `
    )
    .join("");
}

function renderMessages() {
  const chat = getActiveChat();
  const messages = chat?.messages || [];

  elements.conversation.classList.toggle("has-messages", messages.length > 0);

  if (messages.length === 0) {
    elements.messages.innerHTML = "";
    return;
  }

  elements.messages.innerHTML = messages
    .map((message) => {
      if (message.role === "user") {
        return renderUserMessage(message);
      }

      return renderAssistantMessage(message);
    })
    .join("");
}

function renderUserMessage(message) {
  return `
    <article class="message-row user">
      <div class="message-stack">
        <div class="message-bubble">${escapeHtml(message.content)}</div>
      </div>
    </article>
  `;
}

function renderAssistantMessage(message) {
  const feedback = message.feedback || "";
  const formattedContent = message.isError
    ? `<p class="error-message">${escapeHtml(message.content)}</p>`
    : renderMarkdown(message.content);

  return `
    <article class="message-row assistant">
      ${createAvatarMarkup("message-avatar")}

      <div class="message-stack">
        <div class="message-bubble">${formattedContent}</div>

        <div class="action-bar">
          <button
            class="action-button"
            type="button"
            data-copy-reply="${escapeAttribute(message.id)}"
            title="Copy reply"
            aria-label="Copy reply"
          >
            <i class="fa-regular fa-copy" aria-hidden="true"></i>
            <span class="action-label"></span>
          </button>

          <time
            class="message-time"
            datetime="${new Date(message.createdAt).toISOString()}"
          >
            ${formatTime(message.createdAt)}
          </time>

          <button
            class="action-button ${feedback === "up" ? "active" : ""}"
            type="button"
            data-feedback="up"
            data-message-id="${escapeAttribute(message.id)}"
            title="Helpful"
            aria-label="Mark reply as helpful"
            aria-pressed="${feedback === "up"}"
          >
            <i class="fa-regular fa-thumbs-up" aria-hidden="true"></i>
          </button>

          <button
            class="action-button ${feedback === "down" ? "active" : ""}"
            type="button"
            data-feedback="down"
            data-message-id="${escapeAttribute(message.id)}"
            title="Not helpful"
            aria-label="Mark reply as not helpful"
            aria-pressed="${feedback === "down"}"
          >
            <i class="fa-regular fa-thumbs-down" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </article>
  `;
}

function showTypingIndicator() {
  removeTypingIndicator();

  typingElement = document.createElement("article");
  typingElement.className = "message-row assistant";
  typingElement.id = "typingIndicator";

  typingElement.innerHTML = `
    ${createAvatarMarkup("message-avatar")}

    <div class="message-stack">
      <div class="message-bubble typing-bubble" aria-label="${AI_NAME} is typing">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    </div>
  `;

  elements.conversation.classList.add("has-messages");
  elements.messages.appendChild(typingElement);
  initializeImageFallbacks(typingElement);
}

function removeTypingIndicator() {
  if (typingElement) {
    typingElement.remove();
    typingElement = null;
  }

  document.getElementById("typingIndicator")?.remove();
}

function updateFeedback(messageId, newFeedback) {
  const chat = getActiveChat();
  const message = chat?.messages.find((item) => item.id === messageId);

  if (!message || message.role !== "assistant") {
    return;
  }

  message.feedback = message.feedback === newFeedback ? null : newFeedback;
  chat.updatedAt = Date.now();

  saveChats();
  renderMessages();
}

function setRequestState(isLoading) {
  requestInProgress = isLoading;
  elements.messageInput.disabled = isLoading;
  updateSendButton();
}

function updateSendButton() {
  elements.sendButton.disabled =
    requestInProgress || elements.messageInput.value.trim().length === 0;
}

function resizeInput() {
  elements.messageInput.style.height = "auto";
  elements.messageInput.style.height = `${Math.min(
    elements.messageInput.scrollHeight,
    180
  )}px`;
}

function scrollToBottom(smooth = true) {
  requestAnimationFrame(() => {
    elements.conversation.scrollTo({
      top: elements.conversation.scrollHeight,
      behavior: smooth ? "smooth" : "auto"
    });
  });
}

function toggleSidebar() {
  const isOpen = elements.sidebar.classList.toggle("open");

  elements.sidebarOverlay.classList.toggle("visible", isOpen);
  elements.menuButton.setAttribute("aria-expanded", String(isOpen));
}

function closeSidebar() {
  elements.sidebar.classList.remove("open");
  elements.sidebarOverlay.classList.remove("visible");
  elements.menuButton.setAttribute("aria-expanded", "false");
}

function initializeImageFallbacks(root = document) {
  root.querySelectorAll(".avatar img").forEach((image) => {
    if (image.dataset.fallbackReady === "true") {
      return;
    }

    image.dataset.fallbackReady = "true";

    const markAsFailed = () => {
      image.closest(".avatar")?.classList.add("image-failed");
    };

    image.addEventListener("error", markAsFailed, { once: true });

    if (image.complete && image.naturalWidth === 0) {
      markAsFailed();
    }
  });
}

function createAvatarMarkup(extraClass = "") {
  return `
    <div class="avatar ${extraClass}">
      <img
        src="${escapeAttribute(AI_IMAGE)}"
        alt="${escapeAttribute(AI_NAME)}"
      >
      <span class="avatar-fallback" aria-hidden="true">
        ${escapeHtml(AI_NAME.charAt(0))}
      </span>
    </div>
  `;
}

function renderMarkdown(markdown) {
  const normalized = String(markdown || "").replace(/\r\n?/g, "\n");
  const codeBlocks = [];
  const tokenPrefix = `GRIEEZCODE${createId().replace(/[^a-zA-Z0-9]/g, "")}`;

  let text = normalized.replace(
    /```([^\n`]*)\n?([\s\S]*?)```/g,
    (_, language, code) => {
      const token = `${tokenPrefix}${codeBlocks.length}TOKEN`;
      const cleanLanguage = language.trim() || "text";

      codeBlocks.push({
        token,
        html: createCodeBlock(cleanLanguage, code.replace(/\n$/, ""))
      });

      return `\n${token}\n`;
    }
  );

  text = escapeHtml(text);

  const lines = text.split("\n");
  const output = [];

  let paragraph = [];
  let activeList = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) {
      return;
    }

    output.push(`<p>${formatInline(paragraph.join("<br>"))}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (!activeList) {
      return;
    }

    output.push(`</${activeList}>`);
    activeList = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    const codeBlock = codeBlocks.find((block) => block.token === trimmed);

    if (codeBlock) {
      flushParagraph();
      closeList();
      output.push(codeBlock.html);
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      flushParagraph();
      closeList();

      const level = headingMatch[1].length;
      output.push(
        `<h${level}>${formatInline(headingMatch[2])}</h${level}>`
      );
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    const orderedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);

    if (unorderedMatch || orderedMatch) {
      flushParagraph();

      const nextList = unorderedMatch ? "ul" : "ol";
      const content = unorderedMatch
        ? unorderedMatch[1]
        : orderedMatch[1];

      if (activeList !== nextList) {
        closeList();
        output.push(`<${nextList}>`);
        activeList = nextList;
      }

      output.push(`<li>${formatInline(content)}</li>`);
      continue;
    }

    closeList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  closeList();

  return output.join("");
}

function formatInline(value) {
  const inlineCode = [];
  const inlineTokenPrefix = `GRIEEZINLINE${createId().replace(
    /[^a-zA-Z0-9]/g,
    ""
  )}`;

  let text = value.replace(/`([^`\n]+)`/g, (_, code) => {
    const token = `${inlineTokenPrefix}${inlineCode.length}TOKEN`;
    inlineCode.push({
      token,
      html: `<code>${code}</code>`
    });
    return token;
  });

  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/__(.+?)__/g, "<strong>$1</strong>");

  inlineCode.forEach(({ token, html }) => {
    text = text.split(token).join(html);
  });

  return text;
}

function createCodeBlock(language, code) {
  const safeLanguage =
    language.replace(/[^a-zA-Z0-9_+#.-]/g, "").slice(0, 30) || "text";

  return `
    <div class="code-block">
      <div class="code-header">
        <span class="code-language">${escapeHtml(safeLanguage)}</span>

        <button
          class="code-copy-button"
          type="button"
          data-copy-code
          aria-label="Copy code"
        >
          <i class="fa-regular fa-copy" aria-hidden="true"></i>
          <span class="action-label">Copy code</span>
        </button>
      </div>

      <pre class="code-content"><code>${escapeHtml(code)}</code></pre>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function createChatTitle(content) {
  const singleLine = content.replace(/\s+/g, " ").trim();

  if (singleLine.length <= 42) {
    return singleLine;
  }

  return `${singleLine.slice(0, 42).trim()}…`;
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function loadChats() {
  try {
    const storedValue = localStorage.getItem(STORAGE_KEY);
    const parsed = storedValue ? JSON.parse(storedValue) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (chat) =>
          chat &&
          typeof chat.id === "string" &&
          Array.isArray(chat.messages)
      )
      .map((chat) => ({
        id: chat.id,
        title:
          typeof chat.title === "string" && chat.title.trim()
            ? chat.title
            : "New chat",
        createdAt: Number(chat.createdAt) || Date.now(),
        updatedAt: Number(chat.updatedAt) || Date.now(),
        messages: chat.messages.filter(
          (message) =>
            message &&
            (message.role === "user" || message.role === "assistant") &&
            typeof message.content === "string"
        )
      }));
  } catch (error) {
    console.warn("Could not load chat history:", error);
    return [];
  }
}

function saveChats() {
  try {
    const chatsToSave = chats
      .slice()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_STORED_CHATS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(chatsToSave));
  } catch (error) {
    console.warn("Could not save chat history:", error);
  }
}

async function readJsonResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("The server returned an invalid response.");
  }
}

function getFriendlyError(error) {
  if (!navigator.onLine) {
    return "You appear to be offline. Check your internet connection and try again.";
  }

  if (error instanceof TypeError) {
    return "I couldn't reach the server. Please check your connection and try again.";
  }

  const message =
    error instanceof Error && error.message
      ? error.message
      : "Something went wrong. Please try again.";

  return `Sorry, I ran into a problem: ${message}`;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");

    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";

    document.body.appendChild(textarea);
    textarea.select();

    const copied = document.execCommand("copy");
    textarea.remove();

    return copied;
  }
}

function setTemporaryLabel(button, temporaryText, defaultText = "") {
  const label = button.querySelector(".action-label");

  if (!label) {
    return;
  }

  const previousText = label.textContent || defaultText;
  label.textContent = temporaryText;

  window.setTimeout(() => {
    label.textContent = previousText;
  }, 1400);
}
