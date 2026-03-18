from __future__ import annotations

import asyncio
import json
import time
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse

from .config import MailerConfig
from .db import export_properties_csv, list_ready_properties, mark_contacted_bulk
from pathlib import Path

from .main import run_mailer_once, run_mailer_stream
from .integration_tests import (
    IntegrationType,
    IntegrationResult,
    load_integration_status,
    run_integration_test,
    save_integration_status,
)
from .live_feed import HUB as LIVE_FEED, emit as emit_feed

router = APIRouter(prefix="/api/mailer", tags=["mailer"])

_last_status: dict[str, Any] = {"state": "idle", "updated_at": int(time.time())}
_current_task: asyncio.Task | None = None
_recent_logs: list[str] = []


def _set_status(**kwargs: Any) -> None:
    global _last_status
    _last_status = {**_last_status, **kwargs, "updated_at": int(time.time())}

def _push_log(line: str) -> None:
    global _recent_logs
    line = (line or "").strip()
    if not line:
        return
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"{ts} {line}"
    _recent_logs.append(formatted)
    _recent_logs = _recent_logs[-200:]
    # Also broadcast into the live feed.
    emit_feed("mailer", line, level="info")


@router.get("/live-feed")
async def mailer_live_feed(request: Request) -> StreamingResponse:
    """
    SSE: live feed of what the bot is doing (real runtime events).

    The frontend subscribes via EventSource and will receive JSON objects.
    """
    q = LIVE_FEED.subscribe()

    async def gen():
        # Bootstrap: replay a small buffer of real events (last ~200).
        for payload in LIVE_FEED.snapshot(limit=200):
            yield f"data: {payload}\n\n"
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    payload = await asyncio.wait_for(q.get(), timeout=2.0)
                except asyncio.TimeoutError:
                    continue
                yield f"data: {payload}\n\n"
        finally:
            LIVE_FEED.unsubscribe(q)

    return StreamingResponse(gen(), media_type="text/event-stream")


@router.post("/emit-feed")
async def mailer_emit_feed(body: dict[str, Any]) -> dict[str, Any]:
    """
    Allow other processes (e.g. scraper) to push *real* events into the live feed.

    Body:
      channel: system|mailer|athome|immotop|whatsapp|scraper (default scraper)
      level: debug|info|warn|error (default info)
      message: str (required)
      data: object (optional)
    """
    channel = (body.get("channel") or "scraper").strip()
    if channel not in ("system", "mailer", "athome", "immotop", "whatsapp", "scraper"):
        channel = "scraper"
    level = (body.get("level") or "info").strip()
    if level not in ("debug", "info", "warn", "error"):
        level = "info"
    message = (body.get("message") or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="message is required")
    data = body.get("data") if isinstance(body.get("data"), dict) else {}
    emit_feed(channel, message, level=level, **(data or {}))
    return {"ok": True}


@router.get("/status")
def mailer_status() -> dict[str, Any]:
    return {**_last_status, "recent_logs": _recent_logs[-50:]}


@router.get("/integration-status")
def integration_status() -> dict[str, Any]:
    """
    Last integration test result per type.
    Stored locally in data/mailer_integration_status.json.
    """
    return load_integration_status()


@router.post("/test-integration")
async def test_integration(body: dict[str, Any]) -> IntegrationResult:
    """
    Run a quick headed Playwright smoke test for external integrations.

    Body:
      type: "whatsapp" | "website" | "athome" | "immotop" (required)
      website_url: str (optional; used when type=="website")
      timeout_ms: int (optional, default 20000)
    """
    t = (body.get("type") or "").strip()
    if t not in ("whatsapp", "website", "athome", "immotop"):
        raise HTTPException(status_code=400, detail="type must be one of: whatsapp, website, athome, immotop")
    test_type: IntegrationType = t  # type: ignore[assignment]

    website_url = (body.get("website_url") or "").strip() or None
    timeout_ms = int(body.get("timeout_ms") or 20000)

    _push_log(f"INTEGRATION_TEST start type={test_type}")
    result = await run_integration_test(test_type, website_url=website_url, timeout_ms=timeout_ms)
    _push_log(f"INTEGRATION_TEST done type={test_type} ok={result.get('success')}")

    status = load_integration_status()
    status[test_type] = result
    save_integration_status(status)
    return result


@router.get("/properties")
def mailer_ready_properties(
    source: str = Query("all"),
    limit: int = Query(50, ge=1, le=500),
) -> list[dict[str, Any]]:
    """
    Listings ready for contact (from CRM properties table).
    """
    return list_ready_properties(source=source, limit=int(limit))


@router.get("/run-progress")
async def mailer_run_progress(
    request: Request,
    operator_id: int = Query(..., ge=1),
    listing_ids: str = Query(..., description="Comma-separated property ids"),
    source: str = Query("all"),
    dry_run: bool = Query(True),
    headless: bool = Query(True),
    whatsapp_web_send: bool = Query(False),
    whatsapp_profile_dir: str = Query("", description="Persistent WhatsApp profile directory"),
) -> StreamingResponse:
    """
    SSE endpoint: streams progress updates as `data: <json>\\n\\n`.

    Use with EventSource in the frontend.
    """
    global _current_task
    if _current_task and not _current_task.done():
        raise HTTPException(status_code=409, detail="Mailer already running")

    ids = [int(x) for x in (listing_ids or "").split(",") if x.strip().isdigit()]
    if not ids:
        raise HTTPException(status_code=400, detail="listing_ids is required")

    cfg = MailerConfig(
        operator_id=int(operator_id),
        source=source,
        limit=len(ids),
        dry_run=bool(dry_run),
        headless=bool(headless),
        whatsapp_web_send=bool(whatsapp_web_send),
        whatsapp_profile_dir=Path(whatsapp_profile_dir).resolve() if whatsapp_profile_dir else None,
    )

    async def event_gen():
        _set_status(state="running", operator_id=operator_id, source=cfg.source, limit=cfg.limit, dry_run=cfg.dry_run)
        # Initial event for immediate UI feedback.
        yield f"data: {json.dumps({'state':'running','total':len(ids),'processed':0,'successes':0,'failures':0,'percent':0})}\n\n"
        try:
            async for update in run_mailer_stream(cfg, ids):
                if update.get("log"):
                    _push_log(str(update["log"]))
                _set_status(state=update.get("state", "running"), stats={
                    "picked": int(update.get("total") or len(ids)),
                    "sent": int(update.get("successes") or 0),
                    "failed": int(update.get("failures") or 0),
                    "dry_run": cfg.dry_run,
                })
                yield f"data: {json.dumps(update)}\n\n"
                if await request.is_disconnected():
                    break
        except Exception as e:
            _set_status(state="error", error=str(e))
            _push_log(f"ERROR {e}")
            yield f"data: {json.dumps({'state':'error','error':str(e)})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_gen(), media_type="text/event-stream")


@router.post("/mark-contacted")
async def mailer_mark_contacted(body: dict[str, Any]) -> dict[str, Any]:
    """
    Mass action: mark selected CRM properties as contacted (without sending).

    Body:
      listing_ids: int[] (required)
      sent_via_email: bool (optional, default true)
      sent_via_whatsapp: bool (optional, default false)
    """
    ids = body.get("listing_ids") or []
    if not isinstance(ids, list) or not ids:
        raise HTTPException(status_code=400, detail="listing_ids is required")
    ids_norm = [int(x) for x in ids]
    updated = mark_contacted_bulk(
        ids_norm,
        sent_via_email=bool(body.get("sent_via_email", True)),
        sent_via_whatsapp=bool(body.get("sent_via_whatsapp", False)),
    )
    _push_log(f"MARK_CONTACTED updated={updated} ids={len(ids_norm)}")
    return {"ok": True, "updated": updated}


@router.get("/export.csv")
def mailer_export_csv(listing_ids: str = Query(..., description="Comma-separated property ids")):
    """
    Export selected properties as CSV.
    """
    ids = [int(x) for x in (listing_ids or "").split(",") if x.strip().isdigit()]
    if not ids:
        raise HTTPException(status_code=400, detail="listing_ids is required")
    csv_text = export_properties_csv(ids)
    _push_log(f"EXPORT_CSV ids={len(ids)}")
    return StreamingResponse(
        iter([csv_text]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=contacter_export.csv"},
    )


@router.post("/run")
async def mailer_run(body: dict[str, Any]) -> dict[str, Any]:
    """
    Trigger a mailer run.

    Body:
      operator_id: int (required)
      source: "athome" | "immotop" | "all" (optional, default all)
      limit: int (optional, default 10)
      dry_run: bool (optional, default true)
      listing_ids: int[] (optional) - if provided, mailer will process only those property ids
    """
    global _current_task
    if _current_task and not _current_task.done():
        raise HTTPException(status_code=409, detail="Mailer already running")

    operator_id = int(body.get("operator_id") or 0)
    if operator_id <= 0:
        raise HTTPException(status_code=400, detail="operator_id is required")

    cfg = MailerConfig(
        operator_id=operator_id,
        source=(body.get("source") or "all"),
        limit=int(body.get("limit") or 10),
        dry_run=bool(body.get("dry_run", True)),
        headless=bool(body.get("headless", True)),
        whatsapp_web_send=bool(body.get("whatsapp_web_send", False)),
        whatsapp_profile_dir=Path(body.get("whatsapp_profile_dir")).resolve() if body.get("whatsapp_profile_dir") else None,
    )
    listing_ids = body.get("listing_ids") or None
    if listing_ids is not None and not isinstance(listing_ids, list):
        raise HTTPException(status_code=400, detail="listing_ids must be an array of ints")
    listing_ids_norm = [int(x) for x in listing_ids] if listing_ids else None

    async def _runner():
        _set_status(state="running", operator_id=operator_id, source=cfg.source, limit=cfg.limit, dry_run=cfg.dry_run)
        try:
            stats = await run_mailer_once(cfg, listing_ids=listing_ids_norm)
            _set_status(state="done", stats=stats)
        except Exception as e:
            _set_status(state="error", error=str(e))

    _current_task = asyncio.create_task(_runner())
    return {"ok": True, "status": "started"}

