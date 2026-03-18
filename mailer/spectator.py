from __future__ import annotations

import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from playwright.async_api import Page

from .live_feed import emit as emit_feed


def _utc_ts() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def spectator_dir() -> Path:
    p = _repo_root() / "data" / "mailer_spectator"
    p.mkdir(parents=True, exist_ok=True)
    return p


def latest_meta_path() -> Path:
    return spectator_dir() / "latest.json"


def _stamp() -> str:
    return time.strftime("%Y%m%d-%H%M%S")


def _safe(s: str) -> str:
    return "".join(ch if ch.isalnum() or ch in ("-", "_", ".") else "_" for ch in (s or ""))[:80]


@dataclass(frozen=True)
class SpectatorSnapshot:
    ts: str
    filename: str
    url_path: str
    channel: str
    label: str
    property_id: int | None
    page_url: str | None

    def to_dict(self) -> dict[str, Any]:
        return {
            "ts": self.ts,
            "filename": self.filename,
            "url_path": self.url_path,
            "channel": self.channel,
            "label": self.label,
            "property_id": self.property_id,
            "page_url": self.page_url,
        }


async def capture(
    page: Page,
    *,
    channel: str,
    label: str,
    property_id: int | None = None,
    max_keep: int = 200,
) -> SpectatorSnapshot | None:
    """
    Capture a screenshot of the current page and mark it as the latest spectator frame.

    Also emits a live-feed event with `data.spectator_url` so the UI can update instantly.
    """
    try:
        ts = _utc_ts()
        fname = f"{_stamp()}_{_safe(channel)}_{_safe(label)}"
        if property_id is not None:
            fname += f"_pid{int(property_id)}"
        fname += ".png"
        out_path = spectator_dir() / fname
        await page.screenshot(path=str(out_path), full_page=True)

        snap = SpectatorSnapshot(
            ts=ts,
            filename=fname,
            url_path=f"/api/mailer/spectator/image/{fname}",
            channel=channel,
            label=label,
            property_id=property_id,
            page_url=page.url if hasattr(page, "url") else None,
        )
        latest_meta_path().write_text(json.dumps(snap.to_dict(), indent=2, ensure_ascii=False))

        # Best-effort cleanup
        try:
            files = sorted(spectator_dir().glob("*.png"), key=lambda p: p.stat().st_mtime, reverse=True)
            for f in files[max_keep:]:
                try:
                    f.unlink()
                except Exception:
                    pass
        except Exception:
            pass

        emit_feed(
            channel if channel in ("system", "mailer", "athome", "immotop", "whatsapp", "scraper") else "system",
            f"Spectator snapshot: {label}",
            level="debug",
            spectator_url=snap.url_path,
            spectator_label=label,
            spectator_ts=ts,
            property_id=property_id,
            page_url=snap.page_url,
        )
        return snap
    except Exception as e:
        emit_feed("system", f"Spectator capture failed: {e}", level="warn")
        return None


def read_latest() -> dict[str, Any] | None:
    p = latest_meta_path()
    if not p.exists():
        return None
    try:
        raw = json.loads(p.read_text())
        return raw if isinstance(raw, dict) else None
    except Exception:
        return None

