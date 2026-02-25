"""
SNIPPY CHAT BOT - STAGE 5: API & INTEGRATION
============================================
This is the final layer that exposes the chatbot to the outside world.

Endpoint: POST /api/chat/stream
Body: { "session_id": "...", "operator_id": 1, "message": "..." }
Response: Server-Sent Events (SSE) with token-by-token streaming

Features:
- Full streaming with "typing" feel
- Real Ollama structured tool calling + streaming reply (via ChatManager)
- Error handling and logging
- Easy integration into existing FastAPI app (operator_onboarding/api_server.py)

Dependencies: Stage 1 (db, models), Stage 2 (tools), Stage 3 (prompts), Stage 4 (chat_manager).
"""

import json
import asyncio
import logging
import os
from types import SimpleNamespace
from typing import AsyncGenerator

from fastapi import APIRouter, Request, HTTPException, Header
from fastapi.responses import StreamingResponse

# ─────────────────────────────────────────────────────────────
#  STAGE 4 + MODELS (bot depends on operator_onboarding for context & operators)
# ─────────────────────────────────────────────────────────────
from snippy_chatbot.chat_manager import ChatManager

try:
    from operator_onboarding.operators import get_operator
except ImportError:
    get_operator = None  # optional if run without operator_onboarding

try:
    from snippy_chatbot.models import ChatRequest
except ImportError:
    ChatRequest = None

# Message length limit (configurable; Ollama will be integrated later)
MAX_MESSAGE_LENGTH = int(os.getenv("SNIPPY_CHAT_MAX_MESSAGE_LENGTH", "4000"))

# Optional auth: set REQUIRE_CHAT_AUTH=1 to enforce Bearer token (for when integrating online)
REQUIRE_CHAT_AUTH = os.getenv("REQUIRE_CHAT_AUTH", "").lower() in ("1", "true", "yes")

# ─────────────────────────────────────────────────────────────
#  LOGGING
# ─────────────────────────────────────────────────────────────
logger = logging.getLogger("snippy_chatbot.api")
logging.basicConfig(level=logging.INFO)

router = APIRouter(prefix="/api/chat", tags=["chatbot"])


def _require_auth(authorization: str | None = Header(None, alias="Authorization")) -> dict | None:
    """When REQUIRE_CHAT_AUTH is True, validate Bearer token and return user or raise 401."""
    if not REQUIRE_CHAT_AUTH:
        return None
    try:
        from operator_onboarding import auth as auth_lib
        user = auth_lib.get_current_user(authorization)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("Auth check failed: %s", e)
        raise HTTPException(status_code=401, detail="Authentication required")


@router.post("/stream")
async def chat_stream(
    request: Request,
    authorization: str | None = Header(None, alias="Authorization"),
) -> StreamingResponse:
    """
    Main streaming chat endpoint. Ollama integration ready; connect Ollama when available.
    Pings operator_onboarding: operator_id must exist (404 if not). Context and contact links come from there.
    Accepts JSON: { "session_id": str, "operator_id": int, "message": str }.
    Returns SSE: data: {"token": "..."} then data: [DONE], or data: {"error": "..."}.
    Set REQUIRE_CHAT_AUTH=1 to require Bearer token. Message max length via SNIPPY_CHAT_MAX_MESSAGE_LENGTH (default 4000).
    """
    _require_auth(authorization)

    try:
        body = await request.json()
        if ChatRequest is not None:
            chat_request = ChatRequest(**body)
        else:
            session_id = body.get("session_id")
            operator_id = body.get("operator_id")
            message = body.get("message")
            if not session_id or operator_id is None or not message:
                raise HTTPException(
                    status_code=400,
                    detail="session_id, operator_id, and message are required",
                )
            chat_request = SimpleNamespace(
                session_id=str(session_id),
                operator_id=int(operator_id),
                message=str(message).strip(),
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Invalid chat request body: %s", e)
        raise HTTPException(status_code=400, detail="Invalid request body")

    if len(chat_request.message) > MAX_MESSAGE_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"message exceeds maximum length ({MAX_MESSAGE_LENGTH} characters)",
        )

    # Ensure operator exists in operator_onboarding (correct ping before using context/tools)
    if get_operator is not None:
        op = get_operator(chat_request.operator_id)
        if op is None:
            raise HTTPException(
                status_code=404,
                detail=f"Operator not found: {chat_request.operator_id}. Ensure the operator exists in operator onboarding.",
            )

    logger.info(
        "Chat stream | session_id=%s | operator_id=%s | message_len=%d",
        chat_request.session_id,
        chat_request.operator_id,
        len(chat_request.message),
    )

    manager = ChatManager(
        session_id=chat_request.session_id,
        operator_id=chat_request.operator_id,
    )

    async def event_stream() -> AsyncGenerator[str, None]:
        try:
            async for token in manager.process_message(chat_request.message):
                yield f"data: {json.dumps({'token': token})}\n\n"
                await asyncio.sleep(0.008)

            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.exception("Stream error: %s", e)
            yield f"data: {json.dumps({'error': 'Something went wrong. Please try again.'})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


# ─────────────────────────────────────────────────────────────
#  STANDALONE APP (for quick testing without main api_server)
#  Run: python -m snippy_chatbot.api
#  Then: curl -N -X POST http://localhost:9000/api/chat/stream -H "Content-Type: application/json" -d '{"session_id":"test-001","operator_id":1,"message":"I have a 2 bedroom apartment..."}'
# ─────────────────────────────────────────────────────────────
app = None


def get_app():
    """Build a FastAPI app that includes the chat router (for standalone or testing)."""
    from fastapi import FastAPI
    a = FastAPI(title="Snippy Chat Bot API")
    a.include_router(router)
    return a


if __name__ == "__main__":
    import uvicorn
    app = get_app()
    print("Snippy Chat Bot API (standalone) -> http://localhost:9000")
    print("Stream endpoint: POST http://localhost:9000/api/chat/stream")
    print()
    print("Example curl:")
    print('  curl -N -X POST http://localhost:9000/api/chat/stream \\')
    print('    -H "Content-Type: application/json" \\')
    print('    -d \'{"session_id":"test-001","operator_id":1,"message":"I have a 2 bedroom apartment in Luxembourg City."}\'')
    print()
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=9000,
        log_level="info",
    )


# =============================================================================
# INTEGRATION INTO EXISTING API (operator_onboarding/api_server.py)
# =============================================================================
#
# 1. Near the top, with other imports, add:
#
#     from snippy_chatbot.api import router as chat_router
#
# 2. After app is created and other routers/middleware are set, add:
#
#     app.include_router(chat_router)
#
# That mounts the chatbot at POST /api/chat/stream on your main app (e.g. port 8000).
#
# =============================================================================
# CURL TEST COMMANDS
# =============================================================================
#
# Test 1 – Standalone (run first: python -m snippy_chatbot.api)
#
#   curl -N -X POST http://localhost:9000/api/chat/stream \
#     -H "Content-Type: application/json" \
#     -d '{
#       "session_id": "test-stage5-001",
#       "operator_id": 1,
#       "message": "Hello, I have a 3 bedroom apartment in Luxembourg City center renting for 2400€ long term"
#     }'
#
# Test 2 – After integration (main app on port 8000)
#
#   curl -N -X POST http://localhost:8000/api/chat/stream \
#     -H "Content-Type: application/json" \
#     -d '{
#       "session_id": "test-stage5-001",
#       "operator_id": 1,
#       "message": "Hello, I have a 3 bedroom apartment in Luxembourg City center renting for 2400€ long term"
#     }'
#
# (-N disables curl buffering so you see SSE events as they arrive.)
#
# =============================================================================
# TROUBLESHOOTING
# =============================================================================
#
# - "Invalid request body" / 400
#   Ensure JSON has session_id (string), operator_id (integer), message (string).
#
# - Stream returns only "Something went wrong" / data: [DONE]
#   ChatManager may be failing (e.g. DB path, Ollama not running). Check server logs.
#   Ensure data/crm.db exists and snippy_chatbot tables are initialized (python -m snippy_chatbot.db).
#
# - No tokens / empty stream
#   Ollama may not be running or model (e.g. qwen2.5:7b) not pulled. Start Ollama and run:
#   ollama pull qwen2.5:7b  (or set OLLAMA_MODEL in chat_manager.py to a model you have).
#
# - ImportError for snippy_chatbot when mounting in api_server
#   Run from project root so Python can resolve snippy_chatbot (e.g. uvicorn operator_onboarding.api_server:app --reload --port 8000).
#
# - Pydantic not installed
#   api.py can run without Pydantic (uses SimpleNamespace fallback). For production, install pydantic
#   so ChatRequest validation is used: pip install pydantic
