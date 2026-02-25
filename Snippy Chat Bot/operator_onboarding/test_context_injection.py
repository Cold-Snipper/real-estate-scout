#!/usr/bin/env python3
"""
operator_onboarding/test_context_injection.py
Test provider context injection: load provider 1, build context, print prefix, generate one test message.
One-line test: cd operator_onboarding && python3 test_context_injection.py
"""
try:
    from .context_builder import get_provider_context
    from .db import init_db
except ImportError:
    from context_builder import get_provider_context
    from db import init_db

SAMPLE_LISTING = """
2-bed apartment, 65m², Luxembourg City. Owner selling, no agent.
Long-term tenant leaving; ideal for investors or first-time buyers.
Price: €450,000. Contact: owner@example.com
""".strip()


def main() -> None:
    init_db()
    provider_id = 1
    context = get_provider_context(provider_id)
    print("--- First 500 characters of get_provider_context(1) ---\n")
    print(context[:500])
    print("\n... [truncated]\n")

    print("--- Generating one test message (context + sample listing) ---\n")
    try:
        import ollama
    except ImportError:
        print("ollama not installed; skipping message generation. pip install ollama")
        return
    user_prompt = (
        "Write a short outreach message (2–3 sentences) to this listing owner, "
        "as the agency in your system context. Be friendly and value-focused.\n\n"
        f"Listing:\n{SAMPLE_LISTING}"
    )
    system_content = context + "\n\nWhen asked to write an outreach message, reply with the message text only (no JSON)."
    resp = ollama.chat(
        model="qwen3",
        messages=[
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_prompt},
        ],
    )
    reply = (resp.get("message") or {}).get("content", "")
    print(reply)


if __name__ == "__main__":
    main()
