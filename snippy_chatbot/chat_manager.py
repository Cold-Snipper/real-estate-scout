"""
SNIPPY CHAT BOT - STAGE 4: CHAT MANAGER (THE BRAIN)
This is the central logic class that handles every incoming message.

Flow per message:
1. Load or create session
2. Load history (last 20–30 messages)
3. Decide if new property info → trigger valuation tool
4. Build full system prompt (using prompts.py)
5. Call Ollama twice:
   a. Structured tool-decision pass
   b. Streaming natural reply
6. Execute any tools the LLM requested
7. Stream tokens back to the caller
8. Save user + assistant messages + any valuation

Dependencies:
- Stage 1: db.py
- Stage 2: tools.py
- Stage 3: prompts.py
"""

import json
import asyncio
import logging
import re
import time
from collections import deque
from datetime import datetime, timedelta
from collections import defaultdict
from typing import AsyncGenerator, Dict, Any, List, Optional, Literal

try:
    from tenacity import (
        retry,
        stop_after_attempt,
        wait_exponential,
        wait_fixed,
        retry_if_exception_type,
    )
    TENACITY_AVAILABLE = True
except ImportError:
    TENACITY_AVAILABLE = False
    wait_fixed = None

from snippy_chatbot.db import get_db_connection
from snippy_chatbot.tools import (
    run_valuation,
    save_to_crm,
    flag_for_admin,
    generate_contact_links,
)
from snippy_chatbot.prompts import build_system_prompt
try:
    from snippy_chatbot.models import ChatMessage  # optional; used for type hints / validation
except ImportError:
    ChatMessage = None

try:
    from pydantic import BaseModel, Field
    PYDANTIC_AVAILABLE = True
except ImportError:
    BaseModel = None
    Field = None
    PYDANTIC_AVAILABLE = False

# ─────────────────────────────────────────────────────────────
#  TOOL SCHEMA – structured output for Ollama
# ─────────────────────────────────────────────────────────────
if PYDANTIC_AVAILABLE:
    class ToolCall(BaseModel):
        name: str = Field(..., description="Tool name")
        arguments: Dict[str, Any] = Field(default_factory=dict, description="JSON arguments for the tool")

    class StructuredDecision(BaseModel):
        thinking: str = Field(..., description="Step-by-step reasoning before acting")
        tool_calls: List[ToolCall] = Field(default_factory=list, description="Zero or more tool calls")
        final_reply: Optional[str] = Field(None, description="Direct reply when no tools needed")
else:
    ToolCall = None
    StructuredDecision = None

# Backward compatibility for _call_ollama_structured
StructuredResponse = StructuredDecision if PYDANTIC_AVAILABLE else None

logger = logging.getLogger("snippy_chatbot.chat_manager")

# ─────────────────────────────────────────────────────────────
#  Global rate limiter (per session, per minute)
# ─────────────────────────────────────────────────────────────
_tool_call_history: Dict[str, deque] = {}

async def _enforce_rate_limit(session_id: str) -> None:
    """Allow at most 4 tool calls per session per minute; wait if over."""
    now = datetime.utcnow()
    window = timedelta(minutes=1)
    max_calls = 4

    if session_id not in _tool_call_history:
        _tool_call_history[session_id] = deque()

    history = _tool_call_history[session_id]
    while history and history[0] < now - window:
        history.popleft()

    if len(history) >= max_calls:
        delay = (history[0] + window - now).total_seconds() + 0.5
        logger.warning("Rate limit → sleep %.1fs for session %s", delay, session_id)
        await asyncio.sleep(max(0, delay))
        await _enforce_rate_limit(session_id)

    history.append(now)

# ─────────────────────────────────────────────────────────────
#  Per-tool retry & timeout config
# ─────────────────────────────────────────────────────────────
TOOL_CONFIG = {
    "run_valuation": {"max_attempts": 5, "wait_min": 1.5, "timeout": 12},
    "save_to_crm": {"max_attempts": 2, "wait_fixed": 1, "timeout": 6},
    "flag_for_admin": {"max_attempts": 2, "wait_fixed": 1, "timeout": 4},
    "generate_contact_links": {"max_attempts": 3, "wait_min": 0.5, "timeout": 3},
}

def _get_retry_config(tool_name: str) -> Dict[str, Any]:
    """Build tenacity retry kwargs for a tool (used inside _safe_execute_tool)."""
    if not TENACITY_AVAILABLE:
        return {}
    cfg = TOOL_CONFIG.get(tool_name, {"max_attempts": 3, "wait_min": 0.5, "timeout": 8})
    wait_strategy = (
        wait_fixed(cfg["wait_fixed"])
        if cfg.get("wait_fixed") is not None and wait_fixed
        else wait_exponential(multiplier=1, min=cfg.get("wait_min", 0.5), max=30)
    )
    def _log_retry(rs):
        logger.info("Retry %s attempt %s", getattr(getattr(rs, "fn", None), "__name__", tool_name), rs.attempt_number)

    return {
        "stop": stop_after_attempt(cfg["max_attempts"]),
        "wait": wait_strategy,
        "retry": retry_if_exception_type(Exception),
        "reraise": True,
        "before_sleep": _log_retry,
    }

# ─────────────────────────────────────────────────────────────
#  CONFIG – tune these as needed (Ollama will be integrated later)
# ─────────────────────────────────────────────────────────────
MAX_HISTORY_MESSAGES = 25
SUMMARY_TRIGGER_LENGTH = 40
OLLAMA_MODEL = "qwen2.5:7b"  # or llama3.2, qwen3, etc.
# Shown when Ollama is not connected; all integrations are in place for when Ollama is added.
OLLAMA_FALLBACK_MSG = "Reply generation will be available once Ollama is connected. Please try again later or contact us directly."

# ─────────────────────────────────────────────────────────────
#  HELPER: Simple in-memory session cache (for speed)
# ─────────────────────────────────────────────────────────────
_session_cache: Dict[str, Dict] = {}


def _extract_json(text: str) -> Optional[Dict]:
    """Extract JSON object from LLM output."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return None


class ChatManager:
    def __init__(self, session_id: str, operator_id: int):
        self.session_id = session_id
        self.operator_id = operator_id
        self.history: List[Dict] = []
        self.current_valuation: Optional[Dict] = None
        self._load_session()

    def _load_session(self):
        """Load or create session from DB + load history"""
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM chat_sessions WHERE id = ?", (self.session_id,))
        session = cursor.fetchone()

        if not session:
            cursor.execute("""
                INSERT INTO chat_sessions (id, operator_id, created_at, last_message_at)
                VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (self.session_id, self.operator_id))
            conn.commit()

        cursor.execute("""
            SELECT role, content, valuation_json
            FROM chat_messages
            WHERE session_id = ?
            ORDER BY timestamp DESC
            LIMIT ?
        """, (self.session_id, MAX_HISTORY_MESSAGES))

        rows = cursor.fetchall()
        self.history = [
            {"role": row["role"], "content": row["content"]}
            for row in reversed(rows)
        ]

        cursor.execute("""
            SELECT natural_summary
            FROM valuation_results
            WHERE session_id = ?
            ORDER BY created_at DESC
            LIMIT 1
        """, (self.session_id,))
        val_row = cursor.fetchone()
        if val_row:
            self.current_valuation = {"natural_summary": val_row["natural_summary"]}

        conn.close()

    async def process_message(self, user_message: str) -> AsyncGenerator[str, None]:
        """Main entry point – called by API for each new user message"""
        await self._save_message("user", user_message)

        should_valuate = self._needs_valuation(user_message)
        valuation_result = None
        if should_valuate:
            valuation_result = await self._run_valuation(user_message)
            if valuation_result and valuation_result.get("success"):
                self.current_valuation = {
                    "natural_summary": valuation_result["natural_summary"]
                }
                if valuation_result.get("score", 0) <= 4:
                    await self._flag_for_admin("Weak valuation")

        system_prompt = build_system_prompt(
            operator_id=self.operator_id,
            valuation_summary=self.current_valuation.get("natural_summary") if self.current_valuation else None
        )

        # 4. Get structured decision from Ollama (tools + thinking + optional direct reply)
        decision = await self._call_ollama_structured(
            system_prompt=system_prompt,
            messages=self.history + [{"role": "user", "content": user_message}]
        )

        logger.info("Decision thinking: %s...", (decision.get("thinking") or "")[:150])

        # 5. Execute tools with retry logic
        tool_results = await self._execute_tools(decision.get("tool_calls", []))

        # Optional: if critical tool failed → generate fallback reply
        def _any_failed(results_dict: Dict[str, Any]) -> bool:
            for r in results_dict.values():
                items = r if isinstance(r, list) else [r]
                for one in items:
                    if isinstance(one, dict) and not one.get("success", True):
                        return True
            return False
        critical_failure = _any_failed(tool_results)
        if critical_failure and decision.get("tool_calls"):
            fallback_reply = (
                "I ran into a small technical issue while checking the details. "
                "No worries — let's keep talking. What else can you tell me about the property?"
            )
            for char in fallback_reply:
                yield char
                await asyncio.sleep(0.01)
            await self._save_message("assistant", fallback_reply)
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE chat_sessions SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?",
                (self.session_id,),
            )
            conn.commit()
            conn.close()
            return

        # 6. If LLM gave a direct final_reply and no tools → use it
        if decision.get("final_reply") and not decision.get("tool_calls"):
            full_reply = decision["final_reply"]
            for char in full_reply:
                yield char
                await asyncio.sleep(0.01)
            await self._save_message("assistant", full_reply)
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE chat_sessions SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?",
                (self.session_id,),
            )
            conn.commit()
            conn.close()
            return

        # 7. Normal streaming reply (inject tool results)
        full_reply = ""
        async for token in self._stream_ollama_reply(
            system_prompt=system_prompt,
            messages=self.history + [
                {"role": "user", "content": user_message},
                {"role": "assistant", "content": f"Internal tool results: {json.dumps(tool_results, indent=2)}"},
            ],
            tool_results=tool_results,
        ):
            full_reply += token
            yield token
            await asyncio.sleep(0.008)

        # 8. Save final assistant message and update session
        await self._save_message("assistant", full_reply)

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE chat_sessions
            SET last_message_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (self.session_id,))
        conn.commit()
        conn.close()

    async def _save_message(self, role: str, content: str, valuation_json: Optional[str] = None):
        """Save message to DB (run in thread to avoid blocking event loop)."""
        def _do():
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO chat_messages (session_id, role, content, valuation_json)
                VALUES (?, ?, ?, ?)
            """, (self.session_id, role, content, valuation_json))
            conn.commit()
            conn.close()

        await asyncio.to_thread(_do)

    def _needs_valuation(self, message: str) -> bool:
        """Heuristic: message likely contains new property details."""
        keywords = [
            "apartment", "house", "flat", "bedroom", "bed", "rent", "price", "€", "eur",
            "m²", "sqm", "m2", "location", "city center", "address", "area", "district",
            "kitchen", "bathroom", "balcony", "floor", "square", "monthly", "year",
        ]
        msg_lower = message.lower().strip()
        if len(msg_lower) < 10:
            return False
        return any(kw in msg_lower for kw in keywords)

    async def _run_valuation(self, text: str) -> Optional[Dict]:
        """Run valuation in thread (sync tool)."""
        def _do():
            return run_valuation(
                listing_text=text,
                city=None,
                operator_id=self.operator_id,
                session_id=self.session_id,
            )

        return await asyncio.to_thread(_do)

    async def _flag_for_admin(self, reason: str):
        """Flag session for admin (run in thread)."""
        await asyncio.to_thread(flag_for_admin, self.session_id, reason)

    async def _raw_tool_execution(self, name: str, args: Dict) -> Any:
        """Actual tool dispatch (no retry, no rate limit)."""
        if name == "run_valuation":
            return await self._run_valuation(args.get("listing_text", ""))
        elif name == "save_to_crm":
            kwargs = {**args, "operator_id": self.operator_id}
            return await asyncio.to_thread(save_to_crm, self.session_id, **kwargs)
        elif name == "flag_for_admin":
            return await asyncio.to_thread(
                flag_for_admin, self.session_id, args.get("reason", "Flagged by LLM")
            )
        elif name == "generate_contact_links":
            return await asyncio.to_thread(generate_contact_links, self.operator_id)
        else:
            raise ValueError(f"Unknown tool: {name}")

    async def _safe_execute_tool(self, tool_name: str, args: Dict) -> Dict[str, Any]:
        """
        Executes a single tool with rate limit, per-tool retry config, and timeout.
        Returns {"success": True, "result": ...} or {"success": False, "error": ...}.
        """
        await _enforce_rate_limit(self.session_id)
        cfg = TOOL_CONFIG.get(tool_name, {"timeout": 8})
        timeout_sec = cfg.get("timeout", 8)

        async def _do_run():
            return await asyncio.wait_for(
                self._raw_tool_execution(tool_name, args),
                timeout=timeout_sec,
            )

        if TENACITY_AVAILABLE and _get_retry_config(tool_name):
            _do_run = retry(**_get_retry_config(tool_name))(_do_run)

        try:
            result = await _do_run()
            return {"success": True, "result": result}
        except asyncio.TimeoutError:
            err = f"{tool_name} timed out after {timeout_sec}s"
            logger.error(err)
            return {
                "success": False,
                "error": err,
                "fallback": "I couldn't complete this action right now — let's continue talking about your property.",
            }
        except Exception as e:
            logger.error("Tool %s failed after retries: %s", tool_name, e)
            return {
                "success": False,
                "error": str(e),
                "fallback": "I couldn't complete this action right now — let's continue talking about your property.",
            }

    async def _call_ollama_structured(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        """
        Calls Ollama with structured JSON output + tool schema.
        Uses temperature=0 for deterministic tool decisions.
        Retries up to 3 times on parse failure.
        """
        if PYDANTIC_AVAILABLE and StructuredDecision is not None:
            tool_schema = StructuredDecision.model_json_schema()
            schema_str = json.dumps(tool_schema, indent=2)
            system_with_schema = (
                system_prompt
                + "\n\nYou MUST respond in valid JSON matching this schema:\n"
                + schema_str
            )
        else:
            system_with_schema = (
                system_prompt
                + "\n\nReply with JSON only: {\"thinking\": \"...\", \"tool_calls\": [...], \"final_reply\": \"... or null\"}"
            )

        full_messages = [{"role": "system", "content": system_with_schema}, *messages]

        def _do() -> Dict[str, Any]:
            import ollama

            for attempt in range(1, 4):
                try:
                    response = ollama.chat(
                        model=OLLAMA_MODEL,
                        messages=full_messages,
                        format="json",
                        options={
                            "temperature": 0.0,
                            "top_p": 0.95,
                            "num_predict": 1024,
                        },
                    )
                    raw_content = (response.get("message") or {}).get("content") or "{}"
                    logger.debug(
                        "[Attempt %s] Ollama raw output: %s...",
                        attempt,
                        raw_content[:300],
                    )
                    parsed = json.loads(raw_content)
                    if PYDANTIC_AVAILABLE and StructuredDecision is not None:
                        validated = StructuredDecision.model_validate(parsed)
                        return {
                            "thinking": validated.thinking,
                            "tool_calls": [tc.model_dump() for tc in validated.tool_calls],
                            "final_reply": validated.final_reply,
                        }
                    return {
                        "thinking": parsed.get("thinking", ""),
                        "tool_calls": parsed.get("tool_calls", []),
                        "final_reply": parsed.get("final_reply"),
                    }
                except (json.JSONDecodeError, ValueError) as e:
                    logger.warning("Structured parse failed (attempt %s): %s", attempt, e)
                    if attempt == 3:
                        logger.error("Giving up after 3 attempts – returning empty tool decision")
                        return {
                            "thinking": "Failed to parse structured output",
                            "tool_calls": [],
                            "final_reply": None,
                        }
                except Exception as e:
                    logger.error("Unexpected Ollama error: %s", e)
                    return {
                        "thinking": "Ollama call failed",
                        "tool_calls": [],
                        "final_reply": None,
                    }
            return {
                "thinking": "No valid response after retries",
                "tool_calls": [],
                "final_reply": None,
            }

        return await asyncio.to_thread(_do)

    async def _execute_tools(self, tool_calls: List[Dict]) -> Dict[str, Any]:
        """
        Executes tool calls sequentially with rate limit, retry, and timeout per tool.
        Duplicate tool names: results in a list; single call: single value (backward compatible).
        Returns dict of {tool_name: result_or_list_of_results}.
        """
        if not tool_calls:
            logger.info("No tools requested")
            return {}

        by_name: Dict[str, List[Any]] = defaultdict(list)
        for call in tool_calls:
            name = call.get("name")
            args = call.get("arguments") or {}
            if not name:
                continue
            one = await self._safe_execute_tool(name, args)
            by_name[name].append(one)
            if one.get("success"):
                logger.info("Tool '%s' succeeded", name)

        # Single call per name -> single value; multiple -> list (for downstream json.dumps etc.)
        results: Dict[str, Any] = {}
        for name, lst in by_name.items():
            results[name] = lst[0] if len(lst) == 1 else lst
        return results

    async def _stream_ollama_reply(
        self,
        system_prompt: str,
        messages: List[Dict],
        tool_results: Dict,
    ) -> AsyncGenerator[str, None]:
        """Stream Ollama reply token by token."""
        full_messages = [
            {"role": "system", "content": system_prompt},
        ] + messages

        def _stream_sync():
            try:
                import ollama
                stream = ollama.chat(
                    model=OLLAMA_MODEL,
                    messages=full_messages,
                    stream=True,
                )
                for chunk in stream:
                    content = (chunk.get("message") or {}).get("content") or ""
                    if content:
                        yield content
            except Exception:
                yield OLLAMA_FALLBACK_MSG

        # Run sync generator; yield each chunk and yield control to event loop
        try:
            for chunk in _stream_sync():
                yield chunk
                await asyncio.sleep(0)
        except Exception:
            yield OLLAMA_FALLBACK_MSG


# ─────────────────────────────────────────────────────────────
#  STANDALONE TEST
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import asyncio

    async def test():
        manager = ChatManager(session_id="test-session-001", operator_id=1)
        print("Processing test message...\n")
        async for token in manager.process_message("I have a 3 bedroom apartment in Kirchberg renting for 2500€"):
            print(token, end="", flush=True)
        print("\n\nTest finished.")

    asyncio.run(test())
