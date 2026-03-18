from __future__ import annotations

import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, TypedDict

from .browser import BrowserSettings, launch_browser

IntegrationType = Literal["whatsapp", "athome", "immotop"]


class IntegrationResult(TypedDict):
    success: bool
    message: str
    timestamp: str
    url: str
    title: str


@dataclass(frozen=True)
class IntegrationTestConfig:
    timeout_ms: int = 20000


def _utc_ts() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _status_path() -> Path:
    # Stored under repo data/ so it survives restarts but stays local.
    repo_root = Path(__file__).resolve().parent.parent
    return repo_root / "data" / "mailer_integration_status.json"


def load_integration_status() -> dict[str, IntegrationResult]:
    p = _status_path()
    if not p.exists():
        return {}
    try:
        raw = json.loads(p.read_text())
        if isinstance(raw, dict):
            return raw  # type: ignore[return-value]
        return {}
    except Exception:
        return {}


def save_integration_status(status: dict[str, IntegrationResult]) -> None:
    p = _status_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(status, indent=2, ensure_ascii=False))


def _default_url(test_type: IntegrationType, cfg: IntegrationTestConfig) -> str:
    if test_type == "whatsapp":
        return "https://web.whatsapp.com/"
    if test_type == "athome":
        return "https://www.athome.lu/"
    if test_type == "immotop":
        return "https://www.immotop.lu/"
    raise ValueError(f"Unsupported integration test type: {test_type}")


async def run_integration_test(
    test_type: IntegrationType,
    *,
    timeout_ms: int = 20000,
) -> IntegrationResult:
    cfg = IntegrationTestConfig(timeout_ms=int(timeout_ms))
    url = _default_url(test_type, cfg)

    settings = BrowserSettings(headless=False)
    async for _browser, _ctx, page in launch_browser(settings):
        try:
            resp = await page.goto(url, wait_until="domcontentloaded", timeout=cfg.timeout_ms)
            await page.wait_for_timeout(500)
            title = (await page.title()) or ""

            ok_resp = bool(resp and 200 <= (resp.status or 0) < 500)

            # Type-specific checks (best-effort and intentionally lightweight).
            if test_type == "whatsapp":
                body = (await page.inner_text("body"))[:4000]
                if "Browser not supported" in body:
                    return {
                        "success": False,
                        "message": "WhatsApp Web loaded, but shows 'Browser not supported'.",
                        "timestamp": _utc_ts(),
                        "url": url,
                        "title": title,
                    }
                if not ok_resp:
                    return {
                        "success": False,
                        "message": f"WhatsApp Web HTTP status: {resp.status if resp else 'no response'}",
                        "timestamp": _utc_ts(),
                        "url": url,
                        "title": title,
                    }
                return {
                    "success": True,
                    "message": "WhatsApp Web loaded.",
                    "timestamp": _utc_ts(),
                    "url": url,
                    "title": title,
                }

            if test_type == "athome":
                if not ok_resp:
                    return {
                        "success": False,
                        "message": f"atHome HTTP status: {resp.status if resp else 'no response'}",
                        "timestamp": _utc_ts(),
                        "url": url,
                        "title": title,
                    }
                if title.strip() and ("athome" in title.lower() or "at home" in title.lower()):
                    return {
                        "success": True,
                        "message": "atHome loaded.",
                        "timestamp": _utc_ts(),
                        "url": url,
                        "title": title,
                    }

                # Some deployments may return an empty/neutral title due to JS timing or consent overlays.
                # Accept success if the page body looks like atHome and is not an error page.
                body = (await page.inner_text("body"))[:6000].lower()
                if "athome" in body or "immobilier" in body or "logement" in body:
                    return {
                        "success": True,
                        "message": "atHome loaded (verified via page content).",
                        "timestamp": _utc_ts(),
                        "url": url,
                        "title": title,
                    }
                return {
                    "success": False,
                    "message": f"Unexpected page title/content: {title or '(empty)'}",
                    "timestamp": _utc_ts(),
                    "url": url,
                    "title": title,
                }

            if test_type == "immotop":
                if not ok_resp:
                    return {
                        "success": False,
                        "message": f"Immootop HTTP status: {resp.status if resp else 'no response'}",
                        "timestamp": _utc_ts(),
                        "url": url,
                        "title": title,
                    }
                if "immotop" not in title.lower():
                    return {
                        "success": False,
                        "message": f"Unexpected page title: {title or '(empty)'}",
                        "timestamp": _utc_ts(),
                        "url": url,
                        "title": title,
                    }
                return {
                    "success": True,
                    "message": "Immotop loaded.",
                    "timestamp": _utc_ts(),
                    "url": url,
                    "title": title,
                }

            raise RuntimeError(f"Unsupported integration test type: {test_type}")
        except Exception as e:
            return {
                "success": False,
                "message": f"{type(e).__name__}: {e}",
                "timestamp": _utc_ts(),
                "url": url,
                "title": "",
            }

