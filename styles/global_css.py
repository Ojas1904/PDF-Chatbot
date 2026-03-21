import streamlit as st

def inject_global_css():
    st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html, body, [data-testid="stAppViewContainer"], [data-testid="stApp"] {
        background: #0a0a0f !important;
        color: #e8e4dc !important;
        font-family: 'DM Mono', monospace !important;
    }

    #MainMenu, footer, header, [data-testid="stToolbar"],
    [data-testid="stDecoration"], [data-testid="stStatusWidget"] { display: none !important; }

    [data-testid="stAppViewContainer"] { padding: 0 !important; }
    [data-testid="block-container"] { padding: 0 !important; max-width: 100% !important; }
    section[data-testid="stSidebar"] { display: none !important; }

    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 2px; }

    [data-testid="stSpinner"] { display: none !important; }
    .stButton > button { all: unset; cursor: pointer; }
    </style>
    """, unsafe_allow_html=True)