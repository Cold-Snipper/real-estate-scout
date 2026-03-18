from __future__ import annotations

import argparse
import asyncio
import os
import sys
from dataclasses import asdict
from pathlib import Path
from typing import Any

"""Core mailer runner used by CLI and /api/mailer/*.

This is the main integration point for the Contacter UI:
- reads listings from CRM (data/crm.db),
- drives atHome/Immotop Playwright flows,
- optionally sends WhatsApp Web follow-ups,
- updates CRM conversations and sent flags,
- emits events to the live feed / spectator so the frontend can observe runs.
"""

from .athome_mailer import send_athome_contact
from .browser import BrowserSettings, human_delay, launch_browser
from .chatbot import draft_contact_message
from .config import MailerConfig
from .db import append_conversation, fetch_listings_by_ids, fetch_pending_listings, mark_attempt, mark_sent
from .immotop_mailer import send_immotop_contact
from .operator_data import load_operator_contact
from .whatsapp import build_whatsapp_followup_text, generate_whatsapp_link, normalize_phone_e164_like
from .whatsapp_web import ensure_whatsapp_persistent_login, send_whatsapp_web_followup
from .live_feed import emit as emit_feed


async def run_mailer_once(cfg: MailerConfig, listing_ids: list[int] | None = None) -> dict[str, Any]:
    operator = load_operator_contact(cfg.operator_id)
    emit_feed("system", "Mailer run started", dry_run=cfg.dry_run, source=cfg.source, limit=cfg.limit)

    source = cfg.source.lower().strip()
    if source not in ("athome", "immotop", "all"):
        raise ValueError("source must be athome | immotop | all")

    listings = (
        fetch_listings_by_ids(listing_ids or [], crm_db_path=cfg.crm_db_path)
        if listing_ids
        else fetch_pending_listings(source=source, limit=cfg.limit, crm_db_path=cfg.crm_db_path)
    )
    stats: dict[str, Any] = {"picked": len(listings), "sent": 0, "failed": 0, "dry_run": cfg.dry_run}

    # One context for website forms.
    form_settings = BrowserSettings(
        headless=cfg.headless,
        locale=cfg.locale,
        timezone_id=cfg.timezone_id,
    )
    # Optional dedicated WhatsApp context (persistent profile).
    wa_ctx = None
    if cfg.whatsapp_web_send and cfg.whatsapp_profile_dir:
        wa_settings = BrowserSettings(
            headless=False,  # WhatsApp profile is typically kept headed for stability
            locale=cfg.locale,
            timezone_id=cfg.timezone_id,
            user_data_dir=str(cfg.whatsapp_profile_dir),
        )
        async for _, context, _page in launch_browser(wa_settings):
            wa_ctx = context
            await ensure_whatsapp_persistent_login(wa_ctx, timeout_ms=180_000)
            break

    async for _, __, page in launch_browser(form_settings):
        for row in listings:
            emit_feed("mailer", "Start listing", property_id=row.property_id, url=row.listing_url, dry_run=cfg.dry_run)
            mark_attempt(row.property_id, None, crm_db_path=cfg.crm_db_path)
            listing_text = "\n".join(
                [x for x in [row.title, row.location, row.description, row.listing_url] if x and str(x).strip()]
            ).strip()
            drafted = draft_contact_message(listing_text, operator_id=cfg.operator_id)
            message_text = drafted.body.strip()

            try:
                if "athome.lu" in row.listing_url:
                    emit_feed("athome", "Contact form flow", property_id=row.property_id, url=row.listing_url, dry_run=cfg.dry_run)
                    res = await send_athome_contact(
                        page,
                        listing_url=row.listing_url,
                        message_text=message_text,
                        operator=operator,
                        screenshots_dir=cfg.screenshots_dir,
                        min_delay_s=cfg.min_delay_s,
                        max_delay_s=cfg.max_delay_s,
                        timeout_ms=cfg.page_timeout_ms,
                        dry_run=cfg.dry_run,
                    )
                elif "immotop.lu" in row.listing_url:
                    emit_feed("immotop", "Contact form flow", property_id=row.property_id, url=row.listing_url, dry_run=cfg.dry_run)
                    res = await send_immotop_contact(
                        page,
                        listing_url=row.listing_url,
                        message_text=message_text,
                        operator=operator,
                        screenshots_dir=cfg.screenshots_dir,
                        min_delay_s=cfg.min_delay_s,
                        max_delay_s=cfg.max_delay_s,
                        timeout_ms=cfg.page_timeout_ms,
                        dry_run=cfg.dry_run,
                    )
                else:
                    raise RuntimeError(f"Unsupported listing_url: {row.listing_url}")

                if not res.ok:
                    emit_feed("mailer", "Listing failed", level="error", property_id=row.property_id, error=res.details)
                    stats["failed"] += 1
                    mark_attempt(row.property_id, res.details, crm_db_path=cfg.crm_db_path)
                    continue

                append_conversation(row.property_id, channel="email", message_text=message_text, sender="ai")

                # WhatsApp follow-up (generate link; actual sending is user-controlled by opening it).
                phone_digits = normalize_phone_e164_like(row.phone_number or "", default_country_code=os.getenv("MAILER_DEFAULT_COUNTRY_CODE"))
                followup_link = None
                sent_whatsapp = False
                if phone_digits:
                    followup_text = build_whatsapp_followup_text(message_text)
                    followup_link = generate_whatsapp_link(phone_digits, followup_text)
                    append_conversation(row.property_id, channel="whatsapp", message_text=followup_text, sender="ai")
                    if cfg.whatsapp_web_send:
                        emit_feed("whatsapp", "WhatsApp Web send attempt", property_id=row.property_id, phone=phone_digits, dry_run=cfg.dry_run)
                        wa_res = await send_whatsapp_web_followup(
                            wa_ctx or page.context,
                            phone_digits=phone_digits,
                            message_text=followup_text,
                            timeout_ms=cfg.page_timeout_ms,
                            screenshots_dir=cfg.screenshots_dir,
                            dry_run=cfg.dry_run,
                        )
                        sent_whatsapp = bool(wa_res.ok) and (not cfg.dry_run)
                    else:
                        # Manual follow-up: we generated a wa.me link but did not actually send.
                        sent_whatsapp = False

                if not cfg.dry_run:
                    mark_sent(
                        row.property_id,
                        sent_via_email=True,
                        sent_via_whatsapp=sent_whatsapp,
                        crm_db_path=cfg.crm_db_path,
                    )
                stats["sent"] += 1

                # Print the WhatsApp link for operator to open (or future automation).
                if followup_link:
                    emit_feed("whatsapp", "Generated wa.me link", property_id=row.property_id, link=followup_link)
                    print(f"[whatsapp] property_id={row.property_id} link={followup_link}")

                await human_delay(cfg.min_delay_s, cfg.max_delay_s)
            except Exception as e:
                emit_feed("mailer", "Unhandled exception", level="error", property_id=row.property_id, error=str(e))
                stats["failed"] += 1
                mark_attempt(row.property_id, str(e), crm_db_path=cfg.crm_db_path)

    emit_feed("system", "Mailer run finished", **stats)
    return stats


async def run_mailer_stream(
    cfg: MailerConfig,
    listing_ids: list[int],
):
    """
    Stream progress updates after each listing.

    Yields dicts:
      { total, processed, successes, failures, current_id, percent, state }
    """
    operator = load_operator_contact(cfg.operator_id)
    listings = fetch_listings_by_ids(listing_ids or [], crm_db_path=cfg.crm_db_path)
    total = len(listings)
    processed = 0
    successes = 0
    failures = 0

    form_settings = BrowserSettings(
        headless=cfg.headless,
        locale=cfg.locale,
        timezone_id=cfg.timezone_id,
    )
    wa_ctx = None
    if cfg.whatsapp_web_send and cfg.whatsapp_profile_dir:
        wa_settings = BrowserSettings(
            headless=False,
            locale=cfg.locale,
            timezone_id=cfg.timezone_id,
            user_data_dir=str(cfg.whatsapp_profile_dir),
        )
        async for _, context, _page in launch_browser(wa_settings):
            wa_ctx = context
            await ensure_whatsapp_persistent_login(wa_ctx, timeout_ms=180_000)
            break

    async for _, __, page in launch_browser(form_settings):
        for row in listings:
            current_id = row.property_id
            started_url = row.listing_url
            emit_feed("mailer", "Start listing (stream)", property_id=current_id, url=started_url, dry_run=cfg.dry_run)
            mark_attempt(current_id, None, crm_db_path=cfg.crm_db_path)
            listing_text = "\n".join(
                [x for x in [row.title, row.location, row.description, row.listing_url] if x and str(x).strip()]
            ).strip()
            drafted = draft_contact_message(listing_text, operator_id=cfg.operator_id)
            message_text = drafted.body.strip()

            ok = False
            err: str | None = None
            try:
                if "athome.lu" in row.listing_url:
                    emit_feed("athome", "Contact form flow", property_id=current_id, url=started_url, dry_run=cfg.dry_run)
                    res = await send_athome_contact(
                        page,
                        listing_url=row.listing_url,
                        message_text=message_text,
                        operator=operator,
                        screenshots_dir=cfg.screenshots_dir,
                        min_delay_s=cfg.min_delay_s,
                        max_delay_s=cfg.max_delay_s,
                        timeout_ms=cfg.page_timeout_ms,
                        dry_run=cfg.dry_run,
                    )
                elif "immotop.lu" in row.listing_url:
                    emit_feed("immotop", "Contact form flow", property_id=current_id, url=started_url, dry_run=cfg.dry_run)
                    res = await send_immotop_contact(
                        page,
                        listing_url=row.listing_url,
                        message_text=message_text,
                        operator=operator,
                        screenshots_dir=cfg.screenshots_dir,
                        min_delay_s=cfg.min_delay_s,
                        max_delay_s=cfg.max_delay_s,
                        timeout_ms=cfg.page_timeout_ms,
                        dry_run=cfg.dry_run,
                    )
                else:
                    raise RuntimeError(f"Unsupported listing_url: {row.listing_url}")

                if not res.ok:
                    err = res.details
                    raise RuntimeError(res.details)

                append_conversation(current_id, channel="email", message_text=message_text, sender="ai")

                phone_digits = normalize_phone_e164_like(
                    row.phone_number or "", default_country_code=os.getenv("MAILER_DEFAULT_COUNTRY_CODE")
                )
                sent_whatsapp = False
                if phone_digits:
                    followup_text = build_whatsapp_followup_text(message_text)
                    followup_link = generate_whatsapp_link(phone_digits, followup_text)
                    append_conversation(current_id, channel="whatsapp", message_text=followup_text, sender="ai")
                    if cfg.whatsapp_web_send:
                        emit_feed("whatsapp", "WhatsApp Web send attempt", property_id=current_id, phone=phone_digits, dry_run=cfg.dry_run)
                        wa_res = await send_whatsapp_web_followup(
                            wa_ctx or page.context,
                            phone_digits=phone_digits,
                            message_text=followup_text,
                            timeout_ms=cfg.page_timeout_ms,
                            screenshots_dir=cfg.screenshots_dir,
                            dry_run=cfg.dry_run,
                        )
                        sent_whatsapp = bool(wa_res.ok) and (not cfg.dry_run)
                        if not wa_res.ok:
                            err = (err or "") + f" | whatsapp_web: {wa_res.details}"
                    else:
                        # Manual follow-up: we generated a wa.me link but did not actually send.
                        sent_whatsapp = False
                    if followup_link:
                        emit_feed("whatsapp", "Generated wa.me link", property_id=current_id, link=followup_link)
                        print(f"[whatsapp] property_id={current_id} link={followup_link}")

                if not cfg.dry_run:
                    mark_sent(
                        current_id,
                        sent_via_email=True,
                        sent_via_whatsapp=sent_whatsapp,
                        crm_db_path=cfg.crm_db_path,
                    )

                ok = True
            except Exception as e:
                failures += 1
                err = err or str(e)
                emit_feed("mailer", "Listing failed", level="error", property_id=current_id, error=err)
                mark_attempt(current_id, err, crm_db_path=cfg.crm_db_path)
            else:
                successes += 1
                emit_feed("mailer", "Listing ok", property_id=current_id)
            finally:
                processed += 1
                percent = round((processed / total) * 100, 1) if total else 100.0
                log = (
                    f"{'DRY' if cfg.dry_run else 'SEND'} "
                    f"{'OK' if ok else 'FAIL'} "
                    f"property_id={current_id} url={started_url}"
                    + (f" error={err}" if (not ok and err) else "")
                )
                yield {
                    "state": "running",
                    "total": total,
                    "processed": processed,
                    "successes": successes,
                    "failures": failures,
                    "current_id": current_id,
                    "ok": ok,
                    "error": None if ok else err,
                    "percent": percent,
                    "log": log,
                }
                await human_delay(cfg.min_delay_s, cfg.max_delay_s)

    yield {
        "state": "done",
        "total": total,
        "processed": processed,
        "successes": successes,
        "failures": failures,
        "current_id": None,
        "ok": True,
        "error": None,
        "percent": 100.0,
    }


def _parse_args(argv: list[str]) -> MailerConfig:
    # Special mode: initialize a persistent WhatsApp Web profile.
    if "--whatsapp-login" in argv:
        p = argparse.ArgumentParser(description="Initialize WhatsApp Web persistent session")
        p.add_argument("--whatsapp-profile-dir", type=str, required=True, help="Directory to store persistent WhatsApp profile")
        p.add_argument("--headed", action="store_true", help="Run with visible browser (recommended)")
        p.add_argument("--locale", type=str, default="en-US")
        p.add_argument("--timezone", type=str, default="Europe/Luxembourg")
        args = p.parse_args(argv)
        # Use operator_id dummy; this config is only used by main() branch.
        return MailerConfig(
            operator_id=1,
            whatsapp_web_send=True,
            whatsapp_profile_dir=Path(args.whatsapp_profile_dir).resolve(),
            headless=not bool(args.headed),
            locale=str(args.locale),
            timezone_id=str(args.timezone),
        )

    p = argparse.ArgumentParser(description="Snippy mailer: contact forms + WhatsApp follow-up")
    p.add_argument("--operator-id", type=int, required=True, help="Operator id from onboarding (for message context)")
    p.add_argument("--source", type=str, default="all", help="athome | immotop | all")
    p.add_argument("--limit", type=int, default=10, help="Max listings to process")
    p.add_argument("--dry-run", action="store_true", help="Do not submit forms; just log intended actions")
    p.add_argument("--headed", action="store_true", help="Run with visible browser")
    p.add_argument("--min-delay", type=float, default=1.5)
    p.add_argument("--max-delay", type=float, default=4.0)
    p.add_argument("--timeout-ms", type=int, default=45_000)
    p.add_argument("--crm-db", type=str, default="", help="Override CRM DB path (default data/crm.db)")
    p.add_argument("--whatsapp-web-send", action="store_true", help="Send WhatsApp follow-up via WhatsApp Web (requires persistent profile)")
    p.add_argument("--whatsapp-profile-dir", type=str, default="", help="Directory for persistent WhatsApp profile (logged in once)")
    p.add_argument("--whatsapp-storage-state", type=str, default="", help="(legacy) Path to WhatsApp Web storage_state JSON (logged-in)")
    p.add_argument("--whatsapp-login", action="store_true", help="Open WhatsApp Web and wait until logged in (uses --whatsapp-profile-dir)")
    p.add_argument("--locale", type=str, default="en-US")
    p.add_argument("--timezone", type=str, default="Europe/Luxembourg")
    args = p.parse_args(argv)

    return MailerConfig(
        operator_id=args.operator_id,
        source=args.source,
        limit=args.limit,
        dry_run=bool(args.dry_run),
        headless=not bool(args.headed),
        min_delay_s=float(args.min_delay),
        max_delay_s=float(args.max_delay),
        page_timeout_ms=int(args.timeout_ms),
        crm_db_path=Path(args.crm_db).resolve() if args.crm_db else None,
        whatsapp_web_send=bool(args.whatsapp_web_send),
        whatsapp_profile_dir=Path(args.whatsapp_profile_dir).resolve() if args.whatsapp_profile_dir else None,
        whatsapp_storage_state_path=Path(args.whatsapp_storage_state).resolve() if args.whatsapp_storage_state else None,
        locale=str(args.locale),
        timezone_id=str(args.timezone),
    )


def main(argv: list[str] | None = None) -> int:
    cfg = _parse_args(argv or sys.argv[1:])
    if (argv or sys.argv[1:]) and "--whatsapp-login" in (argv or sys.argv[1:]):
        # Initialize persistent WhatsApp session.
        wa_settings = BrowserSettings(
            headless=cfg.headless,
            locale=cfg.locale,
            timezone_id=cfg.timezone_id,
            user_data_dir=str(cfg.whatsapp_profile_dir) if cfg.whatsapp_profile_dir else None,
        )
        async def _login():
            async for _, context, _page in launch_browser(wa_settings):
                await ensure_whatsapp_persistent_login(context, timeout_ms=180_000)
                return
        asyncio.run(_login())
        print(f"WhatsApp session ready in profile dir: {cfg.whatsapp_profile_dir}")
        return 0

    stats = asyncio.run(run_mailer_once(cfg))
    print(stats)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

