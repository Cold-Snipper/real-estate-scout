"""
Immo Snippy — Plug for the LLM that values properties (daily rental viability).
Not implemented by default: set RUN_VALUATION_LLM to a callable or install bot.llm (Ollama) to enable.
"""
from __future__ import annotations

from typing import Any, Callable

# Optional: (user_prompt, model, system_content) -> dict. Set to bot.llm._chat_json when available.
RUN_VALUATION_LLM: Callable[[str, str, str], dict[str, Any]] | None = None


def _default_llm(user_prompt: str, model: str, system_content: str) -> dict[str, Any]:
    try:
        from bot.llm import _chat_json
        return _chat_json(user_prompt, model=model, system_content=system_content)
    except ImportError:
        return {}


def run_valuation(
    system_prompt: str,
    user_prompt: str,
    model: str = "qwen3",
) -> dict[str, Any]:
    """
    Run the property valuation LLM with the given system and user prompts.
    Uses RUN_VALUATION_LLM if set, else bot.llm._chat_json if available, else returns stub.
    """
    fn = RUN_VALUATION_LLM or _default_llm
    try:
        out = fn(user_prompt, model, system_prompt)
        if isinstance(out, dict) and out:
            return out
    except Exception:
        pass
    return {
        "property_valuation_score": 0,
        "recommendation": "Avoid",
        "estimated_annual_gross_revenue": "N/A",
        "price_to_earnings_ratio": "N/A",
        "cap_rate": "N/A",
        "key_strengths": [],
        "key_risks": [
            "LLM valuation not implemented; plug in bot.llm or set RUN_VALUATION_LLM.",
            "No market scoring applied.",
        ],
        "suggested_management_fee": "N/A",
        "reasoning": "Valuation LLM not available. Install ollama and bot.llm, or set lib.llm_valuation_plug.RUN_VALUATION_LLM to your (user_prompt, model, system_content) -> dict callable.",
    }
