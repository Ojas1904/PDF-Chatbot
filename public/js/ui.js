// ═══════════════════════════════════════════════════════════════════════════
// DocMind — UI Rendering Module
// All DOM manipulation, rendering, animations, and visual feedback
// ═══════════════════════════════════════════════════════════════════════════

import { getFileIcon, formatFileSize } from './parser.js';

// ── Cached DOM Elements ──────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

let elements = {};

let vantaEffect = null;

export function initUI() {
  elements = {
    chatArea: $('chatArea'),
    messagesContainer: $('messagesContainer'),
    emptyState: $('emptyState'),
    typingIndicator: $('typingIndicator'),
    chatInput: $('chatInput'),
    sendBtn: $('sendBtn'),
    clearBtn: $('clearBtn'),
    documentList: $('documentList'),
    docCount: $('docCount'),
    imageGallery: $('imageGallery'),
    imageGallerySection: $('imageGallerySection'),
    imageCount: $('imageCount'),
    fileMeta: $('fileMeta'),
    fileMetaSection: $('fileMetaSection'),
    uploadZone: $('uploadZone'),
    uploadZoneInput: $('uploadZoneInput'),
    progressContainer: $('progressContainer'),
    progressFill: $('progressFill'),
    progressStatus: $('progressStatus'),
    progressFileName: $('progressFileName'),
    progressIcon: $('progressIcon'),
    topbarStatus: $('topbarStatus'),
    sidebar: $('sidebar'),
    menuBtn: $('menuBtn'),
    sidebarClose: $('sidebarClose'),
    dropOverlay: $('dropOverlay'),
    lightbox: $('lightbox'),
    lightboxImg: $('lightboxImg'),
    lightboxCaption: $('lightboxCaption'),
    lightboxClose: $('lightboxClose'),
    landingPage: $('landingPage'),
    appContainer: $('app'),
    landingProgressContainer: $('landingProgressContainer'),
    landingUploadZone: $('landingUploadZone'),
    lpFileName: $('lpFileName'),
    lpPercent: $('lpPercent'),
    lpFill: $('lpFill'),
    lpStatusText: $('lpStatusText'),
  };

  // Init Vanta.js Background
  if (window.VANTA) {
    vantaEffect = window.VANTA.NET({
      el: "#vanta-bg",
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200.00,
      minWidth: 200.00,
      scale: 1.00,
      scaleMobile: 1.00,
      color: 0x7c6aff,
      backgroundColor: 0x08080d,
      points: 12.00,
      maxDistance: 22.00,
      spacing: 16.00
    });
  }

  // Auto-resize textarea
  elements.chatInput?.addEventListener('input', autoResizeTextarea);

  // Setup lightbox
  elements.lightboxClose?.addEventListener('click', closeLightbox);
  elements.lightbox?.addEventListener('click', (e) => {
    if (e.target === elements.lightbox) closeLightbox();
  });

  // Setup sidebar toggle
  elements.menuBtn?.addEventListener('click', toggleSidebar);
  elements.sidebarClose?.addEventListener('click', closeSidebar);

  // Setup theme toggle
  const themeToggle = $('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('light-mode');
      const isLight = document.body.classList.contains('light-mode');
      if (vantaEffect) {
        vantaEffect.setOptions({
          backgroundColor: isLight ? 0xf0f2f5 : 0x08080d,
          color: isLight ? 0x6366f1 : 0x7c6aff
        });
      }
    });
  }
}

export function transitionToApp() {
  if (elements.landingPage && elements.landingPage.classList.contains('active')) {
    elements.landingPage.classList.remove('active');
    setTimeout(() => {
      elements.landingPage.style.display = 'none';
      elements.appContainer.style.display = 'flex';
      // Trigger reflow
      void elements.appContainer.offsetWidth;
      elements.appContainer.style.opacity = '1';
    }, 600);
  }
}

// ── Input ─────────────────────────────────────────────────────────────────

function autoResizeTextarea() {
  const el = elements.chatInput;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  elements.sendBtn.disabled = !el.value.trim();
}

export function clearInput() {
  elements.chatInput.value = '';
  elements.chatInput.style.height = 'auto';
  elements.sendBtn.disabled = true;
}

export function focusInput() {
  elements.chatInput.focus();
}

export function setInputEnabled(enabled) {
  elements.chatInput.disabled = !enabled;
  if (!enabled) {
    elements.sendBtn.disabled = true;
  }
}

// ── Status Bar ────────────────────────────────────────────────────────────

export function setStatus(status, text) {
  const dot = elements.topbarStatus.querySelector('.status-dot');
  const label = elements.topbarStatus.querySelector('span');
  
  dot.className = `status-dot status-${status}`;
  label.textContent = text;
}

// ── Messages ──────────────────────────────────────────────────────────────

export function showMessagesView() {
  elements.emptyState.style.display = 'none';
  elements.messagesContainer.style.display = 'flex';
}

export function showEmptyState() {
  elements.emptyState.style.display = 'flex';
  elements.messagesContainer.style.display = 'none';
}

export function clearMessages() {
  elements.messagesContainer.innerHTML = '';
}

/**
 * Render a user message bubble
 */
export function renderUserMessage(text) {
  showMessagesView();

  const msgDiv = document.createElement('div');
  msgDiv.className = 'message user';
  msgDiv.innerHTML = `
    <div class="user-bubble">${escapeHtml(text)}</div>
  `;
  elements.messagesContainer.appendChild(msgDiv);
  scrollToBottom();
}

/**
 * Create an AI message container for streaming
 * Returns { element, textEl, appendToken, finalize }
 */
export function createAIMessageStream(sourceInfo) {
  showMessagesView();

  const msgDiv = document.createElement('div');
  msgDiv.className = 'message';

  const isDoc = sourceInfo?.isFromDocument;

  msgDiv.innerHTML = `
    <div class="ai-message">
      <div class="ai-avatar"><span>🧠</span></div>
      <div class="ai-content">
        <div class="ai-label">DocMind</div>
        <div class="ai-text" id="stream-text"></div>
        <div class="message-actions">
          <button class="action-btn copy-btn" title="Copy response">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span>Copy</span>
          </button>
        </div>
      </div>
    </div>
  `;

  elements.messagesContainer.appendChild(msgDiv);

  const textEl = msgDiv.querySelector('#stream-text');
  textEl.removeAttribute('id');

  // Copy button handler
  const copyBtn = msgDiv.querySelector('.copy-btn');
  copyBtn.addEventListener('click', () => {
    const rawText = textEl.innerText;
    navigator.clipboard.writeText(rawText).then(() => {
      copyBtn.classList.add('copied');
      copyBtn.querySelector('span').textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtn.querySelector('span').textContent = 'Copy';
      }, 2000);
    });
  });

  let rawContent = '';

  return {
    element: msgDiv,
    appendToken(token) {
      rawContent += token;
      textEl.innerHTML = renderMarkdown(rawContent);
      scrollToBottom();
    },
    finalize(fullText, sourceInfo) {
      rawContent = fullText;
      textEl.innerHTML = renderMarkdown(fullText);

      // Add citation badges for referenced pages
      if (sourceInfo?.chunks?.length > 0) {
        const pages = [...new Set(sourceInfo.chunks.map(c => c.pageNum))];
        const citationDiv = document.createElement('div');
        citationDiv.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-top:10px;';
        pages.forEach(p => {
          const badge = document.createElement('span');
          badge.className = 'citation-badge';
          badge.textContent = `📑 Page ${p}`;
          citationDiv.appendChild(badge);
        });
        textEl.appendChild(citationDiv);
      }

      // Add inline images if relevant
      if (sourceInfo?.images?.length > 0) {
        const imagesDiv = document.createElement('div');
        imagesDiv.className = 'msg-images';
        sourceInfo.images.slice(0, 4).forEach(img => {
          const imgEl = document.createElement('img');
          imgEl.className = 'msg-image-thumb';
          imgEl.src = img.thumbnail || img.base64;
          imgEl.alt = `Page ${img.pageNum}`;
          imgEl.addEventListener('click', () => openLightbox(img.base64, `Page ${img.pageNum}`));
          imagesDiv.appendChild(imgEl);
        });
        textEl.appendChild(imagesDiv);
      }

      scrollToBottom();
    },
  };
}

/**
 * Render a complete AI message (non-streaming)
 */
export function renderAIMessage(text, sourceInfo) {
  const stream = createAIMessageStream(sourceInfo);
  stream.finalize(text, sourceInfo);
  return stream.element;
}

// ── Typing Indicator ──────────────────────────────────────────────────────

export function showTypingIndicator() {
  elements.typingIndicator.style.display = 'flex';
  scrollToBottom();
}

export function hideTypingIndicator() {
  elements.typingIndicator.style.display = 'none';
}

// ── Document List ─────────────────────────────────────────────────────────

export function renderDocumentList(documents, activeId, onSelect, onDelete) {
  elements.docCount.textContent = documents.length;

  if (documents.length === 0) {
    elements.documentList.innerHTML = `
      <div class="empty-docs">
        <span class="empty-docs-icon">📂</span>
        <span class="empty-docs-text">No documents yet</span>
      </div>
    `;
    return;
  }

  elements.documentList.innerHTML = documents.map(doc => `
    <div class="doc-item ${doc.id === activeId ? 'active' : ''}" data-id="${doc.id}">
      <div class="doc-icon ${doc.status === 'parsing' ? 'processing' : ''}">${getFileIcon(doc.name)}</div>
      <div class="doc-info">
        <div class="doc-name" title="${escapeHtml(doc.name)}">${escapeHtml(doc.name)}</div>
        <div class="doc-meta">${doc.metadata ? `${doc.metadata.pageCount} pages · ${formatFileSize(doc.metadata.size)}` : 'Processing...'}</div>
      </div>
      <div class="doc-status ${doc.status}"></div>
      <button class="doc-delete" data-id="${doc.id}" title="Remove document">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `).join('');

  // Bind events
  elements.documentList.querySelectorAll('.doc-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.doc-delete')) return;
      onSelect(el.dataset.id);
      if (window.innerWidth < 768) {
        closeSidebar();
      }
    });
  });

  elements.documentList.querySelectorAll('.doc-delete').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onDelete(el.dataset.id);
    });
  });
}

// ── Image Gallery ─────────────────────────────────────────────────────────

export function renderImageGallery(images) {
  if (!images || images.length === 0) {
    elements.imageGallerySection.style.display = 'none';
    return;
  }

  elements.imageGallerySection.style.display = 'block';
  elements.imageCount.textContent = images.length;

  elements.imageGallery.innerHTML = images.map((img, i) => `
    <div class="gallery-thumb" data-index="${i}">
      <img src="${img.thumbnail || img.base64}" alt="Page ${img.pageNum}" loading="lazy">
      <span class="gallery-thumb-page">P${img.pageNum}</span>
    </div>
  `).join('');

  // Bind lightbox
  elements.imageGallery.querySelectorAll('.gallery-thumb').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.index);
      const img = images[idx];
      openLightbox(img.base64, `Page ${img.pageNum}`);
    });
  });
}

// ── File Metadata ─────────────────────────────────────────────────────────

export function renderFileMetadata(metadata) {
  if (!metadata) {
    elements.fileMetaSection.style.display = 'none';
    return;
  }

  elements.fileMetaSection.style.display = 'block';
  elements.fileMeta.innerHTML = `
    <div class="meta-row">
      <span class="meta-label">Name</span>
      <span class="meta-value" title="${escapeHtml(metadata.name)}">${truncate(metadata.name, 20)}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">Size</span>
      <span class="meta-value">${formatFileSize(metadata.size)}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">${metadata.type === 'pdf' ? 'Pages' : 'Slides'}</span>
      <span class="meta-value">${metadata.pageCount}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">Images</span>
      <span class="meta-value">${metadata.imageCount}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">Type</span>
      <span class="meta-value">${metadata.type.toUpperCase()}</span>
    </div>
  `;
}

// ── Progress ──────────────────────────────────────────────────────────────

export function showProgress(fileName, fileIcon) {
  if (elements.uploadZone) elements.uploadZone.style.display = 'none';
  if (elements.progressContainer) elements.progressContainer.style.display = 'block';
  if (elements.progressFileName) elements.progressFileName.textContent = fileName;
  if (elements.progressIcon) elements.progressIcon.textContent = fileIcon;

  if (elements.landingPage && elements.landingPage.classList.contains('active')) {
    if (elements.landingUploadZone) elements.landingUploadZone.style.display = 'none';
    if (elements.landingProgressContainer) elements.landingProgressContainer.style.display = 'block';
    if (elements.lpFileName) elements.lpFileName.textContent = fileName;
  }

  updateProgress(0, 'Initializing...');
}

export function updateProgress(percent, statusText) {
  if (elements.progressFill) elements.progressFill.style.width = percent + '%';
  if (elements.progressStatus) elements.progressStatus.textContent = statusText;

  if (elements.landingProgressContainer && elements.landingProgressContainer.style.display !== 'none') {
    if (elements.lpFill) elements.lpFill.style.width = percent + '%';
    if (elements.lpPercent) elements.lpPercent.textContent = Math.round(percent) + '%';
    if (elements.lpStatusText) elements.lpStatusText.textContent = statusText;
  }
}

export function hideProgress() {
  if (elements.progressContainer) elements.progressContainer.style.display = 'none';
  if (elements.uploadZone) elements.uploadZone.style.display = 'block';

  if (elements.landingProgressContainer) {
    elements.landingProgressContainer.style.display = 'none';
    if (elements.landingUploadZone) elements.landingUploadZone.style.display = 'block';
  }
}

// ── Lightbox ──────────────────────────────────────────────────────────────

export function openLightbox(src, caption) {
  elements.lightboxImg.src = src;
  elements.lightboxCaption.textContent = caption || '';
  elements.lightbox.style.display = 'flex';
  elements.lightbox.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

export function closeLightbox() {
  elements.lightbox.classList.remove('visible');
  elements.lightbox.style.display = 'none';
  elements.lightboxImg.src = '';
  document.body.style.overflow = '';
}

// ── Sidebar ───────────────────────────────────────────────────────────────

function toggleSidebar() {
  elements.sidebar.classList.toggle('open');
  toggleBackdrop(elements.sidebar.classList.contains('open'));
}

function closeSidebar() {
  elements.sidebar.classList.remove('open');
  toggleBackdrop(false);
}

function toggleBackdrop(show) {
  let backdrop = document.querySelector('.sidebar-backdrop');
  if (show && !backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop visible';
    backdrop.addEventListener('click', closeSidebar);
    document.body.appendChild(backdrop);
  } else if (!show && backdrop) {
    backdrop.remove();
  }
}

// ── Drop Overlay ──────────────────────────────────────────────────────────

export function showDropOverlay() {
  elements.dropOverlay.classList.add('visible');
}

export function hideDropOverlay() {
  elements.dropOverlay.classList.remove('visible');
}

// ── Upload Zone DnD visuals ───────────────────────────────────────────────

export function setUploadZoneDragOver(isDragOver) {
  if (isDragOver) {
    elements.uploadZone?.classList.add('drag-over');
  } else {
    elements.uploadZone?.classList.remove('drag-over');
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

export function scrollToBottom(smooth = true) {
  const chatArea = elements.chatArea;
  if (smooth) {
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
  } else {
    chatArea.scrollTop = chatArea.scrollHeight;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncate(text, maxLen) {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}

/**
 * Simple markdown renderer — handles bold, italic, code, lists, headers, paragraphs
 */
function renderMarkdown(text) {
  if (!text) return '';

  let html = escapeHtml(text);

  // Code blocks (```)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Unordered lists
  html = html.replace(/^[•\-\*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  // Avoid double-wrapping
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Citation badges: [Page X] or [Slide X]
  html = html.replace(/\[(Page|Slide)\s+(\d+)\]/gi, '<span class="citation-badge">📑 $1 $2</span>');

  // Line breaks → paragraphs (excluding elements already wrapped)
  html = html
    .split('\n\n')
    .map(block => {
      block = block.trim();
      if (!block) return '';
      if (block.startsWith('<h') || block.startsWith('<pre') || block.startsWith('<ul') || block.startsWith('<ol') || block.startsWith('<li')) {
        return block;
      }
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    })
    .join('');

  return html;
}
