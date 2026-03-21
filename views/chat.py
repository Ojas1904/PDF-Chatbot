import streamlit as st
from rag import ask


def _handle_submit():
    """Called by Streamlit on_change when user presses Enter."""
    key = f"q_{st.session_state.input_key}"
    val = st.session_state.get(key, "").strip()
    if val:
        st.session_state.messages.append({"role": "user", "content": val})
        st.session_state.thinking = True
        st.session_state.input_key += 1


def render_chat():
    pdf_name = st.session_state.pdf_name or "document.pdf"
    pdf_b64  = st.session_state.pdf_b64  or ""
    messages = st.session_state.messages

    st.markdown(f"""
    <style>
    @keyframes msgIn {{
        from {{ opacity:0; transform: translateY(8px); }}
        to   {{ opacity:1; transform: translateY(0); }}
    }}
    @keyframes blink {{
        0%,100% {{ opacity:0.2; transform:scale(0.8); }}
        50%      {{ opacity:1;   transform:scale(1.2); }}
    }}
    .top-bar {{
        display: flex; align-items: center; justify-content: space-between;
        padding: 0.85rem 2rem;
        border-bottom: 1px solid rgba(255,255,255,0.05);
        background: rgba(10,10,15,0.98);
        position: sticky; top: 0; z-index: 100;
    }}
    .top-brand {{ font-family: 'DM Serif Display', serif; font-size: 1.35rem; color: #e8e4dc; letter-spacing: -0.01em; }}
    .top-brand span {{ color: #6358ff; font-style: italic; }}
    .pdf-chip {{
        display: flex; align-items: center; gap: 0.55rem; padding: 0.4rem 0.95rem;
        background: rgba(99,88,255,0.08); border: 1px solid rgba(99,88,255,0.25);
        border-radius: 999px; text-decoration: none; transition: all 0.2s;
    }}
    .pdf-chip:hover {{ background: rgba(99,88,255,0.16); border-color: rgba(99,88,255,0.5); }}
    .pdf-chip-name {{
        font-family: 'DM Mono', monospace; font-size: 0.74rem; color: #a09aff;
        max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }}
    .pdf-chip-dl {{ font-size: 0.68rem; color: #555570; }}
    .new-btn {{
        font-family: 'DM Mono', monospace; font-size: 0.7rem; letter-spacing: 0.1em;
        color: #555570; padding: 0.4rem 0.95rem;
        border: 1px solid rgba(255,255,255,0.07); border-radius: 999px;
        cursor: pointer; background: transparent; transition: all 0.2s; text-transform: uppercase;
    }}
    .new-btn:hover {{ color: #e8e4dc; border-color: rgba(255,255,255,0.2); }}
    .msg-row {{
        display: flex; padding: 0.5rem 2rem; gap: 1rem;
        max-width: 820px; width: 100%; margin: 0 auto; animation: msgIn 0.3s ease both;
    }}
    .msg-row-user {{
        display: flex; justify-content: flex-end; padding: 0.5rem 2rem;
        max-width: 820px; width: 100%; margin: 0 auto;
        animation: msgIn 0.3s cubic-bezier(0.22,1,0.36,1) both;
    }}
    .msg-bubble-user {{
        background: #6358ff; color: #fff; font-family: 'DM Mono', monospace;
        font-size: 0.88rem; line-height: 1.65; padding: 0.65rem 1.1rem;
        border-radius: 18px 18px 4px 18px; max-width: 72%; word-break: break-word;
    }}
    .msg-avatar {{
        width: 28px; height: 28px; border-radius: 6px; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center; font-size: 0.7rem; margin-top: 3px;
        background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #555570;
    }}
    .msg-content {{ flex: 1; }}
    .msg-sender {{ font-size: 0.63rem; letter-spacing: 0.12em; text-transform: uppercase; color: #444460; margin-bottom: 0.3rem; }}
    .msg-text {{ font-size: 0.9rem; line-height: 1.78; color: #c8c4bc; }}
    .thinking-row {{
        display: flex; padding: 0.5rem 2rem; gap: 1rem;
        max-width: 820px; width: 100%; margin: 0 auto; animation: msgIn 0.3s ease both;
    }}
    .thinking-dots {{ display: flex; gap: 4px; align-items: center; padding-top: 6px; }}
    .t-dot {{ width: 5px; height: 5px; border-radius: 50%; background: #555570; animation: blink 1.2s ease-in-out infinite; }}
    .t-dot:nth-child(2) {{ animation-delay: 0.2s; }}
    .t-dot:nth-child(3) {{ animation-delay: 0.4s; }}
    .empty-state {{
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; gap: 1.2rem; padding: 5rem 2rem; text-align: center;
    }}
    .empty-icon {{ font-size: 2.2rem; opacity: 0.15; }}
    .empty-title {{ font-family: 'DM Serif Display', serif; font-size: 1.5rem; color: #e8e4dc; opacity: 0.25; }}
    .empty-hint {{ font-size: 0.7rem; color: #2a2a40; letter-spacing: 0.1em; }}
    .sug-chips {{ display: flex; flex-wrap: wrap; gap: 0.6rem; justify-content: center; }}
    .sug-chip {{
        font-size: 0.74rem; padding: 0.4rem 0.9rem;
        border: 1px solid rgba(255,255,255,0.08); border-radius: 999px; color: #555570;
        cursor: pointer; transition: all 0.2s; background: transparent; font-family: 'DM Mono', monospace;
    }}
    .sug-chip:hover {{ border-color: rgba(99,88,255,0.4); color: #a09aff; background: rgba(99,88,255,0.06); }}
    [data-testid="stTextInput"] {{
        display: block !important; position: fixed !important;
        bottom: 0 !important; left: 0 !important; right: 0 !important;
        padding: 0.85rem 2rem 1.1rem !important;
        background: rgba(10,10,15,0.97) !important;
        border-top: 1px solid rgba(255,255,255,0.05) !important;
        z-index: 200 !important; margin: 0 !important; backdrop-filter: blur(12px) !important;
    }}
    [data-testid="stTextInput"] label {{ display: none !important; }}
    [data-testid="stTextInput"] > div {{ max-width: 820px !important; margin: 0 auto !important; }}
    [data-testid="stTextInput"] input {{
        background: rgba(255,255,255,0.03) !important;
        border: 1px solid rgba(255,255,255,0.09) !important; border-radius: 14px !important;
        color: #e8e4dc !important; font-family: 'DM Mono', monospace !important;
        font-size: 0.88rem !important; padding: 0.75rem 1.2rem !important;
        caret-color: #6358ff !important; box-shadow: none !important; height: auto !important;
        transition: border-color 0.2s !important;
    }}
    [data-testid="stTextInput"] input:focus {{
        border-color: rgba(99,88,255,0.55) !important;
        background: rgba(99,88,255,0.03) !important; box-shadow: none !important; outline: none !important;
    }}
    [data-testid="stTextInput"] input::placeholder {{ color: #2e2e48 !important; }}
    .bottom-spacer {{ height: 80px; }}
    </style>

    <div class="top-bar">
      <div class="top-brand">Doc<span>Mind</span></div>
      <a class="pdf-chip" href="data:application/pdf;base64,{pdf_b64}" download="{pdf_name}">
        <span>&#128196;</span>
        <span class="pdf-chip-name">{pdf_name}</span>
        <span class="pdf-chip-dl">&#8595;</span>
      </a>
      <button class="new-btn" onclick="window.location.reload()">New PDF</button>
    </div>
    """, unsafe_allow_html=True)

    # ── Messages ────────────────────────────────────────────────────────────────
    if not messages:
        st.markdown("""
        <div class="empty-state">
          <div class="empty-icon">&#128172;</div>
          <div class="empty-title">Ask anything about your document</div>
          <div class="empty-hint">TRY ONE OF THESE TO GET STARTED</div>
          <div class="sug-chips">
            <div class="sug-chip" onclick="chipSend(this)">Summarise this document</div>
            <div class="sug-chip" onclick="chipSend(this)">What are the key points?</div>
            <div class="sug-chip" onclick="chipSend(this)">List the main topics</div>
            <div class="sug-chip" onclick="chipSend(this)">What conclusions are drawn?</div>
          </div>
        </div>
        <script>
        function chipSend(el) {
            var val = el.innerText.trim();
            var inp = window.parent.document.querySelector('[data-testid="stTextInput"] input');
            if (!inp) return;
            var setter = Object.getOwnPropertyDescriptor(window.parent.HTMLInputElement.prototype, 'value').set;
            setter.call(inp, val);
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            setTimeout(function() {
                inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
                inp.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', keyCode: 13, bubbles: true }));
                inp.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, bubbles: true }));
            }, 80);
        }
        </script>
        """, unsafe_allow_html=True)
    else:
        for msg in messages:
            text = msg["content"].replace("\n", "<br>")
            if msg["role"] == "user":
                st.markdown(
                    f'<div class="msg-row-user"><div class="msg-bubble-user">{text}</div></div>',
                    unsafe_allow_html=True
                )
            else:
                st.markdown(f"""
                <div class="msg-row">
                  <div class="msg-avatar">AI</div>
                  <div class="msg-content">
                    <div class="msg-sender">DocMind</div>
                    <div class="msg-text">{text}</div>
                  </div>
                </div>""", unsafe_allow_html=True)

        if st.session_state.get("thinking"):
            st.markdown("""
            <div class="thinking-row">
              <div class="msg-avatar">AI</div>
              <div class="msg-content">
                <div class="msg-sender">DocMind</div>
                <div class="thinking-dots">
                  <div class="t-dot"></div><div class="t-dot"></div><div class="t-dot"></div>
                </div>
              </div>
            </div>""", unsafe_allow_html=True)

    st.markdown('<div class="bottom-spacer"></div>', unsafe_allow_html=True)

    # ── Streamlit native input — Enter key triggers on_change ───────────────────
    st.text_input(
        "q",
        key=f"q_{st.session_state.input_key}",
        placeholder="Ask a question about your document…  (press Enter to send)",
        label_visibility="collapsed",
        on_change=_handle_submit
    )

    # ── Scroll to bottom after render ────────────────────────────────────────────
    st.markdown("""
    <script>
    (function() {
        var attempts = 0;
        var t = setInterval(function() {
            var el = window.parent.document.querySelector('[data-testid="stAppViewContainer"]');
            if (el) { el.scrollTop = el.scrollHeight; clearInterval(t); }
            if (++attempts > 20) clearInterval(t);
        }, 80);
    })();
    </script>
    """, unsafe_allow_html=True)

    # ── Fetch answer when thinking ───────────────────────────────────────────────
    if st.session_state.get("thinking") and messages and messages[-1]["role"] == "user":
        with st.spinner(""):
            answer, _ = ask(st.session_state.chain, messages[-1]["content"])
        st.session_state.messages.append({"role": "assistant", "content": answer})
        st.session_state.thinking = False
        st.rerun()