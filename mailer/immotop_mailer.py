from __future__ import annotations

import asyncio
from dataclasses import dataclass
from pathlib import Path

from playwright.async_api import Page

from .browser import human_delay
from .operator_data import OperatorContact
from .spectator import capture as spectator_capture


@dataclass(frozen=True)
class ImmotopResult:
    ok: bool
    details: str


async def send_immotop_contact(
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
) -> ImmotopResult:
    """
    Immotop.lu flow (exact sequence requested):
    - Open listing URL
    - Paste chatbot message into the pre-filled contact form
    - Fill first name and last name from operator onboarding
    - Check the “I am an adult” checkbox
    - Click “Send”
    """
    screenshots_dir.mkdir(parents=True, exist_ok=True)

    if dry_run:
        return ImmotopResult(ok=True, details=f"[dry-run] Would submit Immotop form for {listing_url}")

    try:
        await page.goto(listing_url, wait_until="domcontentloaded", timeout=timeout_ms)
        await spectator_capture(page, channel="immotop", label="loaded_listing", property_id=None)
        await human_delay(min_delay_s, max_delay_s)

        # 1) Fill message textarea (often id=message or textarea in form)
        textarea = page.locator("form textarea").first
        if await textarea.count() == 0:
            textarea = page.locator("textarea").first
        await textarea.wait_for(state="visible", timeout=timeout_ms)
        await textarea.fill(message_text)
        await spectator_capture(page, channel="immotop", label="after_message_fill", property_id=None)

        # 2) Fill first/last name (label or name)
        await _fill_by_label_or_name(page, ["First name", "Firstname", "Prénom"], ["firstname", "first_name", "firstName"], operator.first_name, timeout_ms)
        await _fill_by_label_or_name(page, ["Last name", "Lastname", "Nom"], ["lastname", "last_name", "lastName"], operator.last_name, timeout_ms)
        await spectator_capture(page, channel="immotop", label="after_name_fill", property_id=None)

        # 3) Check adult checkbox
        # Prefer label text.
        adult = page.get_by_label("I am an adult", exact=False)
        if await adult.count() == 0:
            adult = page.get_by_text("I am an adult", exact=False)
        if await adult.count() > 0:
            # If label returns text node, locate nearest checkbox.
            try:
                await page.get_by_label("I am an adult", exact=False).check(timeout=timeout_ms)
            except Exception:
                cb = page.locator("input[type='checkbox']").first
                if await cb.count() > 0:
                    await cb.check(timeout=timeout_ms)
        else:
            cb = page.locator("input[type='checkbox']").first
            if await cb.count() > 0:
                await cb.check(timeout=timeout_ms)
        await spectator_capture(page, channel="immotop", label="after_adult_check", property_id=None)

        await human_delay(min_delay_s, max_delay_s)

        # 4) Click Send
        send_btn = page.get_by_role("button", name="Send").first
        if await send_btn.count() == 0:
            send_btn = page.get_by_role("button").filter(has_text="Send").first
        if await send_btn.count() == 0:
            send_btn = page.locator("form button[type='submit']").first
        await send_btn.click(timeout=timeout_ms)
        await spectator_capture(page, channel="immotop", label="after_send_click", property_id=None)

        await asyncio.sleep(2.0)
        await spectator_capture(page, channel="immotop", label="final", property_id=None)
        return ImmotopResult(ok=True, details="Submitted Immotop contact form")
    except Exception as e:
        try:
            shot = screenshots_dir / "immotop_failure.png"
            await page.screenshot(path=str(shot), full_page=True)
        except Exception:
            pass
        return ImmotopResult(ok=False, details=f"Immotop automation failed: {e}")


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

    for label in labels:
        loc = page.get_by_label(label, exact=False)
        if await loc.count() > 0:
            await loc.first.fill(value, timeout=timeout_ms)
            return

    for n in names:
        loc = page.locator(f"input[name='{n}'], input[id='{n}']")
        if await loc.count() > 0:
            await loc.first.fill(value, timeout=timeout_ms)
            return

