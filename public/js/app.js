// ═══════════════════════════════════════════════════════════════════════════
// DocMind — Main Application Controller
// Wires all modules together, manages state, handles events
// ═══════════════════════════════════════════════════════════════════════════

import { parseFile, getFileIcon, formatFileSize } from './parser.js';
import { chunkText, buildTFIDF } from './chunker.js';
import {
  sendMessage,
  setActiveDocument,
  clearConversation,
  clearAllConversations,
  removeDocumentConversation,
  getConversationHistory,
} from './chat.js';
import {
  initUI,
  renderUserMessage,
  createAIMessageStream,
  showTypingIndicator,
  hideTypingIndicator,
  clearInput,
  focusInput,
  setInputEnabled,
  setStatus,
  showMessagesView,
  showEmptyState,
  clearMessages,
  renderDocumentList,
  renderImageGallery,
  renderFileMetadata,
  showProgress,
  updateProgress,
  hideProgress,
  showDropOverlay,
  hideDropOverlay,
  setUploadZoneDragOver,
  scrollToBottom,
  openLightbox,
  closeLightbox,
} from './ui.js';

// ── Application State ─────────────────────────────────────────────────────

const state = {
  documents: new Map(), // id → { name, file, status, metadata, chunks, tfidfData, images }
  activeDocId: null,
  isStreaming: false,
  currentAbortController: null,
};

let docIdCounter = 0;

function generateDocId() {
  return `doc_${++docIdCounter}_${Date.now()}`;
}

// ── Initialization ────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initUI();
  bindEvents();
  setStatus('idle', 'Ready — upload a document to begin');
  focusInput();
});

// ── Event Bindings ────────────────────────────────────────────────────────

function bindEvents() {
  // File inputs
  const fileInput = document.getElementById('fileInput');
  const uploadZoneInput = document.getElementById('uploadZoneInput');
  const uploadZone = document.getElementById('uploadZone');
  const landingFileInput = document.getElementById('landingFileInput');

  fileInput?.addEventListener('change', (e) => handleFileSelect(e.target.files));
  uploadZoneInput?.addEventListener('change', (e) => handleFileSelect(e.target.files));
  landingFileInput?.addEventListener('change', (e) => handleFileSelect(e.target.files));
  
  // Upload zone click
  uploadZone?.addEventListener('click', () => uploadZoneInput.click());

  // Send message
  const sendBtn = document.getElementById('sendBtn');
  const chatInput = document.getElementById('chatInput');

  sendBtn.addEventListener('click', handleSendMessage);
  
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  // Clear conversation
  const clearBtn = document.getElementById('clearBtn');
  clearBtn.addEventListener('click', handleClearConversation);

  // Suggestion chips
  document.querySelectorAll('.chip[data-q]').forEach(chip => {
    chip.addEventListener('click', () => {
      if (!state.activeDocId) return;
      chatInput.value = chip.dataset.q;
      chatInput.dispatchEvent(new Event('input'));
      handleSendMessage();
    });
  });

  // Drag and drop (whole window)
  let dragCounter = 0;

  window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    if (dragCounter === 1) {
      showDropOverlay();
    }
  });

  window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      hideDropOverlay();
    }
  });

  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    hideDropOverlay();
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
  });

  // Upload zone specific drag visual
  if (uploadZone) {
    uploadZone.addEventListener('dragenter', (e) => {
      e.preventDefault();
      setUploadZoneDragOver(true);
    });
    uploadZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      setUploadZoneDragOver(false);
    });
    uploadZone.addEventListener('drop', (e) => {
      setUploadZoneDragOver(false);
    });
  }

  // Keyboard shortcut: Escape to close lightbox
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLightbox();
    }
  });
}

// ── File Handling ─────────────────────────────────────────────────────────

async function handleFileSelect(files) {
  if (!files || files.length === 0) return;

  for (const file of files) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'pptx', 'ppt'].includes(ext)) {
      alert(`Unsupported file: ${file.name}\nSupported: PDF, PPTX`);
      continue;
    }
    await processFile(file);
  }

  // Reset file inputs
  document.getElementById('fileInput').value = '';
  document.getElementById('uploadZoneInput').value = '';
}

async function processFile(file) {
  const docId = generateDocId();
  const icon = getFileIcon(file.name);

  // Add to state
  state.documents.set(docId, {
    id: docId,
    name: file.name,
    status: 'parsing',
    metadata: null,
    chunks: null,
    tfidfData: null,
    images: null,
  });

  // Switch to this document
  switchToDocument(docId);
  
  // Update sidebar
  refreshDocumentList();

  // Show progress
  setStatus('parsing', `Parsing ${file.name}...`);
  showProgress(file.name, icon);

  try {
    // Parse file (client-side)
    const result = await parseFile(file, (percent, statusText) => {
      updateProgress(percent, statusText);
    });

    // Chunk text
    updateProgress(92, 'Chunking text...');
    const chunks = chunkText(result.pages, 600, 100);

    // Build search index
    updateProgress(96, 'Building search index...');
    const tfidfData = buildTFIDF(chunks);

    // Update document state
    const doc = state.documents.get(docId);
    doc.status = 'ready';
    doc.metadata = result.metadata;
    doc.chunks = chunks;
    doc.tfidfData = tfidfData;
    doc.images = result.images;

    // Update UI
    hideProgress();
    const { transitionToApp } = getUIModule();
    transitionToApp();
    
    setStatus('ready', `${file.name} — ${chunks.length} chunks indexed`);
    refreshDocumentList();
    renderImageGallery(result.images);
    renderFileMetadata(result.metadata);

    // Setup conversation for this doc
    setActiveDocument(docId);

    // Show chat-ready state
    focusInput();

  } catch (err) {
    console.error('File processing error:', err);
    
    const doc = state.documents.get(docId);
    if (doc) doc.status = 'error';
    
    hideProgress();
    setStatus('error', `Error: ${err.message}`);
    refreshDocumentList();
    
    alert(`Failed to process ${file.name}:\n${err.message}`);
  }
}

// ── Document Switching ────────────────────────────────────────────────────

function switchToDocument(docId) {
  state.activeDocId = docId;
  setActiveDocument(docId);

  const doc = state.documents.get(docId);
  if (!doc) return;

  // Update sidebar
  refreshDocumentList();
  
  if (doc.images) renderImageGallery(doc.images);
  else renderImageGallery([]);
  
  if (doc.metadata) renderFileMetadata(doc.metadata);
  else renderFileMetadata(null);

  // Clear messages view and show history for this doc
  clearMessages();
  
  const history = getConversationHistoryForDoc(docId);
  if (history.length > 0) {
    showMessagesView();
    // Re-render conversation history
    for (const msg of history) {
      if (msg.role === 'user') {
        renderUserMessage(msg.content);
      } else {
        const { createAIMessageStream } = getUIModule();
        const stream = createAIMessageStream(null);
        stream.finalize(msg.content, null);
      }
    }
  } else {
    showEmptyState();
  }

  // Update status
  if (doc.status === 'ready') {
    setStatus('ready', `${doc.name} — ${doc.chunks?.length || 0} chunks indexed`);
  }
}

function getConversationHistoryForDoc(docId) {
  return getConversationHistory(docId);
}

// Lazy module getters to avoid circular deps
function getUIModule() {
  return { 
    createAIMessageStream,
    transitionToApp: () => {
      // Direct import from ui.js is safe inside lazy getter
      import('./ui.js').then(module => module.transitionToApp());
    }
  };
}

function deleteDocument(docId) {
  state.documents.delete(docId);
  removeDocumentConversation(docId);

  if (state.activeDocId === docId) {
    // Switch to another doc or show empty
    const remaining = [...state.documents.keys()];
    if (remaining.length > 0) {
      switchToDocument(remaining[0]);
    } else {
      state.activeDocId = null;
      showEmptyState();
      renderImageGallery([]);
      renderFileMetadata(null);
      setStatus('idle', 'Ready — upload a document to begin');
    }
  }

  refreshDocumentList();
}

// ── Document List Refresh ─────────────────────────────────────────────────

function refreshDocumentList() {
  const docs = [...state.documents.values()];
  renderDocumentList(docs, state.activeDocId, switchToDocument, deleteDocument);
}

// ── Message Sending ───────────────────────────────────────────────────────

function handleSendMessage() {
  const chatInput = document.getElementById('chatInput');
  const question = chatInput.value.trim();
  
  if (!question || state.isStreaming) return;

  // Render user message
  renderUserMessage(question);
  clearInput();

  // Prepare session data
  let sessionData = null;
  if (state.activeDocId) {
    const doc = state.documents.get(state.activeDocId);
    if (doc && doc.status === 'ready') {
      sessionData = {
        tfidfData: doc.tfidfData,
        images: doc.images,
      };
    }
  }

  // Show thinking state
  state.isStreaming = true;
  setInputEnabled(false);
  showTypingIndicator();
  setStatus('thinking', 'Thinking...');

  // Create streaming message container
  let streamEl = null;

  state.currentAbortController = sendMessage(
    question,
    sessionData,
    // onToken
    (token) => {
      if (!streamEl) {
        hideTypingIndicator();
        streamEl = createAIMessageStream(null);
      }
      streamEl.appendToken(token);
    },
    // onDone
    (fullResponse, sourceInfo) => {
      hideTypingIndicator();
      if (!streamEl) {
        streamEl = createAIMessageStream(sourceInfo);
      }
      streamEl.finalize(fullResponse, sourceInfo);
      
      state.isStreaming = false;
      state.currentAbortController = null;
      setInputEnabled(true);
      focusInput();

      const doc = state.activeDocId ? state.documents.get(state.activeDocId) : null;
      if (doc) {
        setStatus('ready', `${doc.name} — Ready`);
      } else {
        setStatus('idle', 'Ready');
      }
    },
    // onError
    (errorMessage) => {
      hideTypingIndicator();
      state.isStreaming = false;
      state.currentAbortController = null;
      setInputEnabled(true);
      focusInput();
      setStatus('error', `Error: ${errorMessage}`);

      // Show error as AI message
      const errorEl = createAIMessageStream(null);
      errorEl.finalize(`⚠️ **Error:** ${errorMessage}\n\nPlease try again.`, null);
    }
  );
}

// ── Clear Conversation ────────────────────────────────────────────────────

function handleClearConversation() {
  if (state.isStreaming && state.currentAbortController) {
    state.currentAbortController.abort();
    state.isStreaming = false;
    state.currentAbortController = null;
  }

  hideTypingIndicator();
  clearMessages();
  clearConversation(state.activeDocId);
  showEmptyState();
  setInputEnabled(true);
  focusInput();

  const doc = state.activeDocId ? state.documents.get(state.activeDocId) : null;
  if (doc) {
    setStatus('ready', `${doc.name} — Conversation cleared`);
  } else {
    setStatus('idle', 'Ready — upload a document to begin');
  }
}
