from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from playwright.async_api import BrowserContext


@dataclass(frozen=True)
class StorageStatePaths:
    """
    Helper for storing WhatsApp Web session state.

    In practice, a persistent profile dir is more robust than storage_state.json,
    but this helper supports both approaches.
    """

    storage_state_path: Path


async def save_storage_state(context: BrowserContext, path: str | Path) -> Path:
    p = Path(path).expanduser().resolve()
    p.parent.mkdir(parents=True, exist_ok=True)
    await context.storage_state(path=str(p))
    return p


def storage_state_exists(path: str | Path) -> bool:
    return Path(path).expanduser().resolve().exists()


def touch_heartbeat(path: str | Path) -> None:
    """
    Update mtime so operators can see 'last used'.
    """
    p = Path(path).expanduser().resolve()
    if not p.exists():
        return
    now = time.time()
    p.utime((now, now))

