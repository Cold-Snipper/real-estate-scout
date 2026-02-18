#!/usr/bin/env python3
"""
operator_onboarding/dashboard.py
Streamlit dashboard: list operators, context preview, Test Message Generation with sample text.
Run from repo root: streamlit run operator_onboarding/dashboard.py
Or from operator_onboarding: streamlit run dashboard.py
"""
import streamlit as st

try:
    from .db import init_db
    from .operators import get_all_operators, get_operator
    from .context_builder import get_provider_context
except ImportError:
    from db import init_db
    from operators import get_all_operators, get_operator
    from context_builder import get_provider_context

PREVIEW_CHARS = 800
SAMPLE_LISTING = """
2-bed apartment, 65m², Luxembourg City. Owner selling, no agent.
Long-term tenant leaving; ideal for investors or first-time buyers.
Price: €450,000. Contact: owner@example.com
""".strip()


def run_test_message(operator_id: int, sample_text: str) -> str:
    try:
        import ollama
    except ImportError:
        return "[Error: ollama not installed. pip install ollama]"
    context = get_provider_context(operator_id)
    user_prompt = (
        "Write a short outreach message (2–3 sentences) to this listing owner, "
        "as the agency in your system context. Be friendly and value-focused.\n\n"
        f"Listing:\n{sample_text}"
    )
    system_content = context + "\n\nWhen asked to write an outreach message, reply with the message text only (no JSON)."
    try:
        resp = ollama.chat(
            model="qwen3",
            messages=[
                {"role": "system", "content": system_content},
                {"role": "user", "content": user_prompt},
            ],
        )
        return (resp.get("message") or {}).get("content", "") or "[Empty reply]"
    except Exception as e:
        return f"[Error: {e}]"


def main() -> None:
    st.set_page_config(page_title="Operator Onboarding", page_icon="🏠", layout="wide")
    st.title("Operator Onboarding — Context & Test")
    init_db()
    operators = get_all_operators()
    if not operators:
        st.warning("No operators yet. Add one via the UI or: `python manage_providers.py add`")
        return

    # Operator selector
    options = [f"{o['id']}: {o.get('company_name', '')}" for o in operators]
    selected = st.sidebar.selectbox("Operator", options, index=0)
    operator_id = int(selected.split(":")[0].strip())
    operator = get_operator(operator_id)
    if not operator:
        st.error(f"Operator {operator_id} not found.")
        return

    st.sidebar.markdown("---")
    st.sidebar.caption(f"DB: operators + documents → get_provider_context({operator_id})")

    # Operator details
    with st.expander("Operator details", expanded=False):
        st.json({k: v for k, v in operator.items() if k != "rules"})
        if operator.get("rules"):
            st.text_area("Rules", "\n".join(operator["rules"]), height=120, disabled=True)

    # Context preview
    st.subheader("Context preview")
    context = get_provider_context(operator_id)
    preview = context[:PREVIEW_CHARS] + ("..." if len(context) > PREVIEW_CHARS else "")
    st.text_area("get_provider_context (first {} chars)".format(PREVIEW_CHARS), preview, height=220, disabled=True)
    st.caption(f"Total length: {len(context)} chars")

    # Test message generation
    st.subheader("Test message generation")
    sample_text = st.text_area("Sample listing text", value=SAMPLE_LISTING, height=100, key="sample_listing")
    if st.button("Test Message Generation"):
        with st.spinner("Calling Ollama (qwen3)…"):
            reply = run_test_message(operator_id, sample_text or SAMPLE_LISTING)
        st.text_area("Generated message", reply, height=180, disabled=True)


if __name__ == "__main__":
    main()
