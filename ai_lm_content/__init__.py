"""
ai_lm_content — Immo Snippy AI/LLM content (prompts, schemas).

This folder is a distinct, self-contained module. Content can be:
- Versioned in git (files in property_valuation_daily_rental/, etc.)
- Synced to/from a dedicated MongoDB database (push/pull) for deployment or backup.
"""

from .loader import get_prompt, get_schema_path, get_reference_context, push_to_db, pull_from_db

__all__ = [
    "get_prompt",
    "get_schema_path",
    "get_reference_context",
    "push_to_db",
    "pull_from_db",
]
