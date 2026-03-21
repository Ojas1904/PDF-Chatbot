import streamlit as st
from dotenv import load_dotenv
from styles.global_css import inject_global_css
from views.landing import render_landing
from views.processing import render_processing
from views.chat import render_chat

load_dotenv()

st.set_page_config(
    page_title="DocMind",
    page_icon="📄",
    layout="wide"
)

# ── Session state defaults ─────────────────────────────────────────────────────
defaults = {
    "chain":      None,
    "messages":   [],
    "pdf_name":   None,
    "pdf_b64":    None,
    "processing": False,
    "thinking":   False,
    "input_key":  0,
}
for key, val in defaults.items():
    if key not in st.session_state:
        st.session_state[key] = val

# ── Safety: if stuck in processing with no PDF file, reset ────────────────────
import tempfile, os
tmp_path = os.path.join(tempfile.gettempdir(), "uploaded.pdf")
if st.session_state.processing and not os.path.exists(tmp_path):
    st.session_state.processing = False
    st.session_state.chain      = None

# ── Global styles ──────────────────────────────────────────────────────────────
inject_global_css()

# ── Router ─────────────────────────────────────────────────────────────────────
if st.session_state.chain is not None:
    render_chat()

elif st.session_state.processing:
    render_processing()

else:
    render_landing()