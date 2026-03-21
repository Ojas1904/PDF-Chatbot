import streamlit as st
import base64
import tempfile, os


def render_landing():
    st.markdown("""
    <style>
    @keyframes drift {
        from { transform: translate(0,0) scale(1); }
        to   { transform: translate(4%,3%) scale(1.05); }
    }
    @keyframes fadeUp {
        from { opacity:0; transform: translateY(18px); }
        to   { opacity:1; transform: translateY(0); }
    }
    .glow-1 {
        position: fixed; top:-30%; left:-20%;
        width:60vw; height:60vw;
        background: radial-gradient(ellipse, rgba(99,88,255,0.12) 0%, transparent 70%);
        pointer-events: none;
        animation: drift 12s ease-in-out infinite alternate;
        z-index: 0;
    }
    .glow-2 {
        position: fixed; bottom:-20%; right:-10%;
        width:50vw; height:50vw;
        background: radial-gradient(ellipse, rgba(255,160,80,0.08) 0%, transparent 70%);
        pointer-events: none;
        animation: drift 16s ease-in-out infinite alternate-reverse;
        z-index: 0;
    }
    .landing-top {
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        padding: 5vh 2rem 2rem;
        text-align: center;
        position: relative; z-index: 1;
    }
    .logo-mark {
        font-family: 'DM Serif Display', serif;
        font-size: clamp(3rem,8vw,5.5rem);
        color: #e8e4dc;
        letter-spacing: -0.02em;
        line-height: 1;
        margin-bottom: 0.6rem;
        animation: fadeUp 0.8s ease both;
    }
    .logo-mark span { color: #6358ff; font-style: italic; }
    .tagline {
        font-family: 'DM Mono', monospace;
        font-size: 0.82rem;
        color: #555570;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        animation: fadeUp 0.8s 0.15s ease both;
        margin-bottom: 0;
    }
    [data-testid="stFileUploader"] {
        width: min(460px, 90vw) !important;
        margin: 0 auto !important;
        position: relative; z-index: 1;
        animation: fadeUp 0.8s 0.3s ease both;
    }
    [data-testid="stFileUploaderDropzone"] {
        background: rgba(99,88,255,0.04) !important;
        border: 1px dashed rgba(99,88,255,0.4) !important;
        border-radius: 14px !important;
        padding: 2rem 1.5rem !important;
        transition: all 0.25s ease !important;
    }
    [data-testid="stFileUploaderDropzone"]:hover {
        background: rgba(99,88,255,0.09) !important;
        border-color: rgba(99,88,255,0.7) !important;
    }
    [data-testid="stFileUploaderDropzone"] span,
    [data-testid="stFileUploaderDropzone"] p,
    [data-testid="stFileUploaderDropzone"] small {
        color: #555570 !important;
        font-family: 'DM Mono', monospace !important;
        font-size: 0.78rem !important;
        letter-spacing: 0.08em !important;
    }
    [data-testid="stFileUploaderDropzone"] button {
        background: rgba(99,88,255,0.15) !important;
        border: 1px solid rgba(99,88,255,0.45) !important;
        color: #a09aff !important;
        border-radius: 8px !important;
        font-family: 'DM Mono', monospace !important;
        font-size: 0.75rem !important;
        padding: 0.4rem 1.1rem !important;
    }
    [data-testid="stFileUploaderDropzone"] button:hover {
        background: rgba(99,88,255,0.28) !important;
    }
    .landing-bottom {
        display: flex; flex-direction: column;
        align-items: center;
        padding: 2rem 2rem 4rem;
        position: relative; z-index: 1;
    }
    .features {
        display: flex; gap: 2rem;
        flex-wrap: wrap; justify-content: center;
        animation: fadeUp 0.8s 0.45s ease both;
    }
    .feature-pill {
        font-size: 0.7rem; letter-spacing: 0.12em;
        color: #444460;
        display: flex; align-items: center; gap: 0.5rem;
    }
    .feature-dot {
        width: 4px; height: 4px; border-radius: 50%;
        background: #6358ff; opacity: 0.7;
    }
    [data-testid="stAppViewContainer"] {
        display: flex !important;
        flex-direction: column !important;
        min-height: 100vh !important;
        justify-content: center !important;
    }
    [data-testid="block-container"] {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 1.5rem !important;
        padding: 0 !important;
        max-width: 100% !important;
    }
    </style>
    <div class="glow-1"></div>
    <div class="glow-2"></div>
    <div class="landing-top">
        <div class="logo-mark">Doc<span>Mind</span></div>
        <div class="tagline">Intelligent PDF Conversations</div>
    </div>
    """, unsafe_allow_html=True)

    # File uploader renders between title and features
    uploaded_file = st.file_uploader("Upload PDF", type="pdf", key="uploader_landing", label_visibility="collapsed")

    st.markdown("""
    <div class="landing-bottom">
        <div class="features">
            <div class="feature-pill"><div class="feature-dot"></div>SEMANTIC SEARCH</div>
            <div class="feature-pill"><div class="feature-dot"></div>RAG PIPELINE</div>
            <div class="feature-pill"><div class="feature-dot"></div>GEMINI 2.5</div>
            <div class="feature-pill"><div class="feature-dot"></div>INSTANT ANSWERS</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    if uploaded_file:
        st.session_state.processing = True
        st.session_state.pdf_name = uploaded_file.name
        pdf_bytes = uploaded_file.read()
        st.session_state.pdf_b64 = base64.b64encode(pdf_bytes).decode()
        tmp_path = os.path.join(tempfile.gettempdir(), "uploaded.pdf")
        with open(tmp_path, "wb") as f:
            f.write(pdf_bytes)
        st.rerun()