import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(join(__dirname, 'public')));

let genAI = null;

function getGeminiClient() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey === 'your_anthropic_api_key_here') {
      throw new Error('GEMINI_API_KEY is not set. Please add it to your .env file.');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

// Health check
app.get('/api/health', (req, res) => {
  const hasKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' && process.env.GEMINI_API_KEY !== 'your_anthropic_api_key_here';
  res.json({ status: 'ok', model: 'gemini-2.5-flash', apiKeyConfigured: hasKey });
});

// Chat endpoint with SSE streaming
app.post('/api/chat', async (req, res) => {
  const { question, chunks, images, conversationHistory, isDocumentQuery } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  let streamEnded = false;

  try {
    const client = getGeminiClient();

    // Build system prompt
    const systemPrompt = buildSystemPrompt(isDocumentQuery);

    const model = client.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
    });

    // Build messages array
    const contents = buildMessages(question, chunks, images, conversationHistory);

    // Stream from Gemini
    const result = await model.generateContentStream({ contents });

    for await (const chunk of result.stream) {
      if (streamEnded) break;
      const text = chunk.text();
      res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
    }

    if (!streamEnded) {
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
      streamEnded = true;
    }

    // Handle client disconnect
    req.on('close', () => {
      streamEnded = true;
    });

  } catch (error) {
    if (streamEnded) return;
    console.error('Chat error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
    res.end();
  }
});

function buildSystemPrompt(isDocumentQuery) {
  if (isDocumentQuery) {
    return `You are DocMind, an intelligent document analysis AI agent. You are analyzing a document that the user has uploaded.

IMPORTANT RULES:
1. Answer questions based PRIMARILY on the provided document context (chunks).
2. When you reference information from the document, cite the page/slide number using this format: [Page X] or [Slide X].
3. If the document context contains relevant information, start your response with "📚 **From document**" on the first line.
4. If the question is NOT answerable from the provided document context, answer from your general knowledge and start with "🌐 **From general knowledge**" on the first line.
5. Be concise, precise, and helpful. Use markdown formatting for clarity.
6. When images are provided alongside text, analyze them together for a comprehensive answer.
7. If an image is relevant to your answer, mention it explicitly.
8. Support multi-turn conversation — reference previous context when relevant.`;
  }

  return `You are DocMind, a helpful AI assistant. No document has been loaded yet. 
Answer questions from your general knowledge. Always start responses with "🌐 **From general knowledge**".
Be concise and helpful. Use markdown formatting.`;
}

function buildMessages(question, chunks, images, conversationHistory) {
  const contents = [];

  // Add conversation history (last 10 exchanges), excluding the current question
  if (conversationHistory && conversationHistory.length > 0) {
    let recent = conversationHistory.slice(-20); // 10 pairs = 20 messages
    // Remove the last user message as it's the current question
    if (recent.length > 0 && recent[recent.length - 1].role === 'user') {
      recent = recent.slice(0, -1);
    }
    for (const msg of recent) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user', // Gemini uses 'model' instead of 'assistant'
        parts: [{ text: msg.content }],
      });
    }
  }

  // Build current user message with context
  const currentParts = [];

  // Add document context if available
  if (chunks && chunks.length > 0) {
    const contextText = chunks
      .map((c, i) => `--- Chunk ${i + 1} (Page/Slide ${c.pageNum}) ---\n${c.text}`)
      .join('\n\n');
    
    currentParts.push({
      text: `DOCUMENT CONTEXT:\n${contextText}\n\n---\n\nUSER QUESTION: ${question}`,
    });
  } else {
    currentParts.push({
      text: question,
    });
  }

  // Add images if available (vision support)
  if (images && images.length > 0) {
    for (const img of images.slice(0, 5)) { // Max 5 images per request
      const base64Data = img.base64.replace(/^data:image\/\w+;base64,/, '');
      const mimeType = img.base64.match(/^data:(image\/\w+);/)?.[1] || 'image/jpeg';
      currentParts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      });
    }
  }

  contents.push({ role: 'user', parts: currentParts });

  return contents;
}

app.listen(PORT, () => {
  console.log(`\n  🧠 DocMind server running at http://localhost:${PORT}\n`);
});
