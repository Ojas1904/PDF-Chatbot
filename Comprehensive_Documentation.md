# Comprehensive Documentation for DocMind

## Overview
DocMind is an advanced Retrieval-Augmented Generation (RAG) AI chatbot designed to analyze and interact with user-uploaded documents. It combines cutting-edge technologies to deliver fast, accurate, and context-aware responses. The system is built using Node.js and integrates the Google Gemini AI for natural language processing.

---

## Key Features

1. **Client-Side Document Parsing**:
   - Parses PDFs and PowerPoint files directly in the browser using `PDF.js` and `JSZip`.
   - Ensures user privacy by avoiding backend uploads.

2. **Hybrid Semantic Search**:
   - Combines TF-IDF exact phrase matching with Gemini's large context window. (NLPs and info retrieval to measure how imp the doc is in relative to collection of doc. TF-IDF means Term Frequency-Inverse Document Frequency. It is used to determine the importance of a word in a document. Rare words -> high IDF.)
   - Prevents hallucinations by focusing on ingested document content.

3. **Vision Extraction**:
   - Detects and extracts images/diagrams from documents.
   - Displays images in the Lightbox Gallery for user interaction.

4. **Real-Time Streaming**:
   - Uses Server-Sent Events (SSE) for instant, typewriter-style responses.

5. **Premium Aesthetics**:
   - Responsive UI with WebGL 3D backgrounds and frosted glassmorphism elements.
   - Light/Dark mode toggle with dynamic 3D renders.

---

## Architecture

### Frontend
- **Technologies**: Vanilla JavaScript (ES6), CSS, `PDF.js`, `Vanta.js`.
- **Files**:
  - `app.js`: Manages state and delegates document chunking.
  - `chunker.js`: Implements a lightweight text chunker and TF-IDF search engine.
  - `chat.js`: Handles conversation history and document queries.
  - `ui.js`: Manages the user interface.

### Backend
- **Technologies**: Node.js, Express, `@google/generative-ai` SDK.
- **Files**:
  - `server.js`: Manages API endpoints, SSE streaming, and Gemini AI integration.

---

## How It Works

1. **Document Upload**:
   - Users upload PDFs or PowerPoints.
   - Files are parsed and indexed locally in the browser.

2. **Semantic Search**:
   - Text chunks and images are extracted and indexed.
   - TF-IDF and Gemini AI are used to retrieve relevant content.

3. **Chat Interaction**:
   - Users ask questions about the document.
   - The chatbot streams responses in real-time, citing document pages/slides when applicable.

4. **Vision Support**:
   - Images are analyzed alongside text for comprehensive answers.

---

## Installation Guide

### Prerequisites
- Node.js (v18+)
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/docmind-ai.git
   cd docmind-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the root directory:
     ```env
     GEMINI_API_KEY=your_google_gemini_api_key
     PORT=3000
     ```

4. Start the server:
   ```bash
   node server.js
   ```

5. Open `http://localhost:3000` in your browser.

---

## API Endpoints

### Health Check
- **Endpoint**: `/api/health`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "status": "ok",
    "model": "gemini-2.5-flash",
    "apiKeyConfigured": true
  }
  ```

### Chat
- **Endpoint**: `/api/chat`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "question": "What is the summary of the document?",
    "chunks": [
      { "text": "Document content here", "pageNum": 1 }
    ],
    "images": [],
    "conversationHistory": [],
    "isDocumentQuery": true
  }
  ```
- **Response**: Streams chatbot responses in real-time.

---

## Rules for Chatbot Responses

1. **Document-Based Answers**:
   - Cite pages/slides using `[Page X]` or `[Slide X]`.
   - Start responses with `📚 **From document**`.

2. **General Knowledge Answers**:
   - Start responses with `🌐 **From general knowledge**`.

3. **Formatting**:
   - Use Markdown for clarity.

4. **Multi-Turn Conversations**:
   - Reference previous context when relevant.

---

## Troubleshooting

### Common Issues
1. **API Key Not Set**:
   - Ensure `GEMINI_API_KEY` is correctly configured in `.env`.

2. **Server Not Starting**:
   - Check Node.js version (v18+ required).

3. **No Responses from Chatbot**:
   - Verify document chunks and question are included in the request body.

---

## License
This project is licensed under the MIT License.