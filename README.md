# DocMind — AI Document Agent

**DocMind** is a high-performance, real-time AI document analysis agent. Built with a modern, glassmorphic UI, client-side indexing, and powered by Google's **Gemini 2.5 Flash**, it allows users to chat with their complex PDF and PowerPoint documents with sub-second latency. No proprietary paid API keys required.

## Features

- **Blazing Fast Client-Side RAG**: Parses and indexes PDFs (`PDF.js`) and PowerPoints (`JSZip`) directly inside the browser. This eliminates costly backend uploads, maintaining absolute user privacy while significantly reducing server load.
- **Hybrid Semantic Search engine**: Seamlessly combines TF-IDF exact phrase matching with Gemini's massive 1M token context window. The agent never hallucinates uningested documents because of intelligent contextual bootstrapping.
- **Vision Extraction**: Automatically detects, extracts, and catalogues images/diagrams from documents, pushing them to the AI agent and the UI's Lightbox Gallery simultaneously.
- **Premium Aesthetics**: Features a fully responsive, dark-mode first UI using custom WebGL 3D backgrounds (`Vanta.js`), frosted glassmorphism elements, CSS-only animations, and seamless routing transitions.
- **Light/Dark Mode Toggle**: Toggle between aesthetic setups seamlessly with dynamically updating 3D renders.
- **Real-Time Streaming**: Built on Node.js/Express Native Server-Sent Events (SSE) for instant, typewriter-style intelligence drops directly from Gemini.

## Tech Stack

- **Frontend**: Vanilla Javascript (ES6 Modules), Custom CSS Variables (No frameworks), PDF.js, Vanta.js WebGL, Spline.
- **Backend**: Node.js, Express, `@google/generative-ai` SDK.

## Getting Started

### Prerequisites

- Node.js (v18+)
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey) (Free Tier compatible)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/docmind-ai.git
   cd docmind-ai
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Setup environment variables
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key
   PORT=3000
   ```

4. Start the server
   ```bash
   node server.js
   ```

5. Open `http://localhost:3000` in your browser.

## Architecture Highlights

DocMind abandons heavy monolithic architectures like Streamlit or Langchain in favor of a lightning-fast custom JS implementation:

1. **`app.js`**: The central controller mapping state and delegating document chunking.
2. **`chunker.js`**: A custom, lightweight Text-Chunker and TF-IDF search engine.
3. **`chat.js`**: Manages sliding-window conversation history arrays mapping directly to active documents.
4. **`server.js`**: A lightweight SSE Proxy resolving browser CORS and hiding the active API key.

## License

MIT License
