from __future__ import annotations

"""
WhatsApp Web automation (Playwright, async).

LEGAL / COMPLIANCE DISCLAIMER:
- Use only for accounts you own/control and conversations you are allowed to initiate.
- Respect WhatsApp ToS, local laws (spam/marketing), and site policies.
- Keep volumes low and human-like. Avoid unsolicited bulk outreach.

This module is designed to work with an already-logged-in WhatsApp Web session, using either:
1) A persistent browser profile directory (recommended for "permanent login"), or
2) A Playwright storage_state JSON file (legacy/portable).
"""

import asyncio
import json
import random
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import quote

from playwright.async_api import BrowserContext, Page, async_playwright

from .browser import STEALTH_INIT_SCRIPT, _default_chromium_args  # type: ignore
from .db import fetch_listing
from .whatsapp import build_whatsapp_followup_text, normalize_phone_e164_like


@dataclass(frozen=True)
class WhatsAppAutomationConfig:
    headless: bool = False
    locale: str = "en-US"
    timezone_id: str = "Europe/Luxembourg"
    viewport_width: int = 1280
    viewport_height: int = 800

    # Session
    user_data_dir: Path | None = None  # persistent profile (recommended)
    storage_state_path: Path | None = None  # storage_state JSON (legacy)

    # Behavior
    type_delay_min_ms: int = 30
    type_delay_max_ms: int = 80
    action_delay_min_s: float = 0.4
    action_delay_max_s: float = 1.2

    # Timeouts
    timeout_ms: int = 30_000

    # Diagnostics
    screenshots_dir: Path = Path("data/mailer_screens")
    record_on_error: bool = True
    max_retries: int = 2


def _ts() -> str:
    return time.strftime("%Y-%m-%d %H:%M:%S")

def _stamp() -> str:
    return time.strftime("%Y%m%d-%H%M%S")


async def _sleep_jitter(min_s: float, max_s: float) -> None:
    await asyncio.sleep(random.uniform(min_s, max_s))


async def _human_type(page: Page, selector: str, text: str, *, delay_between_chars: bool) -> None:
    if not delay_between_chars:
        await page.fill(selector, text)
        return
    # Clear then type to simulate a user.
    await page.click(selector)
    await page.keyboard.press("Control+A")
    await page.keyboard.press("Backspace")
    for ch in text:
        await page.keyboard.type(ch, delay=random.randint(30, 80))


async def open_whatsapp_context(
    storage_state_path: str = "whatsapp_session.json",
    headless: bool = False,
    *,
    user_data_dir: str | None = None,
    locale: str = "en-US",
    timezone_id: str = "Europe/Luxembourg",
) -> BrowserContext:
    """
    Open a WhatsApp Web context.

    Returns a BrowserContext. Caller is responsible for closing it.
    """
    p = await async_playwright().start()
    args = _default_chromium_args()

    if user_data_dir:
        ctx = await p.chromium.launch_persistent_context(
            user_data_dir=user_data_dir,
            headless=headless,
            args=args,
            locale=locale,
            timezone_id=timezone_id,
            viewport={"width": 1280, "height": 800},
            ignore_https_errors=True,
            bypass_csp=True,
        )
        try:
            await ctx.add_init_script(STEALTH_INIT_SCRIPT)
        except Exception:
            pass
        # attach playwright instance so close() can stop it
        setattr(ctx, "_wa_playwright", p)  # type: ignore[attr-defined]
        return ctx

    storage = Path(storage_state_path).expanduser().resolve()
    browser = await p.chromium.launch(headless=headless, args=args)
    ctx = await browser.new_context(
        locale=locale,
        timezone_id=timezone_id,
        viewport={"width": 1280, "height": 800},
        storage_state=str(storage) if storage.exists() else None,
        ignore_https_errors=True,
        bypass_csp=True,
    )
    try:
        await ctx.add_init_script(STEALTH_INIT_SCRIPT)
    except Exception:
        pass
    setattr(ctx, "_wa_browser", browser)  # type: ignore[attr-defined]
    setattr(ctx, "_wa_playwright", p)  # type: ignore[attr-defined]
    return ctx


async def close_whatsapp_context(context: BrowserContext) -> None:
    """
    Close context and underlying browser/playwright if we created them.
    """
    p = getattr(context, "_wa_playwright", None)
    b = getattr(context, "_wa_browser", None)
    try:
        await context.close()
    finally:
        try:
            if b:
                await b.close()
        finally:
            if p:
                await p.stop()

async def _record_failure(page: Page, *, base_dir: Path, label: str, extra: dict[str, Any] | None = None) -> None:
    """
    Save screenshot + HTML snapshot for selector tuning.
    """
    try:
        base_dir.mkdir(parents=True, exist_ok=True)
        stamp = _stamp()
        shot_path = base_dir / f"wa_{label}_{stamp}.png"
        html_path = base_dir / f"wa_{label}_{stamp}.html"
        meta_path = base_dir / f"wa_{label}_{stamp}.json"

        await page.screenshot(path=str(shot_path), full_page=True)
        html = await page.content()
        html_path.write_text(html, encoding="utf-8")
        meta = {
            "label": label,
            "timestamp": _ts(),
            "url": page.url,
            "extra": extra or {},
        }
        meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    except Exception:
        return


async def _with_retries(fn, *, retries: int, on_error=None):
    last = None
    for attempt in range(retries + 1):
        try:
            return await fn()
        except Exception as e:
            last = e
            if on_error:
                try:
                    await on_error(e, attempt)
                except Exception:
                    pass
            await asyncio.sleep(0.6 + attempt * 0.7)
    if last:
        raise last


def _locators(page: Page, selectors: list[str]):
    return [page.locator(s).first for s in selectors]


async def _click_any(page: Page, selectors: list[str], *, timeout_ms: int) -> None:
    """
    Click the first selector that exists/visible.
    """
    for loc in _locators(page, selectors):
        try:
            if await loc.count() > 0:
                await loc.first.wait_for(state="visible", timeout=timeout_ms)
                await loc.first.click(timeout=timeout_ms)
                return
        except Exception:
            continue
    raise RuntimeError(f"None of the click selectors matched: {selectors}")


async def _fill_search_box(page: Page, value: str, *, timeout_ms: int) -> None:
    """
    Find a search box in WA Web and type value.
    """
    candidates = [
        'div[contenteditable="true"][role="textbox"][data-tab]',
        'div[contenteditable="true"][role="textbox"]',
        'div[aria-label="Search input textbox"]',
        'input[type="text"]',
    ]
    last_exc: Exception | None = None
    for sel in candidates:
        try:
            loc = page.locator(sel).first
            if await loc.count() == 0:
                continue
            await loc.wait_for(state="visible", timeout=timeout_ms)
            await loc.click(timeout=timeout_ms)
            # clear then type
            await page.keyboard.press("Control+A")
            await page.keyboard.press("Backspace")
            await page.keyboard.type(value, delay=random.randint(30, 80))
            return
        except Exception as e:
            last_exc = e
    raise RuntimeError(f"Search box not found: {last_exc}")


async def ensure_logged_in(page: Page, *, timeout_ms: int) -> None:
    await page.goto("https://web.whatsapp.com/", wait_until="domcontentloaded", timeout=timeout_ms)
    # Wait for chat UI marker
    candidates = [
        page.locator('div[role="textbox"]').first,
        page.locator('div[aria-label="Search input textbox"]').first,
        page.locator('span[data-icon="chat"]').first,
    ]
    last = None
    for loc in candidates:
        try:
            await loc.wait_for(state="visible", timeout=timeout_ms)
            return
        except Exception as e:
            last = e
    raise RuntimeError(f"WhatsApp Web not logged in (QR likely). {last}")


async def search_and_open_chat(context: BrowserContext, phone_or_name: str, *, timeout_ms: int) -> Page:
    page = context.pages[0] if context.pages else await context.new_page()
    await ensure_logged_in(page, timeout_ms=timeout_ms)

    # Click search and type
    await _fill_search_box(page, phone_or_name, timeout_ms=timeout_ms)
    await asyncio.sleep(0.8)
    # Enter opens first result
    await page.keyboard.press("Enter")
    return page


async def switch_to_chat(context: BrowserContext, phone_number: str, *, timeout_ms: int) -> Page:
    return await search_and_open_chat(context, phone_number, timeout_ms=timeout_ms)


async def add_contact(context: BrowserContext, phone_number: str, name: str | None = None, *, timeout_ms: int = 30_000) -> bool:
    """
    WhatsApp doesn't always expose a stable "add contact" button in Web.
    Practically, opening a chat is enough; saving contact may require OS integration.
    """
    try:
        await switch_to_chat(context, phone_number, timeout_ms=timeout_ms)
        return True
    except Exception:
        return False


async def send_message(
    context: BrowserContext,
    phone_number: str,
    message: str,
    *,
    delay_between_chars: bool = True,
    timeout_ms: int = 30_000,
) -> bool:
    page = context.pages[0] if context.pages else await context.new_page()
    await ensure_logged_in(page, timeout_ms=timeout_ms)

    # Prefer direct wa.me deep link (fewer UI steps)
    digits = "".join(ch for ch in phone_number if ch.isdigit())
    wa_url = f"https://wa.me/{digits}?text={quote(message)}"
    await page.goto(wa_url, wait_until="domcontentloaded", timeout=timeout_ms)

    # Continue to chat if present
    cont = page.get_by_role("link", name="Continue to Chat").first
    if await cont.count() > 0:
        await cont.click(timeout=timeout_ms)

    # Wait for send button
    send_btn = page.locator('button span[data-icon="send"]').first
    if await send_btn.count() == 0:
        send_btn = page.locator('button[aria-label="Send"]').first

    # Message box selector varies; use contenteditable message input
    msg_box = page.locator('div[contenteditable="true"][role="textbox"]').last
    await msg_box.wait_for(state="visible", timeout=timeout_ms)
    await msg_box.click(timeout=timeout_ms)

    # Type message
    if delay_between_chars:
        for ch in message:
            await page.keyboard.type(ch, delay=random.randint(30, 80))
    else:
        await page.keyboard.type(message)

    await _sleep_jitter(0.2, 0.6)
    # Send
    await page.keyboard.press("Enter")

    # Best-effort: wait briefly for send button to reappear / ticks to update
    await _sleep_jitter(0.8, 1.5)
    return True


async def send_message_to_group(context: BrowserContext, group_name: str, message: str, *, timeout_ms: int = 30_000) -> bool:
    """
    Best-effort group chat send.
    Group UIs change frequently; this uses search-by-name and send.
    """
    page = context.pages[0] if context.pages else await context.new_page()
    async def _do():
        p = await search_and_open_chat(context, group_name, timeout_ms=timeout_ms)
        msg_box = p.locator('div[contenteditable="true"][role="textbox"]').last
        await msg_box.wait_for(state="visible", timeout=timeout_ms)
        await msg_box.click(timeout=timeout_ms)
        for ch in message:
            await p.keyboard.type(ch, delay=random.randint(30, 80))
        await p.keyboard.press("Enter")
        await _sleep_jitter(0.8, 1.3)
        return True

    try:
        return await _with_retries(
            _do,
            retries=2,
            on_error=lambda e, a: _record_failure(page, base_dir=Path("data/mailer_screens"), label="group_send", extra={"group": group_name, "attempt": a, "error": str(e)}),
        )
    except Exception:
        return False


async def create_group(context: BrowserContext, participant_phones: list[str], group_name: str, *, timeout_ms: int = 45_000) -> bool:
    """
    Best-effort group creation. Returns True on success, False if UI flow not found.
    """
    page = context.pages[0] if context.pages else await context.new_page()

    async def _do():
        await ensure_logged_in(page, timeout_ms=timeout_ms)
        # Open "new chat" panel
        await _click_any(
            page,
            [
                'span[data-icon="chat"]',
                'button[aria-label*="New chat"]',
                'button[title*="New chat"]',
                'div[role="button"][aria-label*="New chat"]',
            ],
            timeout_ms=timeout_ms,
        )
        await _sleep_jitter(0.4, 0.9)

        # Click "New group"
        try:
            new_group = page.get_by_text("New group", exact=False).first
            await new_group.click(timeout=timeout_ms)
        except Exception:
            # Sometimes it's a button/role item
            await _click_any(
                page,
                [
                    'div[role="button"]:has-text("New group")',
                    'li:has-text("New group")',
                    'span:has-text("New group")',
                ],
                timeout_ms=timeout_ms,
            )

        # Participant picker search box
        for ph in participant_phones:
            await _fill_search_box(page, ph, timeout_ms=timeout_ms)
            await asyncio.sleep(0.8)
            await page.keyboard.press("Enter")
            await asyncio.sleep(0.4)

        # Next arrow / continue
        try:
            await _click_any(
                page,
                [
                    'span[data-icon="arrow-forward"]',
                    'button[aria-label*="Next"]',
                    'div[role="button"][aria-label*="Next"]',
                    'button:has-text("Next")',
                ],
                timeout_ms=timeout_ms,
            )
        except Exception:
            await page.keyboard.press("Enter")

        # Group name field
        await _fill_search_box(page, group_name, timeout_ms=timeout_ms)

        # Create / confirm
        try:
            await _click_any(
                page,
                [
                    'button:has-text("Create")',
                    'div[role="button"]:has-text("Create")',
                    'span[data-icon="checkmark"]',
                    'span[data-icon="checkmark-medium"]',
                ],
                timeout_ms=timeout_ms,
            )
        except Exception:
            await page.keyboard.press("Enter")
        return True

    try:
        return await _with_retries(
            _do,
            retries=2,
            on_error=lambda e, a: _record_failure(page, base_dir=Path("data/mailer_screens"), label="group_create", extra={"group": group_name, "attempt": a, "error": str(e)}),
        )
    except Exception:
        return False


async def add_to_group(context: BrowserContext, group_name: str, phone_numbers: list[str], *, timeout_ms: int = 45_000) -> bool:
    """
    Best-effort add participants to an existing group.
    """
    page = context.pages[0] if context.pages else await context.new_page()

    async def _do():
        p = await search_and_open_chat(context, group_name, timeout_ms=timeout_ms)
        header = p.locator("header").first
        # Open group info (header click is common)
        await header.click(timeout=timeout_ms)
        await _sleep_jitter(0.4, 0.9)

        # Add participant option
        try:
            add_participant = p.get_by_text("Add participant", exact=False).first
            await add_participant.click(timeout=timeout_ms)
        except Exception:
            await _click_any(
                p,
                [
                    'div[role="button"]:has-text("Add participant")',
                    'span:has-text("Add participant")',
                    'button:has-text("Add participant")',
                ],
                timeout_ms=timeout_ms,
            )
        await _sleep_jitter(0.4, 0.9)

        for ph in phone_numbers:
            await _fill_search_box(p, ph, timeout_ms=timeout_ms)
            await asyncio.sleep(0.8)
            await p.keyboard.press("Enter")
            await asyncio.sleep(0.4)

        # Confirm
        try:
            await _click_any(
                p,
                [
                    'button:has-text("Add")',
                    'div[role="button"]:has-text("Add")',
                    'span[data-icon="checkmark"]',
                    'span[data-icon="checkmark-medium"]',
                ],
                timeout_ms=timeout_ms,
            )
        except Exception:
            pass
        return True

    try:
        return await _with_retries(
            _do,
            retries=2,
            on_error=lambda e, a: _record_failure(page, base_dir=Path("data/mailer_screens"), label="group_add", extra={"group": group_name, "attempt": a, "error": str(e)}),
        )
    except Exception:
        return False


async def generate_and_send_listing_message(
    context: BrowserContext,
    listing_id: int,
    operator_id: int,
    *,
    timeout_ms: int = 30_000,
) -> bool:
    """
    Deep Snippy integration:
    - Fetch listing from CRM via mailer/db.py
    - Generate message via existing bot.llm.generate_proposal(provider_id=operator_id) (context injected)
    - Send via WhatsApp Web
    - Append to CRM conversations + mark contacted
    """
    listing = fetch_listing(int(listing_id))
    if not listing:
        return False
    phone = listing.get("phone") or ""
    phone_digits = normalize_phone_e164_like(phone, default_country_code=None)
    if not phone_digits:
        return False

    # Generate message from existing bot logic (injects provider context)
    try:
        from bot.llm import generate_proposal
    except Exception:
        return False

    listing_text = "\n".join(
        [x for x in [listing.get("title"), listing.get("location"), listing.get("description"), listing.get("url")] if x]
    ).strip()
    msg = generate_proposal(listing_text, model="qwen3", provider_id=int(operator_id)).get("body", "")
    msg = (msg or "").strip()
    if not msg:
        return False

    ok = await send_message(context, phone_digits, msg, delay_between_chars=True, timeout_ms=timeout_ms)
    if not ok:
        return False

    # Persist into CRM
    try:
        from lib.crm_storage import add_conversation, update_property
        add_conversation(int(listing_id), channel="whatsapp", message_text=msg, sender="ai")
        update_property(int(listing_id), chatbot_pipeline_stage="Contacted", last_contact_date=int(time.time()))
    except Exception:
        pass
    return True


async def send_followup_whatsapp(
    context: BrowserContext,
    listing_id: int,
    original_message: str,
    *,
    timeout_ms: int = 30_000,
) -> bool:
    listing = fetch_listing(int(listing_id))
    if not listing:
        return False
    phone_digits = normalize_phone_e164_like(listing.get("phone") or "", default_country_code=None)
    if not phone_digits:
        return False
    followup = build_whatsapp_followup_text(original_message)
    return await send_message(context, phone_digits, followup, delay_between_chars=True, timeout_ms=timeout_ms)


async def scroll_chat_history(page: Page, messages_up: int = 50) -> None:
    for _ in range(max(1, messages_up // 10)):
        await page.mouse.wheel(0, -800)
        await asyncio.sleep(0.2)


async def read_last_messages(context: BrowserContext, phone_number: str, count: int = 5, *, timeout_ms: int = 30_000) -> list[str]:
    page = await switch_to_chat(context, phone_number, timeout_ms=timeout_ms)
    # Messages are complex; best-effort get last bubbles.
    bubbles = page.locator('div[role="row"] div.copyable-text').last
    await asyncio.sleep(0.5)
    texts = await page.locator('div.copyable-text span.selectable-text').all_text_contents()
    texts = [t.strip() for t in texts if t.strip()]
    return texts[-count:]


async def get_chat_info(context: BrowserContext, phone_number: str, *, timeout_ms: int = 30_000) -> dict[str, Any]:
    page = await switch_to_chat(context, phone_number, timeout_ms=timeout_ms)
    await asyncio.sleep(0.4)
    title = await page.title()
    return {"title": title}


async def mark_chat_as_read(context: BrowserContext, phone_number: str, *, timeout_ms: int = 30_000) -> bool:
    try:
        await switch_to_chat(context, phone_number, timeout_ms=timeout_ms)
        return True
    except Exception:
        return False


async def archive_chat(context: BrowserContext, phone_number: str, *, timeout_ms: int = 30_000) -> bool:
    # Very UI-dependent; placeholder best-effort.
    try:
        page = await switch_to_chat(context, phone_number, timeout_ms=timeout_ms)
        menu = page.locator('span[data-icon="menu"]').first
        if await menu.count() > 0:
            await menu.click()
        return True
    except Exception:
        return False


async def delete_chat(context: BrowserContext, phone_number: str, *, timeout_ms: int = 30_000) -> bool:
    # Very UI-dependent; placeholder best-effort.
    return False


async def demo_cli():
    cfg = WhatsAppAutomationConfig(user_data_dir=Path("data/whatsapp_profile"))
    ctx = await open_whatsapp_context(headless=False, user_data_dir=str(cfg.user_data_dir))
    try:
        page = ctx.pages[0] if ctx.pages else await ctx.new_page()
        await ensure_logged_in(page, timeout_ms=180_000)
        ok = await send_message(ctx, "352661123456", "Test message from automation", delay_between_chars=True)
        print("sent:", ok)
    finally:
        await close_whatsapp_context(ctx)


if __name__ == "__main__":
    asyncio.run(demo_cli())

