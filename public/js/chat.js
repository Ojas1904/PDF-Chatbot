// ═══════════════════════════════════════════════════════════════════════════
// DocMind — Chat Module
// Handles Claude API streaming, conversation history, source labeling
// ═══════════════════════════════════════════════════════════════════════════

import { searchChunks, isDocumentRelevant } from './chunker.js';

// Conversation history per document (keyed by doc id)
const conversations = new Map();
let currentDocId = null;

/**
 * Set the active document for conversation context
 */
export function setActiveDocument(docId) {
  currentDocId = docId;
  if (!conversations.has(docId)) {
    conversations.set(docId, []);
  }
}

/**
 * Get conversation history for the current document
 */
export function getConversationHistory(docId) {
  return conversations.get(docId || currentDocId) || [];
}

/**
 * Clear conversation history for a document
 */
export function clearConversation(docId) {
  const id = docId || currentDocId;
  if (id) {
    conversations.set(id, []);
  }
}

/**
 * Clear all conversations
 */
export function clearAllConversations() {
  conversations.clear();
}

/**
 * Send a message and stream the response
 * @param {string} question
 * @param {Object} sessionData - { tfidfData, images }
 * @param {Function} onToken - callback(token) for streaming
 * @param {Function} onDone - callback(fullResponse, sourceInfo)
 * @param {Function} onError - callback(errorMessage)
 * @returns {AbortController} - to cancel the stream
 */
export function sendMessage(question, sessionData, onToken, onDone, onError) {
  const abortController = new AbortController();
  
  // Add user message to history
  const history = getConversationHistory();
  history.push({ role: 'user', content: question });

  // Search for relevant chunks
  let relevantChunks = [];
  let relevantImages = [];
  let isFromDocument = false;

  if (sessionData && sessionData.tfidfData) {
    // Get top 20 relevant chunks via TF-IDF
    const results = searchChunks(question, sessionData.tfidfData, 20);
    
    // Always include the first 5 chunks (title, intro, overview)
    const firstChunks = sessionData.tfidfData.chunks.slice(0, 5);
    
    // Combine intro chunks with top relevant chunks
    const combinedChunks = [...firstChunks, ...results.map(r => r.chunk)];
    
    // Deduplicate by chunkIndex
    const uniqueMap = new Map();
    for (const chunk of combinedChunks) {
      if (!uniqueMap.has(chunk.chunkIndex)) {
        uniqueMap.set(chunk.chunkIndex, chunk);
      }
    }
    
    // Sort chronologically as they appear in the document
    relevantChunks = Array.from(uniqueMap.values()).sort((a, b) => a.chunkIndex - b.chunkIndex);
    isFromDocument = true;

    // Find images from the same pages as relevant chunks
    if (sessionData.images && sessionData.images.length > 0) {
      const relevantPages = new Set(relevantChunks.map(c => c.pageNum));
      // Prioritize images from relevant chunks, if none, take first few images
      relevantImages = sessionData.images.filter(img => relevantPages.has(img.pageNum));
      if (relevantImages.length === 0) {
        relevantImages = sessionData.images.slice(0, 3);
      }
    }
  }

  // Build request
  const requestBody = {
    question,
    chunks: isFromDocument ? relevantChunks : [],
    images: relevantImages.slice(0, 5).map(img => ({
      pageNum: img.pageNum,
      base64: img.base64,
    })),
    conversationHistory: history.slice(-20), // Last 10 exchanges
    isDocumentQuery: !!(sessionData && sessionData.tfidfData),
  };

  // Stream response
  let fullResponse = '';

  (async () => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Server error' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          
          let parsedData;
          try {
            parsedData = JSON.parse(line.slice(6));
          } catch (parseErr) {
            console.warn('Parse error on SSE line:', line);
            continue;
          }
            
          if (parsedData.type === 'text') {
            fullResponse += parsedData.content;
            onToken(parsedData.content);
          } else if (parsedData.type === 'done') {
            // Add assistant message to history
            history.push({ role: 'assistant', content: fullResponse });
            
            const sourceInfo = {
              isFromDocument,
              chunks: relevantChunks,
              images: relevantImages,
            };
            
            onDone(fullResponse, sourceInfo);
            return;
          } else if (parsedData.type === 'error') {
            throw new Error(parsedData.content);
          }
        }
      }

      // If stream ended without 'done' event
      if (fullResponse) {
        history.push({ role: 'assistant', content: fullResponse });
        onDone(fullResponse, { isFromDocument, chunks: relevantChunks, images: relevantImages });
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Chat error:', err);
      onError(err.message);
    }
  })();

  return abortController;
}

/**
 * Remove a document's conversation
 */
export function removeDocumentConversation(docId) {
  conversations.delete(docId);
}
