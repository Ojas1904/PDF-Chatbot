import streamlit as st
from ingest import load_and_chunk
from vectorstore import create_vectorstore
from rag import build_chain
import tempfile, os


def render_processing():
    pdf_name = st.session_state.get("pdf_name") or "document.pdf"

    st.markdown(f"""
    <style>
    .proc-overlay {{
        position: fixed; inset: 0;
        background: #0a0a0f;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        gap: 2rem; z-index: 9999;
        animation: fadeIn 0.4s ease;
    }}
    @keyframes fadeIn {{ from {{opacity:0}} to {{opacity:1}} }}
    .proc-filename {{
        font-family: 'DM Mono', monospace;
        font-size: 0.8rem; color: #555570;
        letter-spacing: 0.15em; text-transform: uppercase;
    }}
    .proc-title {{
        font-family: 'DM Serif Display', serif;
        font-size: 2rem; color: #e8e4dc; text-align: center;
    }}
    .proc-bar-track {{
        width: 260px; height: 2px;
        background: rgba(99,88,255,0.15);
        border-radius: 2px; overflow: hidden;
    }}
    .proc-bar-fill {{
        height: 100%;
        background: linear-gradient(90deg, #6358ff, #a09aff);
        border-radius: 2px;
        animation: loadBar 2.4s ease-in-out infinite;
        transform-origin: left;
    }}
    @keyframes loadBar {{
        0%   {{ transform: scaleX(0) translateX(0); }}
        50%  {{ transform: scaleX(0.7) translateX(30%); }}
        100% {{ transform: scaleX(0) translateX(260px); }}
    }}
    .proc-dots {{ display: flex; gap: 0.5rem; }}
    .proc-dot {{
        width: 6px; height: 6px; border-radius: 50%;
        background: #6358ff; animation: blink 1.2s ease-in-out infinite;
    }}
    .proc-dot:nth-child(2) {{ animation-delay: 0.2s; }}
    .proc-dot:nth-child(3) {{ animation-delay: 0.4s; }}
    @keyframes blink {{
        0%,100% {{ opacity:0.2; transform:scale(0.8); }}
        50%      {{ opacity:1;   transform:scale(1.2); }}
    }}
    .proc-status {{ font-size: 0.72rem; color: #444460; letter-spacing: 0.1em; }}
    .proc-error {{
        font-family: 'DM Mono', monospace; font-size: 0.78rem;
        color: #ff6b6b; max-width: 400px; text-align: center;
        line-height: 1.6; padding: 1rem 1.5rem;
        border: 1px solid rgba(255,107,107,0.3);
        border-radius: 10px; background: rgba(255,107,107,0.05);
    }}
    </style>
    <div class="proc-overlay">
        <div class="proc-filename">{pdf_name}</div>
        <div class="proc-title">Indexing your document</div>
        <div class="proc-bar-track"><div class="proc-bar-fill"></div></div>
        <div class="proc-dots">
            <div class="proc-dot"></div>
            <div class="proc-dot"></div>
            <div class="proc-dot"></div>
        </div>
        <div class="proc-status">CHUNKING &middot; EMBEDDING &middot; INDEXING</div>
    </div>
    """, unsafe_allow_html=True)

    try:
        tmp_path = os.path.join(tempfile.gettempdir(), "uploaded.pdf")
        chunks = load_and_chunk(tmp_path)
        vectorstore = create_vectorstore(chunks)
        chain       = build_chain(vectorstore)

        st.session_state.chain      = chain
        st.session_state.messages   = []
        st.session_state.thinking   = False
        st.session_state.processing = False
        st.rerun()

    except Exception as e:
        st.session_state.processing = False
        st.session_state.chain      = None
        st.markdown(f"""
        <div style="position:fixed;inset:0;background:#0a0a0f;display:flex;
             flex-direction:column;align-items:center;justify-content:center;gap:1.5rem;">
          <div style="font-family:'DM Serif Display',serif;font-size:1.8rem;color:#e8e4dc;">
            Something went wrong
          </div>
          <div class="proc-error">{str(e)[:300]}</div>
          <button onclick="window.location.reload()"
            style="font-family:'DM Mono',monospace;font-size:0.75rem;letter-spacing:0.1em;
                   color:#a09aff;padding:0.5rem 1.2rem;border:1px solid rgba(99,88,255,0.4);
                   border-radius:999px;cursor:pointer;background:transparent;text-transform:uppercase;">
            Try Again
          </button>
        </div>
        """, unsafe_allow_html=True)