from __future__ import annotations

import os
import concurrent.futures
from dataclasses import dataclass


@dataclass(frozen=True)
class DraftedMessage:
    subject: str
    body: str


def _fallback_message(listing_text: str) -> DraftedMessage:
    text = (listing_text or "").strip()
    subject = "Inquiry about your listing"
    body = (
        "Hi,\n\n"
        "I’m interested in your listing and would like to discuss next steps. "
        "Could you share availability for a quick call or viewing?\n\n"
        "Thanks."
    )
    if text:
        body = f"Hi,\n\nI’m interested in this listing:\n{text}\n\nCould you share availability for a quick call or viewing?\n\nThanks."
    return DraftedMessage(subject=subject, body=body)


def draft_contact_message(listing_text: str, operator_id: int, model: str | None = None) -> DraftedMessage:
    """
    Generate a personalized outreach message using existing chatbot logic.

    In this repo, the single source of truth is `bot.llm.generate_proposal`, which already
    injects `operator_onboarding.context_builder.get_provider_context(operator_id)` as the
    system prompt when provider_id is provided.
    """
    if (os.getenv("MAILER_LLM_MODE") or "").strip().lower() in {"off", "disabled", "0", "false"}:
        return _fallback_message(listing_text)

    try:
        from bot.llm import generate_proposal
    except Exception as e:
        # No LLM available; fall back.
        return _fallback_message(listing_text)

    used_model = model or "qwen3"
    # Protect against a blocking ollama call by running in a thread with timeout.
    timeout_s = float(os.getenv("MAILER_LLM_TIMEOUT_S") or 8.0)
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
            fut = ex.submit(generate_proposal, listing_text, used_model, "Local licensed agent", operator_id)
            out = fut.result(timeout=timeout_s)
    except Exception:
        return _fallback_message(listing_text)

    subject = (out.get("subject") or "").strip() or "Inquiry about your listing"
    body = (out.get("body") or "").strip()
    if not body:
        return _fallback_message(listing_text)
    return DraftedMessage(subject=subject, body=body)

