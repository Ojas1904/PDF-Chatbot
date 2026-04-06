// ═══════════════════════════════════════════════════════════════════════════
// DocMind — Text Chunker + TF-IDF Retrieval
// Splits text into overlapping chunks, builds TF-IDF index, cosine search
// ═══════════════════════════════════════════════════════════════════════════

// Common English stopwords to filter out
const STOPWORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by',
  'from','is','it','its','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','shall','should','may','might','can','could',
  'this','that','these','those','i','me','my','we','our','you','your','he','him',
  'his','she','her','they','them','their','what','which','who','whom','how',
  'when','where','why','not','no','nor','so','if','then','than','too','very',
  'just','about','above','after','again','all','also','am','any','are','as',
  'because','before','between','both','each','few','get','got','into','more',
  'most','other','out','over','own','same','some','such','up','only','now',
]);

/**
 * Tokenize text: lowercase, split, filter stopwords and short tokens
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * Approximate token count (words ≈ tokens * 0.75 for English)
 */
function estimateTokens(text) {
  return Math.ceil(text.split(/\s+/).length * 1.33);
}

/**
 * Split pages into overlapping chunks of target token size
 * @param {Array<{pageNum, text}>} pages
 * @param {number} targetTokens - Target chunk size in tokens (default 600)
 * @param {number} overlapTokens - Overlap between chunks (default 100)
 * @returns {Array<{text, pageNum, chunkIndex}>}
 */
export function chunkText(pages, targetTokens = 600, overlapTokens = 100) {
  const chunks = [];
  let globalIndex = 0;

  for (const page of pages) {
    const words = page.text.split(/\s+/);
    const targetWords = Math.round(targetTokens / 1.33);
    const overlapWords = Math.round(overlapTokens / 1.33);

    if (words.length <= targetWords) {
      // Page fits in one chunk
      chunks.push({
        text: page.text,
        pageNum: page.pageNum,
        chunkIndex: globalIndex++,
      });
      continue;
    }

    // Split into overlapping windows
    let start = 0;
    while (start < words.length) {
      const end = Math.min(start + targetWords, words.length);
      const chunkText = words.slice(start, end).join(' ');
      
      chunks.push({
        text: chunkText,
        pageNum: page.pageNum,
        chunkIndex: globalIndex++,
      });

      if (end >= words.length) break;
      start = end - overlapWords;
    }
  }

  return chunks;
}

/**
 * Build a TF-IDF index from chunks
 * @param {Array<{text, pageNum, chunkIndex}>} chunks
 * @returns {{ vocabulary, idf, tfidfVectors, chunks }}
 */
export function buildTFIDF(chunks) {
  const N = chunks.length;
  if (N === 0) return { vocabulary: {}, idf: {}, tfidfVectors: [], chunks };

  // Build vocabulary and document frequencies
  const docFreq = {};   // term → number of documents containing it
  const vocabulary = {}; // term → index
  let vocabSize = 0;

  const tokenizedDocs = chunks.map(chunk => {
    const tokens = tokenize(chunk.text);
    const uniqueTerms = new Set(tokens);
    
    for (const term of uniqueTerms) {
      docFreq[term] = (docFreq[term] || 0) + 1;
      if (!(term in vocabulary)) {
        vocabulary[term] = vocabSize++;
      }
    }
    
    return tokens;
  });

  // Compute IDF
  const idf = {};
  for (const term in docFreq) {
    idf[term] = Math.log((N + 1) / (docFreq[term] + 1)) + 1; // smoothed IDF
  }

  // Build TF-IDF vectors (sparse representation)
  const tfidfVectors = tokenizedDocs.map(tokens => {
    const tf = {};
    for (const t of tokens) {
      tf[t] = (tf[t] || 0) + 1;
    }
    
    // Normalize TF and multiply by IDF
    const maxTf = Math.max(...Object.values(tf), 1);
    const vector = {};
    
    for (const term in tf) {
      const normalizedTf = tf[term] / maxTf;
      vector[term] = normalizedTf * (idf[term] || 0);
    }
    
    return vector;
  });

  return { vocabulary, idf, tfidfVectors, chunks };
}

/**
 * Compute cosine similarity between two sparse vectors
 */
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const term in vecA) {
    normA += vecA[term] ** 2;
    if (term in vecB) {
      dotProduct += vecA[term] * vecB[term];
    }
  }

  for (const term in vecB) {
    normB += vecB[term] ** 2;
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}

/**
 * Search for the most relevant chunks given a query
 * @param {string} query
 * @param {{ idf, tfidfVectors, chunks }} tfidfData
 * @param {number} topK
 * @returns {Array<{chunk, score}>}
 */
export function searchChunks(query, tfidfData, topK = 5) {
  const { idf, tfidfVectors, chunks } = tfidfData;
  
  if (!chunks || chunks.length === 0) return [];

  // Vectorize query using same IDF weights
  const queryTokens = tokenize(query);
  const queryTf = {};
  for (const t of queryTokens) {
    queryTf[t] = (queryTf[t] || 0) + 1;
  }
  
  const maxTf = Math.max(...Object.values(queryTf), 1);
  const queryVector = {};
  for (const term in queryTf) {
    const normalizedTf = queryTf[term] / maxTf;
    queryVector[term] = normalizedTf * (idf[term] || 0);
  }

  // Compute similarities
  const scored = tfidfVectors.map((vec, i) => ({
    chunk: chunks[i],
    score: cosineSimilarity(queryVector, vec),
  }));

  // Sort by score descending, take top K
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/**
 * Determine if query results come from the document
 * Uses a relevance threshold on the best score
 */
export function isDocumentRelevant(results, threshold = 0.001) {
  if (!results || results.length === 0) return false;
  return results[0].score >= threshold;
}
