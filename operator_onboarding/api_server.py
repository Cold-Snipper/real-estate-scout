"""
Minimal FastAPI server bridging the Operator Onboarding UI to operator_onboarding Python logic.
Run: uvicorn operator_onboarding.api_server:app --reload --port 8000
"""
import json
import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, RedirectResponse, FileResponse, StreamingResponse

from operator_onboarding.db import init_db, get_db_path
from operator_onboarding import auth as auth_lib
from operator_onboarding.operators import (
    create_operator,
    get_operator,
    get_all_operators,
    update_operator,
    delete_operator,
)
from operator_onboarding.documents import (
    create_document,
    get_documents,
    get_document,
    delete_document,
    DOCUMENT_TYPES,
)
from operator_onboarding.context_builder import get_provider_context
from lib.crm_storage import (
    init_crm_db,
    get_all_owners as crm_get_all_owners,
    insert_owner as crm_insert_owner,
    insert_property as crm_insert_property,
    update_owner as crm_update_owner,
    update_property as crm_update_property,
    get_conversations as crm_get_conversations,
    add_conversation as crm_add_conversation,
    get_all_conversations_flat as crm_get_all_conversations_flat,
)

# Settings file next to providers.db
def _settings_path() -> Path:
    return get_db_path().parent / "api_settings.json"

DEFAULT_SETTINGS = {
    "ollamaModel": "llama3.2",
    "temperature": 0.7,
    "maxTokens": 2048,
    "defaultProviderId": "none",
}

def _load_settings() -> dict[str, Any]:
    p = _settings_path()
    if not p.exists():
        return dict(DEFAULT_SETTINGS)
    try:
        with open(p) as f:
            return {**DEFAULT_SETTINGS, **json.load(f)}
    except Exception:
        return dict(DEFAULT_SETTINGS)

def _save_settings(data: dict[str, Any]) -> None:
    p = _settings_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w") as f:
        json.dump(data, f, indent=2)

# Ensure DB exists on startup
init_db()
try:
    init_crm_db()
except Exception:
    pass  # CRM optional; data/crm.db created on first use

# Mode: set from auth so operator CRUD uses correct DB (local vs cloud)
def _set_mode_from_user(user_type: str | None) -> None:
    try:
        from lib.db import set_mode
        if user_type and user_type != "local":
            set_mode("cloud")
        else:
            set_mode("local")
    except ImportError:
        pass


def _mode_dep(authorization: str | None = Header(None, alias="Authorization")):
    """Dependency: set lib.db mode from current user (Authorization header). OAuth → cloud, local → local."""
    user = auth_lib.get_current_user(authorization)
    _set_mode_from_user(user.get("user_type") if user else None)
    return user


# Auth: frontend URL for OAuth redirect (where to send user with token after login)
AUTH_FRONTEND_URL = os.getenv("AUTH_FRONTEND_URL", "http://localhost:5173").rstrip("/")
SESSION_SECRET = os.getenv("SESSION_SECRET", "immo-snippy-session-secret-change-in-production")

app = FastAPI(title="Operator Onboarding API")
# Session must be before CORS so OAuth state is stored
try:
    from starlette.middleware.sessions import SessionMiddleware
    app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET)
except ImportError:
    pass
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> RedirectResponse:
    """Redirect root to the operator onboarding UI."""
    return RedirectResponse(url="/operator-onboarding", status_code=302)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/operator-onboarding", response_class=FileResponse)
def operator_onboarding_page() -> FileResponse:
    """Serve minimal 3-step operator onboarding form (POST /api/operators)."""
    path = Path(__file__).resolve().parent / "static" / "operator_onboarding.html"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Static form not found")
    return FileResponse(path, media_type="text/html")


@app.get("/api/operators")
def list_operators(_: None = Depends(_mode_dep)) -> list[dict[str, Any]]:
    return get_all_operators()


@app.post("/api/operators")
def post_operator(body: dict[str, Any], _: None = Depends(_mode_dep)) -> dict[str, Any]:
    # Frontend sends: company_name, website_url, tagline, countries, tone_style,
    # ideal_client_profile, preferred_property_types, pricing_model, qualification_rules,
    # calendly_link, notes. Optional: services, usps, key_phrases, languages, rules, etc.
    op_id = create_operator(body)
    return {"id": op_id, "ok": True}


@app.get("/api/operators/{operator_id:int}")
def get_operator_by_id(operator_id: int, _: None = Depends(_mode_dep)) -> dict[str, Any]:
    op = get_operator(operator_id)
    if op is None:
        raise HTTPException(status_code=404, detail="Operator not found")
    return op


@app.patch("/api/operators/{operator_id:int}")
def patch_operator(operator_id: int, body: dict[str, Any], _: None = Depends(_mode_dep)) -> dict[str, Any]:
    ok = update_operator(operator_id, body)
    if not ok:
        raise HTTPException(status_code=404, detail="Operator not found")
    op = get_operator(operator_id)
    return op


@app.get("/api/operators/{operator_id:int}/documents")
def list_documents(operator_id: int, _: None = Depends(_mode_dep)) -> list[dict[str, Any]]:
    return get_documents(operator_id)


@app.post("/api/operators/{operator_id:int}/documents")
def post_document(operator_id: int, body: dict[str, Any], _: None = Depends(_mode_dep)) -> dict[str, Any]:
    name = (body.get("name") or "").strip() or "Untitled"
    document_type = body.get("document_type") or "other"
    if document_type not in DOCUMENT_TYPES:
        document_type = "other"
    content = body.get("content") or ""
    file_path = body.get("file_path")
    doc_id = create_document(operator_id, name, document_type, content, file_path)
    return {"id": doc_id, "ok": True}


@app.delete("/api/operators/{operator_id:int}/documents/{doc_id:int}")
def delete_document_by_id(operator_id: int, doc_id: int, _: None = Depends(_mode_dep)) -> dict[str, bool]:
    doc = get_document(doc_id)
    if doc is None or doc.get("operator_id") != operator_id:
        raise HTTPException(status_code=404, detail="Document not found")
    ok = delete_document(doc_id)
    return {"ok": ok}


@app.delete("/api/operators/{operator_id:int}")
def delete_operator_by_id(operator_id: int, _: None = Depends(_mode_dep)) -> dict[str, bool]:
    ok = delete_operator(operator_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Operator not found")
    return {"ok": True}


@app.post("/api/operators/reset-defaults")
def reset_default_operators(_: None = Depends(_mode_dep)) -> dict[str, Any]:
    """Delete all operators and insert one prefilled test agent."""
    all_ops = get_all_operators()
    for op in all_ops:
        delete_operator(op["id"])
    # Single test agent with prefilled data for development/demo
    default_agent = {
        "company_name": "Immo Snippy Test Agency",
        "website_url": "https://example.com",
        "tagline": "Local short-term rental management",
        "countries": "LU",
        "tone_style": "professional and friendly",
        "ideal_client_profile": "busy professionals",
        "preferred_property_types": "apartments",
        "pricing_model": "20-25% commission",
        "qualification_rules": "Always offer 15-min call first",
        "calendly_link": "https://calendly.com/example",
        "notes": "Test operator for Immo Snippy. Edit or replace via Agents & APIs.",
        "rules": [
            "Never mention competitor names.",
            "Always mention our 90-day guarantee.",
            "Use the owner's first name when known.",
        ],
    }
    op_id = create_operator(default_agent)
    return {"ok": True, "ids": [op_id], "count": 1}


@app.get("/api/settings")
def get_settings() -> dict[str, Any]:
    return _load_settings()


@app.post("/api/settings")
def post_settings(body: dict[str, Any]) -> dict[str, Any]:
    current = _load_settings()
    for key in ("ollamaModel", "temperature", "maxTokens", "defaultProviderId"):
        if key in body:
            current[key] = body[key]
    if "temperature" in current:
        current["temperature"] = float(current["temperature"])
    if "maxTokens" in current:
        current["maxTokens"] = int(current["maxTokens"])
    _save_settings(current)
    return current


@app.get("/api/operators/{operator_id:int}/context", response_class=PlainTextResponse)
def get_operator_context(operator_id: int, _: None = Depends(_mode_dep)) -> str:
    op = get_operator(operator_id)
    if op is None:
        raise HTTPException(status_code=404, detail="Operator not found")
    return get_provider_context(operator_id)


@app.post("/api/operators/{operator_id:int}/test-message")
def test_message(operator_id: int, body: dict[str, Any], _: None = Depends(_mode_dep)) -> dict[str, str]:
    """Generate outreach message for sample listing text using operator context."""
    op = get_operator(operator_id)
    if op is None:
        raise HTTPException(status_code=404, detail="Operator not found")
    listing_text = (body.get("listing_text") or "").strip() or "3-bed apartment in city center, €1,200/month."
    settings = _load_settings()
    model = settings.get("ollamaModel") or "llama3.2"
    try:
        from bot.llm import generate_proposal
        result = generate_proposal(listing_text, model=model, provider_id=operator_id)
        return {"subject": result.get("subject", ""), "body": result.get("body", "")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/crm/owners")
def list_crm_owners() -> list[dict[str, Any]]:
    """Return all CRM owners with their properties and last_contact_date."""
    return crm_get_all_owners()


@app.post("/api/crm/owners")
def create_crm_owner(body: dict[str, Any]) -> dict[str, Any]:
    """
    Manual lead/owner entry. Required: owner_email. Source URL (listing_url) required when adding a first property.
    Optional: owner_name, owner_phone, owner_notes. First property fields (schema-aligned): listing_url, title,
    price, rent_price, sale_price, bedrooms, bathrooms, rooms, surface_m2, location, description, listing_ref,
    source, transaction_type, address, phone_number, phone_source.
    Returns { id, ok } with owner id.
    """
    email = (body.get("owner_email") or "").strip()
    if not email:
        raise HTTPException(status_code=400, detail="owner_email is required")
    owner_id = crm_insert_owner(
        owner_name=(body.get("owner_name") or "").strip() or None,
        owner_email=email,
        owner_phone=(body.get("owner_phone") or "").strip() or None,
        owner_notes=(body.get("owner_notes") or "").strip() or None,
    )
    listing_url = (body.get("listing_url") or "").strip() or None
    has_property_data = (
        listing_url
        or body.get("title")
        or body.get("price") is not None
        or body.get("rent_price") is not None
        or body.get("sale_price") is not None
        or body.get("location")
    )
    if has_property_data and not listing_url:
        raise HTTPException(status_code=400, detail="listing_url (source URL) is required when adding a property")
    if has_property_data:
        crm_insert_property(
            owner_id=owner_id,
            listing_url=listing_url,
            title=(body.get("title") or "").strip() or None,
            price=body.get("price") if body.get("price") is not None else None,
            rent_price=body.get("rent_price") if body.get("rent_price") is not None else None,
            sale_price=body.get("sale_price") if body.get("sale_price") is not None else None,
            bedrooms=body.get("bedrooms"),
            bathrooms=body.get("bathrooms"),
            rooms=body.get("rooms"),
            surface_m2=body.get("surface_m2"),
            location=(body.get("location") or "").strip() or None,
            description=(body.get("description") or "").strip() or None,
            contact_email=email,
            listing_ref=(body.get("listing_ref") or "").strip() or None,
            source=(body.get("source") or "").strip() or None,
            transaction_type=(body.get("transaction_type") or "").strip() or None,
            address=(body.get("address") or "").strip() or None,
            phone_number=(body.get("phone_number") or "").strip() or None,
            phone_source=(body.get("phone_source") or "").strip() or None,
        )
    return {"id": owner_id, "ok": True}


@app.get("/api/crm/owners/export")
def export_crm_owners_csv():
    """Export all CRM owners and their properties as CSV (download)."""
    import csv
    import io
    owners = crm_get_all_owners()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["owner_id", "owner_name", "owner_email", "owner_phone", "owner_notes", "property_id", "title", "price", "location", "listing_url", "sales_stage", "chatbot_stage"])
    for o in owners:
        base = [o.get("id"), o.get("owner_name"), o.get("owner_email"), o.get("owner_phone"), o.get("owner_notes")]
        props = o.get("properties") or []
        if not props:
            w.writerow(base + ["", "", "", "", "", "", ""])
        for p in props:
            w.writerow(base + [
                p.get("id"), p.get("title"), p.get("price"), p.get("location"), p.get("listing_url"),
                p.get("sales_pipeline_stage"), p.get("chatbot_pipeline_stage"),
            ])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=crm_owners_export.csv"},
    )


@app.patch("/api/crm/owners/{owner_id:int}")
def patch_crm_owner(owner_id: int, body: dict[str, Any]) -> dict[str, Any]:
    """Update a CRM owner (owner_name, owner_email, owner_phone, owner_notes)."""
    ok = crm_update_owner(owner_id, **body)
    if not ok:
        raise HTTPException(status_code=404, detail="Owner not found")
    return {"ok": True}


@app.get("/api/crm/properties/{property_id:int}/conversations")
def list_crm_conversations(property_id: int) -> list[dict[str, Any]]:
    """List conversation history for a property (threaded by channel; messages cannot be deleted)."""
    return crm_get_conversations(property_id)


@app.post("/api/crm/properties/{property_id:int}/conversations")
def post_crm_conversation(property_id: int, body: dict[str, Any]) -> dict[str, Any]:
    """Append a message to the property's conversation history. Body: channel, message_text, sender (owner|ai|user)."""
    channel = (body.get("channel") or "").strip() or "email"
    message_text = (body.get("message_text") or "").strip()
    sender = (body.get("sender") or "user").strip().lower()
    if sender not in ("owner", "ai", "user"):
        sender = "user"
    cid = crm_add_conversation(property_id, channel, message_text, sender)
    return {"id": cid, "ok": True}


@app.get("/api/crm/properties/export")
def export_crm_properties_csv():
    """Export all CRM properties as CSV."""
    import csv
    import io
    owners = crm_get_all_owners()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["property_id", "owner_id", "owner_name", "title", "price", "bedrooms", "surface_m2", "location", "listing_url", "sales_stage", "chatbot_stage", "viability_score", "recommendation"])
    for o in owners:
        for p in (o.get("properties") or []):
            w.writerow([
                p.get("id"), o.get("id"), o.get("owner_name"), p.get("title"), p.get("price"), p.get("bedrooms"),
                p.get("surface_m2"), p.get("location"), p.get("listing_url"), p.get("sales_pipeline_stage"),
                p.get("chatbot_pipeline_stage"), p.get("viability_score"), p.get("recommendation"),
            ])
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=crm_properties_export.csv"})


@app.get("/api/crm/owners/{owner_id:int}/export")
def export_crm_single_owner_csv(owner_id: int):
    """Export a single owner and their properties as CSV."""
    import csv
    import io
    owners = crm_get_all_owners()
    o = next((x for x in owners if x.get("id") == owner_id), None)
    if not o:
        raise HTTPException(status_code=404, detail="Owner not found")
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["owner_id", "owner_name", "owner_email", "owner_phone", "owner_notes", "property_id", "title", "price", "location", "sales_stage", "chatbot_stage"])
    base = [o.get("id"), o.get("owner_name"), o.get("owner_email"), o.get("owner_phone"), o.get("owner_notes")]
    for p in (o.get("properties") or []):
        w.writerow(base + [p.get("id"), p.get("title"), p.get("price"), p.get("location"), p.get("sales_pipeline_stage"), p.get("chatbot_pipeline_stage")])
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=crm_owner_{owner_id}_export.csv"})


@app.get("/api/crm/conversations/export")
def export_crm_conversations_csv():
    """Export all CRM conversation history as CSV."""
    import csv
    import io
    rows = crm_get_all_conversations_flat()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["id", "property_id", "channel", "sender", "timestamp", "message_text"])
    for r in rows:
        w.writerow([r.get("id"), r.get("property_id"), r.get("channel"), r.get("sender"), r.get("timestamp"), (r.get("message_text") or "")[:500]])
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=crm_chat_history_export.csv"})


@app.post("/api/crm/bulk-update")
def bulk_update_crm(body: dict[str, Any]) -> dict[str, Any]:
    """Bulk update: pass owner_ids or property_ids and sales_pipeline_stage and/or chatbot_pipeline_stage, last_contact_date (set to now)."""
    owner_ids = body.get("owner_ids") or []
    property_ids = body.get("property_ids") or []
    updates: dict[str, Any] = {}
    if body.get("sales_pipeline_stage") is not None:
        updates["sales_pipeline_stage"] = body["sales_pipeline_stage"]
    if body.get("chatbot_pipeline_stage") is not None:
        updates["chatbot_pipeline_stage"] = body["chatbot_pipeline_stage"]
    if body.get("mark_contacted") is True:
        updates["last_contact_date"] = int(__import__("time").time())
    if not updates:
        return {"ok": True, "updated": 0}
    owners = crm_get_all_owners()
    ids_to_update = set(property_ids)
    if owner_ids:
        for o in owners:
            if o.get("id") in owner_ids:
                for p in (o.get("properties") or []):
                    ids_to_update.add(p.get("id"))
    count = 0
    for pid in ids_to_update:
        if crm_update_property(pid, **updates):
            count += 1
    return {"ok": True, "updated": count}


@app.patch("/api/crm/properties/{property_id:int}")
def patch_crm_property(property_id: int, body: dict[str, Any]) -> dict[str, Any]:
    """Update a CRM property (e.g. sales_pipeline_stage, chatbot_pipeline_stage)."""
    ok = crm_update_property(property_id, **body)
    if not ok:
        raise HTTPException(status_code=404, detail="Property not found")
    return {"ok": True}


@app.post("/api/crm/valuate")
def crm_valuate_property(body: dict[str, Any]) -> dict[str, Any]:
    """
    Run property valuation (daily rental context) for a CRM property.
    Uses lib.property_evaluator: market data cache, future context 2026–2031, ai_lm_content prompt + reference.
    Body: title?, description?, location? (city), price?, bedrooms?, surface_m2?, transaction_type?
    """
    try:
        from lib.property_evaluator import evaluate_property
    except ImportError as e:
        raise HTTPException(status_code=503, detail=f"Property valuation not available: {e}")
    title = (body.get("title") or "").strip()
    description = (body.get("description") or "").strip()
    listing_text = f"{title}\n\n{description}".strip() or "No description"
    city = (body.get("location") or "").strip() or None
    price = body.get("price")
    if price is not None and not isinstance(price, (int, float)):
        try:
            price = float(price)
        except (TypeError, ValueError):
            price = None
    bedrooms = body.get("bedrooms")
    if bedrooms is not None and not isinstance(bedrooms, int):
        try:
            bedrooms = int(bedrooms)
        except (TypeError, ValueError):
            bedrooms = None
    surface_m2 = body.get("surface_m2")
    if surface_m2 is not None and not isinstance(surface_m2, (int, float)):
        try:
            surface_m2 = float(surface_m2)
        except (TypeError, ValueError):
            surface_m2 = None
    listing = {
        "title": title or "",
        "description": description or "",
        "sale_price": price,
        "rent_price": price,
        "bedrooms": bedrooms,
        "surface_m2": surface_m2,
    }
    try:
        result = evaluate_property(listing_text, city=city, listing=listing)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Valuation failed: {e}")
    out = {k: v for k, v in result.items() if k != "market_data"}
    if result.get("market_data"):
        md = result["market_data"]
        out["market_summary"] = {
            "adr": md.get("adr"),
            "occupancy": md.get("occupancy"),
            "price_range": md.get("price_range"),
            "from_fallback": md.get("from_fallback"),
        }
    return out


def _get_leads_from_db(limit: int = 500) -> list[dict[str, Any]]:
    """Leads from DB abstraction (providers.db or Mongo)."""
    try:
        from lib.db import get_collection
        coll = get_collection("leads")
        rows = coll.find({}, limit=limit)
        out = []
        for r in (rows or []):
            d = dict(r)
            if d.get("id") is not None and not isinstance(d["id"], int):
                try:
                    d["id"] = int(d["id"])
                except (TypeError, ValueError):
                    pass
            if d.get("timestamp") is not None and not isinstance(d["timestamp"], (int, float)):
                try:
                    d["timestamp"] = int(d["timestamp"])
                except (TypeError, ValueError):
                    d["timestamp"] = 0
            out.append(d)
        return out
    except Exception:
        return []


def _get_agents_from_db(limit: int = 500) -> list[dict[str, Any]]:
    """Agents from DB abstraction."""
    try:
        from lib.db import get_collection
        coll = get_collection("agents")
        rows = coll.find({}, limit=limit)
        out = []
        for r in (rows or []):
            d = dict(r)
            if d.get("id") is not None and not isinstance(d["id"], int):
                try:
                    d["id"] = int(d["id"])
                except (TypeError, ValueError):
                    pass
            if d.get("timestamp") is not None and not isinstance(d["timestamp"], (int, float)):
                try:
                    d["timestamp"] = int(d["timestamp"])
                except (TypeError, ValueError):
                    d["timestamp"] = 0
            out.append(d)
        return out
    except Exception:
        return []


def _get_activity_logs_from_db(limit: int = 50) -> list[dict[str, Any]]:
    """Activity logs from DB (activity_logs table)."""
    try:
        from lib.db import get_collection
        coll = get_collection("logs")
        rows = coll.find({}, limit=limit)
        out = []
        for r in (rows or []):
            d = dict(r)
            ts = d.get("timestamp")
            if d.get("time") in (None, ""):
                d["time"] = str(ts) if ts is not None else ""
            if d.get("id") is not None and not isinstance(d["id"], int):
                try:
                    d["id"] = int(d["id"])
                except (TypeError, ValueError):
                    pass
            out.append(d)
        return out
    except Exception:
        return []


@app.get("/api/leads")
def get_leads(limit: int = 500) -> list[dict[str, Any]]:
    """Return leads from DB (lib/db abstraction)."""
    return _get_leads_from_db(limit=limit)


@app.get("/api/agents")
def get_agents(limit: int = 500) -> list[dict[str, Any]]:
    """Return agents from DB (lib/db abstraction)."""
    return _get_agents_from_db(limit=limit)


@app.get("/api/config")
def get_config() -> dict[str, Any]:
    """Return runtime config for bot/UI (from settings + defaults)."""
    return _load_settings()


@app.post("/api/config")
def post_config(body: dict[str, Any]) -> dict[str, Any]:
    """Update config (merge with existing)."""
    return post_settings(body)


@app.get("/api/database")
def get_database() -> dict[str, Any]:
    """Return DB status (Mongo configured or not) for Data page."""
    configured = bool(os.getenv("MONGO_URI"))
    out = {"configured": configured}
    if configured:
        try:
            from pymongo import MongoClient
            uri = os.getenv("MONGO_URI", "")
            # Do not expose password
            if "@" in uri:
                out["user"] = "set"
                out["cluster"] = "Atlas"
            else:
                out["user"] = None
                out["cluster"] = None
            client = MongoClient(uri)
            client.admin.command("ping")
            out["message"] = "Connected"
        except Exception as e:
            out["message"] = str(e)
    else:
        out["message"] = "Local SQLite (MONGO_URI not set)"
    return out


@app.get("/api/logs")
def get_logs() -> list[dict[str, Any]]:
    """Return activity logs from DB (activity_logs table), or fallback to data/bot.log."""
    db_logs = _get_activity_logs_from_db(limit=50)
    if db_logs:
        return db_logs
    repo_root = Path(__file__).resolve().parent.parent
    log_paths = [repo_root / "data" / "bot.log", repo_root / "bot.log"]
    for log_path in log_paths:
        if log_path.exists():
            try:
                lines = log_path.read_text().strip().split("\n")
                entries = []
                for i, line in enumerate(reversed(lines[-50:])):
                    line = line.strip()
                    if not line:
                        continue
                    entries.append({
                        "id": i + 1,
                        "timestamp": 0,
                        "time": line[:80] if len(line) > 80 else line,
                        "listing_hash": None,
                        "contact_email": None,
                        "listing_url": None,
                        "status": "info",
                        "channel": None,
                        "details": line,
                    })
                return entries[:50]
            except Exception:
                pass
    return []


# ---------- Auth ----------
AUTH_TOKEN_HEADER = "Authorization"


@app.get("/api/auth/me")
def auth_me(authorization: str | None = Header(None, alias=AUTH_TOKEN_HEADER)):
    """Return current user from JWT or 401."""
    user = auth_lib.get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {
        "id": user["id"],
        "provider": user["provider"],
        "email": user.get("email"),
        "name": user.get("name") or "Local User",
        "avatar_url": user.get("avatar_url"),
        "user_type": user.get("user_type", "local"),
    }


@app.post("/api/auth/logout")
def auth_logout():
    """Server-side logout is no-op; client clears token."""
    return {"ok": True}


@app.post("/api/auth/local")
def auth_local():
    """Create or use local user (no OAuth), return JWT. Sets mode to local."""
    _set_mode_from_user("local")
    user = auth_lib.create_local_user()
    token = auth_lib.encode_jwt(user["id"], "local")
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "provider": user["provider"],
            "email": user.get("email"),
            "name": user.get("name") or "Local User",
            "avatar_url": user.get("avatar_url"),
            "user_type": user.get("user_type", "local"),
        },
    }


# OAuth (optional: only if authlib and credentials are set)
_oauth = None


def _get_oauth():
    global _oauth
    if _oauth is not None:
        return _oauth
    try:
        from authlib.integrations.starlette_client import OAuth
        oauth = OAuth()
        g_id, g_secret = os.getenv("GOOGLE_CLIENT_ID"), os.getenv("GOOGLE_CLIENT_SECRET")
        if g_id and g_secret:
            oauth.register(
                name="google",
                client_id=g_id,
                client_secret=g_secret,
                server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
                client_kwargs={"scope": "openid email profile"},
            )
        li_id, li_secret = os.getenv("LINKEDIN_CLIENT_ID"), os.getenv("LINKEDIN_CLIENT_SECRET")
        if li_id and li_secret:
            oauth.register(
                name="linkedin",
                client_id=li_id,
                client_secret=li_secret,
                server_metadata_url="https://www.linkedin.com/oauth/.well-known/openid-configuration",
                client_kwargs={"scope": "openid profile email"},
            )
        _oauth = oauth
    except ImportError:
        _oauth = False
    return _oauth


def _auth_callback_url(request: Request, provider: str) -> str:
    """Absolute URL for OAuth callback (backend)."""
    base = os.getenv("API_BASE_URL") or str(request.base_url).rstrip("/")
    return f"{base}/api/auth/{provider}/callback"


@app.get("/api/auth/google/login")
async def auth_google_login(request: Request):
    """Redirect to Google OAuth consent."""
    oauth = _get_oauth()
    if not oauth or not hasattr(oauth, "google"):
        raise HTTPException(status_code=503, detail="Google OAuth not configured (set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)")
    redirect_uri = _auth_callback_url(request, "google")
    return await oauth.google.authorize_redirect(request, redirect_uri)


@app.get("/api/auth/google/callback")
async def auth_google_callback(request: Request):
    """Exchange code for token, create/update user, redirect to frontend with JWT."""
    oauth = _get_oauth()
    if not oauth or not hasattr(oauth, "google"):
        raise HTTPException(status_code=503, detail="Google OAuth not configured")
    redirect_uri = _auth_callback_url(request, "google")
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        return RedirectResponse(f"{AUTH_FRONTEND_URL}/?auth_error=" + __import__("urllib.parse").quote(str(e)))
    userinfo = token.get("userinfo") or {}
    sub = userinfo.get("sub") or ""
    email = userinfo.get("email")
    name = userinfo.get("name")
    picture = userinfo.get("picture")
    user = auth_lib.create_user_from_oauth("google", sub, email, name, picture)
    _set_mode_from_user(user.get("user_type", "google"))
    jwt_token = auth_lib.encode_jwt(user["id"], "google")
    return RedirectResponse(f"{AUTH_FRONTEND_URL}/#auth_token={jwt_token}")


@app.get("/api/auth/linkedin/login")
async def auth_linkedin_login(request: Request):
    """Redirect to LinkedIn OAuth consent."""
    oauth = _get_oauth()
    if not oauth or not hasattr(oauth, "linkedin"):
        raise HTTPException(status_code=503, detail="LinkedIn OAuth not configured (set LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET)")
    redirect_uri = _auth_callback_url(request, "linkedin")
    return await oauth.linkedin.authorize_redirect(request, redirect_uri)


@app.get("/api/auth/linkedin/callback")
async def auth_linkedin_callback(request: Request):
    """Exchange code for token, create/update user, redirect to frontend with JWT."""
    oauth = _get_oauth()
    if not oauth or not hasattr(oauth, "linkedin"):
        raise HTTPException(status_code=503, detail="LinkedIn OAuth not configured")
    redirect_uri = _auth_callback_url(request, "linkedin")
    try:
        token = await oauth.linkedin.authorize_access_token(request)
    except Exception as e:
        return RedirectResponse(f"{AUTH_FRONTEND_URL}/?auth_error=" + __import__("urllib.parse").quote(str(e)))
    userinfo = token.get("userinfo")
    if not userinfo:
        # Fetch userinfo from LinkedIn
        try:
            async with __import__("httpx").AsyncClient() as client:
                r = await client.get(
                    "https://api.linkedin.com/v2/userinfo",
                    headers={"Authorization": f"Bearer {token.get('access_token')}"},
                )
                if r.status_code == 200:
                    userinfo = r.json()
        except Exception:
            userinfo = {}
    sub = (userinfo or {}).get("sub") or ""
    email = (userinfo or {}).get("email")
    name = (userinfo or {}).get("name")
    picture = (userinfo or {}).get("picture")
    user = auth_lib.create_user_from_oauth("linkedin", sub, email, name, picture)
    _set_mode_from_user(user.get("user_type", "linkedin"))
    jwt_token = auth_lib.encode_jwt(user["id"], "linkedin")
    return RedirectResponse(f"{AUTH_FRONTEND_URL}/#auth_token={jwt_token}")
