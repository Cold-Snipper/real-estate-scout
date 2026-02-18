import json
import re
import sys
import time
from pathlib import Path
from typing import Any, Dict, Optional

import ollama

# Immo Snippy Provider Context Injection Point
# When a private lead is found, load active_provider_id from config and pass it here.
_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))
try:
    from operator_onboarding.context_builder import get_provider_context
except ImportError:
    get_provider_context = None  # type: ignore[assignment]


def _extract_json(text: str) -> Optional[Dict[str, Any]]:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def _chat_json(
    prompt: str,
    model: str,
    retries: int = 2,
    system_content: Optional[str] = None,
) -> Dict[str, Any]:
    system_msg = system_content if system_content else "Return JSON only."
    last_error = None
    for _ in range(retries + 1):
        try:
            resp = ollama.chat(
                model=model,
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": prompt},
                ],
                format="json",
            )
            parsed = _extract_json(resp["message"]["content"])
            if parsed is not None:
                return parsed
        except Exception as exc:
            last_error = exc
        time.sleep(0.5)
    raise RuntimeError(f"LLM JSON parse failed: {last_error}")


def is_eligible(text: str, criteria: str, model: str = "qwen3") -> bool:
    prompt = (
        "You are a real estate qualifier.\n"
        f'Text: """{text}"""\n'
        f"Criteria: {criteria}\n"
        'Output JSON: {"eligible": true/false, "reason": "brief", "summary": "desc"}'
    )
    data = _chat_json(prompt, model=model)
    return bool(data.get("eligible", False))


def extract_contact(text: str, model: str = "qwen3") -> Dict[str, Optional[str]]:
    prompt = (
        f'Extract email/phone from: """{text}"""\n'
        'Output JSON: {"email": "str or null", "phone": "str or null"}'
    )
    data = _chat_json(prompt, model=model)
    return {"email": data.get("email"), "phone": data.get("phone")}


def generate_proposal(
    summary: str,
    model: str = "qwen3",
    from_identity: str = "Local licensed agent",
    provider_id: Optional[int] = None,
) -> Dict[str, str]:
    prompt = (
        "Write a short, polite email (150-220 words) proposing a real estate "
        "agency partnership.\n"
        f"From: {from_identity}\n"
        f"To: Owner of {summary}\n"
        "Key points: Compliment listing, offer help selling faster/higher price, "
        "no upfront fees, partnership benefits.\n"
        "Tone: friendly, professional, value-focused. Include call-to-action.\n"
        "Subject line first, then body.\n"
        'Output JSON: {"subject": "...", "body": "..."}'
    )
    system_content = None
    if provider_id is not None and get_provider_context is not None:
        try:
            provider_system = get_provider_context(provider_id)
            system_content = provider_system + "\n\nReturn JSON only."
        except Exception:
            pass
    data = _chat_json(prompt, model=model, system_content=system_content)
    return {"subject": data.get("subject", "Real Estate Partnership"), "body": data.get("body", "")}
