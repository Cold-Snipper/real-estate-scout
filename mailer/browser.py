from __future__ import annotations

import os
import random
from dataclasses import dataclass
from pathlib import Path
from typing import AsyncIterator

from playwright.async_api import Browser, BrowserContext, Page, async_playwright


DEFAULT_USER_AGENTS: list[str] = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
]


@dataclass(frozen=True)
class BrowserSettings:
    headless: bool = True
    user_agents: list[str] | None = None
    proxy: str | None = None
    viewport_width: int = 1280
    viewport_height: int = 800
    locale: str = "en-US"
    timezone_id: str = "Europe/Luxembourg"
    storage_state_path: str | None = None
    ignore_https_errors: bool = True
    bypass_csp: bool = True
    user_data_dir: str | None = None  # when set, uses a persistent context


STEALTH_INIT_SCRIPT = """
// Basic stealth patches (best-effort).
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
window.chrome = window.chrome || { runtime: {} };
Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
"""


def _default_chromium_args() -> list[str]:
    return [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-infobars",
        "--window-size=1920,1080",
    ]


def _resolve_storage_state(path: str | None) -> str | None:
    if not path:
        return None
    p = Path(path)
    return str(p) if p.exists() else None


async def _apply_stealth(context: BrowserContext) -> None:
    """
    Best-effort stealth.

    This repo already uses playwright_stealth in sync mode (bot/browser.py).
    For asyncio we apply stealth if an async helper exists; otherwise we proceed without it.
    """
    try:
        import playwright_stealth  # type: ignore

        stealth_async = getattr(playwright_stealth, "stealth_async", None)
        if callable(stealth_async):
            await stealth_async(context)
            return
        stealth_sync = getattr(playwright_stealth, "stealth_sync", None)
        if callable(stealth_sync):
            # Some versions accept context and patch synchronously.
            stealth_sync(context)
            return
    except Exception:
        return


async def launch_browser(settings: BrowserSettings) -> AsyncIterator[tuple[Browser, BrowserContext, Page]]:
    """
    Async Playwright browser launcher yielding (browser, context, page).
    """
    ua_pool = settings.user_agents or DEFAULT_USER_AGENTS
    user_agent = random.choice(ua_pool) if ua_pool else None
    proxy_opt = {"server": settings.proxy} if settings.proxy else None

    async with async_playwright() as p:
        if settings.user_data_dir:
            # Persistent context: keeps cookies/session between runs (ideal for WhatsApp Web).
            ctx = await p.chromium.launch_persistent_context(
                user_data_dir=settings.user_data_dir,
                headless=settings.headless,
                args=_default_chromium_args(),
                viewport={"width": settings.viewport_width, "height": settings.viewport_height},
                user_agent=user_agent,
                proxy=proxy_opt,
                locale=settings.locale,
                timezone_id=settings.timezone_id,
                ignore_https_errors=settings.ignore_https_errors,
                bypass_csp=settings.bypass_csp,
            )
            try:
                await ctx.add_init_script(STEALTH_INIT_SCRIPT)
            except Exception:
                pass
            await _apply_stealth(ctx)
            page = ctx.pages[0] if ctx.pages else await ctx.new_page()
            # No Browser object is returned for persistent contexts.
            class _NoBrowser:
                async def close(self):  # pragma: no cover
                    return None
            browser = _NoBrowser()  # type: ignore[assignment]
            try:
                yield browser, ctx, page
            finally:
                await ctx.close()
        else:
            browser = await p.chromium.launch(
                headless=settings.headless,
                args=_default_chromium_args(),
            )
            context = await browser.new_context(
                viewport={"width": settings.viewport_width, "height": settings.viewport_height},
                user_agent=user_agent,
                proxy=proxy_opt,
                locale=settings.locale,
                timezone_id=settings.timezone_id,
                storage_state=_resolve_storage_state(settings.storage_state_path),
                ignore_https_errors=settings.ignore_https_errors,
                bypass_csp=settings.bypass_csp,
                java_script_enabled=True,
            )
            try:
                await context.add_init_script(STEALTH_INIT_SCRIPT)
            except Exception:
                pass
            await _apply_stealth(context)
            page = await context.new_page()
            try:
                yield browser, context, page
            finally:
                try:
                    await context.close()
                finally:
                    await browser.close()


async def human_delay(min_s: float, max_s: float) -> None:
    import asyncio

    await asyncio.sleep(random.uniform(min_s, max_s))

