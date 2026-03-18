from __future__ import annotations

import asyncio
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from playwright.async_api import BrowserContext, Page

from .whatsapp import generate_whatsapp_link
from .spectator import capture as spectator_capture


@dataclass(frozen=True)
class WhatsAppSendResult:
    ok: bool
    details: str


async def ensure_whatsapp_storage_state(
    context: BrowserContext,
    *,
    storage_state_path: Path,
    timeout_ms: int = 180_000,
) -> None:
    """
    One-time manual login helper.

    Opens WhatsApp Web and waits until the app loads (user must scan QR).
    Then saves storage state to the given path.
    """
    page = await context.new_page()
    try:
        await page.goto("https://web.whatsapp.com/", wait_until="domcontentloaded", timeout=timeout_ms)
        # Wait for either chat list (logged in) or QR (not logged in).
        # We assume user will complete login if needed.
        await _wait_until_logged_in(page, timeout_ms=timeout_ms)
        storage_state_path.parent.mkdir(parents=True, exist_ok=True)
        await context.storage_state(path=str(storage_state_path))
    finally:
        await page.close()


async def ensure_whatsapp_persistent_login(
    context: BrowserContext,
    *,
    timeout_ms: int = 180_000,
) -> None:
    """
    Ensure WhatsApp Web is logged in for a persistent profile context.

    If not logged in, user must scan the QR once. The persistent profile keeps the session.
    """
    page = context.pages[0] if context.pages else await context.new_page()
    await page.goto("https://web.whatsapp.com/", wait_until="domcontentloaded", timeout=timeout_ms)
    await spectator_capture(page, channel="whatsapp", label="whatsapp_loaded", property_id=None)
    await _wait_until_logged_in(page, timeout_ms=timeout_ms)
    await spectator_capture(page, channel="whatsapp", label="whatsapp_logged_in", property_id=None)


async def send_whatsapp_web_followup(
    context: BrowserContext,
    *,
    phone_digits: str,
    message_text: str,
    timeout_ms: int,
    screenshots_dir: Path,
    dry_run: bool,
) -> WhatsAppSendResult:
    """
    Send a WhatsApp message via WhatsApp Web using an already-authenticated BrowserContext.

    Strategy:
    - Open wa.me deep link with prefilled text
    - If redirected to web.whatsapp.com, wait for send button then click
    """
    if dry_run:
        return WhatsAppSendResult(ok=True, details="[dry-run] Would send WhatsApp Web message")

    screenshots_dir.mkdir(parents=True, exist_ok=True)
    page = await context.new_page()
    try:
        url = generate_whatsapp_link(phone_digits, message_text)
        await page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
        await spectator_capture(page, channel="whatsapp", label="wa_link_opened", property_id=None)

        # If not logged in, WhatsApp will show QR/login.
        if await _looks_logged_out(page):
            await spectator_capture(page, channel="whatsapp", label="logged_out_qr", property_id=None)
            return WhatsAppSendResult(ok=False, details="WhatsApp Web not logged in (QR screen). Log in once using persistent profile.")

        # Some flows show a "Continue to Chat" button.
        cont = page.get_by_role("link", name="Continue to Chat").first
        if await cont.count() > 0:
            await cont.click(timeout=timeout_ms)
            await spectator_capture(page, channel="whatsapp", label="after_continue_to_chat", property_id=None)

        # If it opened a new tab, best-effort wait on current page.
        await _wait_until_logged_in(page, timeout_ms=timeout_ms)
        await spectator_capture(page, channel="whatsapp", label="chat_ready", property_id=None)

        # Wait for send button and click.
        send_btn = page.locator('button span[data-icon="send"]').first
        if await send_btn.count() == 0:
            send_btn = page.locator('button[aria-label="Send"]').first
        await send_btn.wait_for(state="visible", timeout=timeout_ms)
        await send_btn.click(timeout=timeout_ms)
        await spectator_capture(page, channel="whatsapp", label="after_send_click", property_id=None)
        await asyncio.sleep(1.0)
        return WhatsAppSendResult(ok=True, details="WhatsApp Web message sent")
    except Exception as e:
        try:
            await page.screenshot(path=str(screenshots_dir / "whatsapp_failure.png"), full_page=True)
        except Exception:
            pass
        return WhatsAppSendResult(ok=False, details=f"WhatsApp Web send failed: {e}")
    finally:
        await page.close()


async def _looks_logged_out(page: Page) -> bool:
    # QR canvas or "Log in" type screens vary; look for common markers.
    qr = page.locator("canvas")
    if await qr.count() > 0:
        # Could be other canvases, but WA login QR is common.
        return True
    txt = await page.content()
    return "Use WhatsApp on your computer" in txt or "Scan me!" in txt


async def _wait_until_logged_in(page: Page, timeout_ms: int) -> None:
    """
    Wait until WhatsApp Web chat UI is visible.
    """
    # New UI often has a search input with aria-label "Search input textbox"
    # or a div with role textbox. We'll try a few selectors.
    candidates = [
        page.locator('div[role="textbox"]').first,
        page.locator('div[aria-label="Search input textbox"]').first,
        page.locator('span[data-icon="chat"]').first,
    ]
    last_exc: Exception | None = None
    for loc in candidates:
        try:
            await loc.wait_for(state="visible", timeout=timeout_ms)
            return
        except Exception as e:
            last_exc = e
    if last_exc:
        raise last_exc

