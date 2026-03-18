from __future__ import annotations

"""
WhatsApp session management helpers.

Preferred:
- Use a persistent profile directory (Chromium user_data_dir). This keeps WhatsApp logged-in long term.

Legacy:
- Use Playwright storage_state JSON.
"""

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class WhatsAppSessionConfig:
    profile_dir: Path | None = None
    storage_state_path: Path | None = None


def resolve_profile_dir(path: str | Path | None) -> Path | None:
    if not path:
        return None
    p = Path(path).expanduser().resolve()
    p.mkdir(parents=True, exist_ok=True)
    return p


def resolve_storage_state(path: str | Path | None) -> Path | None:
    if not path:
        return None
    return Path(path).expanduser().resolve()

