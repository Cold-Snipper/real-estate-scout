"""
Auth for Immo Snippy: local-first. JWT for sessions, SQLite users table.
Supports: Google OAuth, LinkedIn OAuth, and local user (no account).
"""
import os
import sqlite3
import time
from typing import Any

try:
    from .db import get_db_path, init_db
except ImportError:
    from db import get_db_path, init_db

init_db()

# JWT: use PyJWT if available, else minimal HMAC-S256 implementation
try:
    import jwt as pyjwt
    _HAS_PYJWT = True
except ImportError:
    _HAS_PYJWT = False

JWT_ALG = "HS256"
JWT_EXPIRY_SECONDS = 3600  # 1 hour
TOKEN_ISSUER = "immo-snippy"


def get_jwt_secret() -> str:
    return os.getenv("IMMO_SNIPPY_JWT_SECRET") or os.getenv("JWT_SECRET") or "immo-snippy-local-dev-secret-change-in-production"


def encode_jwt(user_id: int, provider: str) -> str:
    payload = {
        "sub": str(user_id),
        "provider": provider,
        "iss": TOKEN_ISSUER,
        "iat": int(time.time()),
        "exp": int(time.time()) + JWT_EXPIRY_SECONDS,
    }
    if _HAS_PYJWT:
        out = pyjwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALG)
        return out.decode("utf-8") if isinstance(out, bytes) else out
    import hmac
    import hashlib
    import base64
    import json
    # Minimal JWT (no PyJWT): header.payload.signature
    header = {"alg": JWT_ALG, "typ": "JWT"}
    payload["exp"] = payload["exp"]
    b64 = lambda x: base64.urlsafe_b64encode(x).rstrip(b"=").decode("ascii")
    msg = b64(json.dumps(header, separators=(",", ":")).encode()) + "." + b64(json.dumps(payload, separators=(",", ":")).encode())
    sig = hmac.new(get_jwt_secret().encode(), msg.encode(), hashlib.sha256).digest()
    return msg + "." + b64(sig)


def decode_jwt(token: str) -> dict[str, Any] | None:
    if not token or not token.strip():
        return None
    if _HAS_PYJWT:
        try:
            return pyjwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALG], issuer=TOKEN_ISSUER)
        except Exception:
            return None
    import base64
    import json
    import hmac
    import hashlib
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        raw_payload = base64.urlsafe_b64decode(parts[1] + "==")
        payload = json.loads(raw_payload)
        if payload.get("exp", 0) < time.time():
            return None
        if payload.get("iss") != TOKEN_ISSUER:
            return None
        msg = parts[0] + "." + parts[1]
        sig = base64.urlsafe_b64decode(parts[2] + "==")
        expected = hmac.new(get_jwt_secret().encode(), msg.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(sig, expected):
            return None
        return payload
    except Exception:
        return None


def _conn() -> sqlite3.Connection:
    return sqlite3.connect(str(get_db_path()))


def _row_to_user(row: tuple) -> dict[str, Any]:
    cols = ["id", "provider", "provider_id", "email", "name", "avatar_url", "user_type", "created_at", "last_login"]
    return dict(zip(cols, row))


def get_user_by_id(user_id: int) -> dict[str, Any] | None:
    conn = _conn()
    try:
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT id, provider, provider_id, email, name, avatar_url, user_type, created_at, last_login FROM users WHERE id = ?", (user_id,)).fetchone()
        if row is None:
            return None
        return dict(row)
    finally:
        conn.close()


def create_user_from_oauth(
    provider: str,
    provider_id: str,
    email: str | None,
    name: str | None,
    avatar_url: str | None,
) -> dict[str, Any]:
    """Create or update user from OAuth; return user dict and set last_login."""
    now = int(time.time())
    conn = _conn()
    try:
        conn.row_factory = sqlite3.Row
        cur = conn.execute(
            "SELECT id FROM users WHERE provider = ? AND provider_id = ?",
            (provider, provider_id),
        )
        row = cur.fetchone()
        if row:
            user_id = row[0]
            conn.execute(
                "UPDATE users SET email = ?, name = ?, avatar_url = ?, last_login = ? WHERE id = ?",
                (email, name, avatar_url, now, user_id),
            )
            conn.commit()
        else:
            cur = conn.execute(
                """INSERT INTO users (provider, provider_id, email, name, avatar_url, user_type, created_at, last_login)
                   VALUES (?, ?, ?, ?, ?, 'pro', ?, ?)""",
                (provider, provider_id, email, name, avatar_url, now, now),
            )
            user_id = cur.lastrowid
            conn.commit()
        out = get_user_by_id(user_id)
        assert out is not None
        return out
    finally:
        conn.close()


def create_local_user() -> dict[str, Any]:
    """Create or return the single local user (no OAuth)."""
    now = int(time.time())
    conn = _conn()
    try:
        conn.row_factory = sqlite3.Row
        cur = conn.execute("SELECT id FROM users WHERE provider = 'local' AND provider_id IS NULL LIMIT 1")
        row = cur.fetchone()
        if row:
            user_id = row[0]
            conn.execute("UPDATE users SET last_login = ? WHERE id = ?", (now, user_id))
            conn.commit()
        else:
            cur = conn.execute(
                """INSERT INTO users (provider, provider_id, email, name, avatar_url, user_type, created_at, last_login)
                   VALUES ('local', NULL, NULL, 'Local User', NULL, 'local', ?, ?)""",
                (now, now),
            )
            user_id = cur.lastrowid
            conn.commit()
        out = get_user_by_id(user_id)
        assert out is not None
        return out
    finally:
        conn.close()


def get_current_user(authorization: str | None) -> dict[str, Any] | None:
    """Validate Bearer token and return user dict or None."""
    if not authorization or not authorization.strip().lower().startswith("bearer "):
        return None
    token = authorization[7:].strip()
    payload = decode_jwt(token)
    if not payload:
        return None
    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        return None
    return get_user_by_id(user_id)
