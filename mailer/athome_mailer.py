from __future__ import annotations

import asyncio
from dataclasses import dataclass
from pathlib import Path

from playwright.async_api import Page

from .browser import human_delay
from .operator_data import OperatorContact
from .spectator import capture as spectator_capture


@dataclass(frozen=True)
class AthomeResult:
    ok: bool
    details: str


async def send_athome_contact(
    page: Page,
    *,
    listing_url: str,
    message_text: str,
    operator: OperatorContact,
    screenshots_dir: Path,
    min_delay_s: float,
    max_delay_s: float,
    timeout_ms: int,
    dry_run: bool,
) -> AthomeResult:
    """
    atHome.lu flow (exact sequence requested):
    - Open listing URL
    - Click “Contact”
    - Click “Continue as guest”
    - Click “More info”
    - Paste chatbot message into the textarea
    - Fill email, first name, last name, phone from operator onboarding data
    - Click “Send”
    """
    screenshots_dir.mkdir(parents=True, exist_ok=True)

    if dry_run:
        return AthomeResult(ok=True, details=f"[dry-run] Would submit atHome form for {listing_url}")

    try:
        await page.goto(listing_url, wait_until="domcontentloaded", timeout=timeout_ms)
        await spectator_capture(page, channel="athome", label="loaded_listing", property_id=None)
        await human_delay(min_delay_s, max_delay_s)

        # 1) Click "Contact"
        contact_btn = page.get_by_role("button", name="Contact").first
        if await contact_btn.count() == 0:
            # fallback: link/button containing Contact
            contact_btn = page.get_by_text("Contact", exact=False).first
        await contact_btn.click(timeout=timeout_ms)
        await spectator_capture(page, channel="athome", label="after_contact_click", property_id=None)
        await human_delay(min_delay_s, max_delay_s)

        # 2) Click "Continue as guest"
        guest_btn = page.get_by_role("button", name="Continue as guest").first
        if await guest_btn.count() == 0:
            guest_btn = page.get_by_text("Continue as guest", exact=False).first
        await guest_btn.click(timeout=timeout_ms)
        await spectator_capture(page, channel="athome", label="after_guest_click", property_id=None)
        await human_delay(min_delay_s, max_delay_s)

        # 3) Click "More info"
        more_info = page.get_by_role("button", name="More info").first
        if await more_info.count() == 0:
            more_info = page.get_by_text("More info", exact=False).first
        await more_info.click(timeout=timeout_ms)
        await spectator_capture(page, channel="athome", label="after_more_info", property_id=None)
        await human_delay(min_delay_s, max_delay_s)

        # 4) Fill message textarea
        textarea = page.locator("textarea").first
        await textarea.wait_for(state="visible", timeout=timeout_ms)
        await textarea.fill(message_text)
        await spectator_capture(page, channel="athome", label="after_message_fill", property_id=None)

        # 5) Fill email, first name, last name, phone
        # Use label-driven selectors first; fallback to input[name=...] patterns.
        await _fill_by_label_or_name(page, ["Email", "E-mail"], ["email"], operator.email, timeout_ms)
        await _fill_by_label_or_name(page, ["First name", "Firstname", "Prénom"], ["firstName", "firstname", "first_name"], operator.first_name, timeout_ms)
        await _fill_by_label_or_name(page, ["Last name", "Lastname", "Nom"], ["lastName", "lastname", "last_name"], operator.last_name, timeout_ms)
        await _fill_by_label_or_name(page, ["Phone", "Phone number", "Téléphone"], ["phone", "phoneNumber", "phone_number"], operator.phone, timeout_ms)
        await spectator_capture(page, channel="athome", label="after_contact_details_fill", property_id=None)

        await human_delay(min_delay_s, max_delay_s)

        # 6) Click "Send"
        send_btn = page.get_by_role("button", name="Send").first
        if await send_btn.count() == 0:
            send_btn = page.get_by_text("Send", exact=False).first
        await send_btn.click(timeout=timeout_ms)
        await spectator_capture(page, channel="athome", label="after_send_click", property_id=None)

        # Give time for confirmation or navigation
        await asyncio.sleep(2.0)
        await spectator_capture(page, channel="athome", label="final", property_id=None)
        return AthomeResult(ok=True, details="Submitted atHome contact form")
    except Exception as e:
        try:
            shot = screenshots_dir / "athome_failure.png"
            await page.screenshot(path=str(shot), full_page=True)
        except Exception:
            pass
        return AthomeResult(ok=False, details=f"atHome automation failed: {e}")


async def _fill_by_label_or_name(
    page: Page,
    labels: list[str],
    names: list[str],
    value: str,
    timeout_ms: int,
) -> None:
    value = (value or "").strip()
    if not value:
        return

    # Try label-based selectors.
    for label in labels:
        loc = page.get_by_label(label, exact=False)
        if await loc.count() > 0:
            await loc.first.fill(value, timeout=timeout_ms)
            return

    # Try common name attributes.
    for n in names:
        loc = page.locator(f"input[name='{n}'], input[id='{n}']")
        if await loc.count() > 0:
            await loc.first.fill(value, timeout=timeout_ms)
            return

    # Try "type=email"/"type=tel" heuristics.
    if any("email" in x.lower() for x in names) or any("mail" in x.lower() for x in labels):
        loc = page.locator("input[type='email']")
        if await loc.count() > 0:
            await loc.first.fill(value, timeout=timeout_ms)
            return
    if any("phone" in x.lower() or "tel" in x.lower() for x in names + labels):
        loc = page.locator("input[type='tel']")
        if await loc.count() > 0:
            await loc.first.fill(value, timeout=timeout_ms)
            return

