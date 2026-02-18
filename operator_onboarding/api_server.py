"""
Minimal FastAPI server bridging the Operator Onboarding UI to operator_onboarding Python logic.
Run: uvicorn operator_onboarding.api_server:app --reload --port 8000
"""
import json
import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, RedirectResponse

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


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/operators")
def list_operators() -> list[dict[str, Any]]:
    return get_all_operators()


@app.post("/api/operators")
def post_operator(body: dict[str, Any]) -> dict[str, Any]:
    # Frontend sends: company_name, website_url, tagline, countries, tone_style,
    # ideal_client_profile, preferred_property_types, pricing_model, qualification_rules,
    # calendly_link, notes. Optional: services, usps, key_phrases, languages, rules, etc.
    op_id = create_operator(body)
    return {"id": op_id, "ok": True}


@app.get("/api/operators/{operator_id:int}")
def get_operator_by_id(operator_id: int) -> dict[str, Any]:
    op = get_operator(operator_id)
    if op is None:
        raise HTTPException(status_code=404, detail="Operator not found")
    return op


@app.patch("/api/operators/{operator_id:int}")
def patch_operator(operator_id: int, body: dict[str, Any]) -> dict[str, Any]:
    ok = update_operator(operator_id, body)
    if not ok:
        raise HTTPException(status_code=404, detail="Operator not found")
    op = get_operator(operator_id)
    return op


@app.get("/api/operators/{operator_id:int}/documents")
def list_documents(operator_id: int) -> list[dict[str, Any]]:
    return get_documents(operator_id)


@app.post("/api/operators/{operator_id:int}/documents")
def post_document(operator_id: int, body: dict[str, Any]) -> dict[str, Any]:
    name = (body.get("name") or "").strip() or "Untitled"
    document_type = body.get("document_type") or "other"
    if document_type not in DOCUMENT_TYPES:
        document_type = "other"
    content = body.get("content") or ""
    file_path = body.get("file_path")
    doc_id = create_document(operator_id, name, document_type, content, file_path)
    return {"id": doc_id, "ok": True}


@app.delete("/api/operators/{operator_id:int}/documents/{doc_id:int}")
def delete_document_by_id(operator_id: int, doc_id: int) -> dict[str, bool]:
    doc = get_document(doc_id)
    if doc is None or doc.get("operator_id") != operator_id:
        raise HTTPException(status_code=404, detail="Document not found")
    ok = delete_document(doc_id)
    return {"ok": ok}


@app.delete("/api/operators/{operator_id:int}")
def delete_operator_by_id(operator_id: int) -> dict[str, bool]:
    ok = delete_operator(operator_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Operator not found")
    return {"ok": True}


@app.post("/api/operators/reset-defaults")
def reset_default_operators() -> dict[str, Any]:
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
def get_operator_context(operator_id: int) -> str:
    op = get_operator(operator_id)
    if op is None:
        raise HTTPException(status_code=404, detail="Operator not found")
    return get_provider_context(operator_id)


@app.post("/api/operators/{operator_id:int}/test-message")
def test_message(operator_id: int, body: dict[str, Any]) -> dict[str, str]:
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


@app.get("/api/logs")
def get_logs() -> list[dict[str, Any]]:
    """Return last 50 log entries from data/bot.log or empty list."""
    repo_root = Path(__file__).resolve().parent.parent
    log_paths = [repo_root / "data" / "bot.log", repo_root / "bot.log"]
    for log_path in log_paths:
        if log_path.exists():
            try:
                lines = log_path.read_text().strip().split("\n")
                entries = []
                for line in reversed(lines[-50:]):
                    line = line.strip()
                    if not line:
                        continue
                    entries.append({"timestamp": "", "action": "log", "details": line, "status": "info"})
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
    """Create or use local user (no OAuth), return JWT."""
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
    jwt_token = auth_lib.encode_jwt(user["id"], "linkedin")
    return RedirectResponse(f"{AUTH_FRONTEND_URL}/#auth_token={jwt_token}")
