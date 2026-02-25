# Snippy Chat Bot — Progress Autopsy (Evidence-Based)

**CURRENT DATE:** February 25, 2026

---

## 1. GLOBAL PROJECT HEALTH OVERVIEW

- **Purpose:** Backend chatbot that conducts property-owner conversations using operator context, runs the existing property valuation pipeline, saves to CRM, flags weak valuations for admin, generates contact links, enforces 20 hard rules, and streams replies via SSE with the goal of booking a discovery call.
- **Architectural maturity:** **Proof-of-concept / MVP.** All code paths are wired and unit/standalone tests have been run for Stages 1–4; no production-like run (Ollama up + curl to `/api/chat/stream`) was executed in this thread. No frontend, no auth on the chat endpoint, no message/request limits.
- **Overall completion:** **72–75%.** Justification: Stage 1–3 100% verified; Stage 4 code complete and exercised with fallback path only (0/1 real-token stream); Stage 5 router and mount done, 0 live HTTP tests. Gaps: live Ollama + curl, auth, input bounds, production hardening.
- **Single biggest blocker:** **Real Ollama streaming never demonstrated in this thread.** All observed assistant output was the fallback string; therefore the primary value path (streaming LLM reply) is theoretical.
- **Single biggest strength:** **End-to-end wiring is present and consistent:** DB → tools (real `evaluate_property`, real CRM, real `get_provider_context`/`get_operator`) → prompts (20 rules, operator + valuation layers) → ChatManager (session, history, structured call, tool execution, stream) → FastAPI SSE and main-app mount. Standalone tests and DB writes prove the pipeline runs.

---

## 2. STAGE-BY-STAGE FORENSIC AUDIT

### Stage 1: Foundation – Database & Setup

- **Status:** Fully Verified.
- **Completion %:** 100%.
- **Files & key functions:**
  - `snippy_chatbot/__init__.py` (empty package marker).
  - `snippy_chatbot/models.py`: `ChatRequest(session_id, operator_id, message)`, `ChatMessage`, `ValuationResult` (Pydantic).
  - `snippy_chatbot/db.py`: `_get_db_path()` (lines 7–11), `DB_PATH`, `get_db_connection()` (17–21), `init_chatbot_tables()` (25–65).
- **Dependencies & wiring:** Real: same DB file as `lib.crm_storage` via `CRM_DB_PATH` or `Path(__file__).resolve().parent.parent / "data" / "crm.db"`. No placeholders.
- **Standalone test evidence:**
  - Command: `python3 -m snippy_chatbot.db`
  - Output (from conversation): `✅ Snippy Chat Bot tables initialized successfully`
- **Database impact:** Creates/ensures tables: `chat_sessions`, `chat_messages`, `valuation_results`. Row counts at that moment: 0 (fresh init). Later tests wrote rows (see Stage 4).
- **Live verification:** N/A (no HTTP). Module run is sufficient proof for this stage.
- **Defects / risks:**
  1. [Low] No WAL or connection timeout set in `get_db_connection()` — default SQLite behavior only.
  2. [Low] No migration story — schema is fixed in code.

---

### Stage 2: Tools Layer

- **Status:** Fully Verified (tools run; valuation uses project’s LLM plug, which in test returned stub).
- **Completion %:** 100%.
- **Files & key functions:**
  - `snippy_chatbot/tools.py`: `run_valuation(listing_text, city, operator_id, session_id)` (lines 39–100+), `save_to_crm(...)`, `flag_for_admin(session_id, reason)`, `generate_contact_links(operator_id)`; helpers `_extract_phone_from_text`, `_extract_email_from_text`.
- **Dependencies & wiring:**
  - Real: `from lib.property_evaluator import evaluate_property` (line 29), `from lib.crm_storage import insert_owner, insert_property` (31), `from operator_onboarding.context_builder import get_provider_context` (32), `from operator_onboarding.operators import get_operator` (33), `snippy_chatbot.db.get_db_connection` (34).
  - No mocks. Valuation calls `evaluate_property(..., model="qwen3")` (line 58); when LLM plug is not configured, that returns stub (score 0, recommendation "Avoid").
- **Standalone test evidence:**
  - Command: `python3 -m snippy_chatbot.tools`
  - Output (from conversation): Valuation block contained `"success": true`, `"score": 0`, `"recommendation": "Avoid"`, `key_risks` including "LLM valuation not implemented; plug in bot.llm or set RUN_VALUATION_LLM."; contact links: `{'whatsapp': 'https://wa.me/352661234567?...', 'phone': '+352661234567', 'email': 'contact@youragency.lu', 'calendly': ''}`.
- **Database impact:** `run_valuation` inserts into `valuation_results` (session_id, full_json, natural_summary, score, recommendation, created_at). Test did not report row count for tools-only run; chat_manager run later showed rows.
- **Live verification:** Not applicable (no HTTP). Tools are invoked from ChatManager; no separate “live” test.
- **Defects / risks:**
  1. [Medium] Valuation output depends on project’s LLM plug; if unset, score 0 and stub message — documented behavior, not a code bug.
  2. [Low] `generate_contact_links` falls back to placeholder when operator has no phone/email in notes.

---

### Stage 3: Prompts & Rules

- **Status:** Fully Verified.
- **Completion %:** 100%.
- **Files & key functions:**
  - `snippy_chatbot/prompts.py`: `build_system_prompt(operator_id, valuation_summary, current_property_info)` (lines 25–28); layers: `get_provider_context(operator_id)`, `get_prompt("property_valuation_daily_rental")`, `get_reference_context("property_valuation_daily_rental")`, 20 hard rules string, optional hidden valuation block, final reminder. `CURRENT_DATE = "February 25, 2026"` (line 22).
- **Dependencies & wiring:** Real: `operator_onboarding.context_builder.get_provider_context` (19), `ai_lm_content.loader.get_prompt`, `get_reference_context` (20).
- **Standalone test evidence:**
  - Command: `python3 -m snippy_chatbot.prompts`
  - Output (from conversation): "SAMPLE SYSTEM PROMPT (first 800 characters shown):" then text starting with "You are an expert digital Airbnb management agency outreach AI..."; "Total length: 24330 characters"; "🎉 Stage 3 test finished!"
- **Database impact:** None.
- **Live verification:** N/A.
- **Defects / risks:**
  1. [Low] `current_property_info` parameter is accepted but never used in the assembled prompt (line 28).
  2. [Low] No truncation of total prompt length; context-window handling is caller’s responsibility.

---

### Stage 4: Chat Manager

- **Status:** Code Complete but Untested Live (real Ollama stream never observed).
- **Completion %:** 90% — all functions implemented and called; 0/1 live test with real token stream.
- **Files & key functions:**
  - `snippy_chatbot/chat_manager.py`: `ChatManager.__init__`, `_load_session`, `process_message` (async generator); `_save_message`, `_needs_valuation`, `_run_valuation`, `_flag_for_admin`, `_raw_tool_execution`, `_safe_execute_tool` (rate limit + per-tool retry/timeout), `_call_ollama_structured`, `_execute_tools`, `_stream_ollama_reply`. Globals: `_tool_call_history`, `_enforce_rate_limit`, `TOOL_CONFIG`, `_get_retry_config`, `OLLAMA_MODEL = "qwen2.5:7b"` (line 149).
- **Dependencies & wiring:**
  - Real: `ollama.chat(..., format="json", options={temperature:0, top_p:0.95, num_predict:1024})` (lines 444–451); `ollama.chat(..., stream=True)` (532–535); `StructuredDecision` Pydantic model when available; `build_system_prompt`, tools (run_valuation, save_to_crm, flag_for_admin, generate_contact_links). Optional: tenacity (retry), pydantic (schema validation).
- **Standalone test evidence:**
  - Command: `python3 -m snippy_chatbot.chat_manager`
  - Output (from conversation): "INFO:snippy_chatbot.tools:Running valuation for operator 1. Text length: 59"; "INFO:snippy_chatbot.tools:Valuation completed successfully. Score: 0/10"; "WARNING:snippy_chatbot.tools:ADMIN FLAG: Session test-session-001 flagged - Reason: Weak valuation"; "Processing test message..."; then the fallback string character-by-character: "I'm sorry, I couldn't generate a reply right now. Please try again or contact us directly."; "Test finished."
- **Database impact (from conversation):**
  - `SELECT id, session_id, role, length(content) FROM chat_messages ORDER BY id DESC LIMIT 5` → 2 rows: (2, test-session-001, assistant, 90), (1, test-session-001, user, 59).
  - `SELECT session_id, score, recommendation FROM valuation_results ORDER BY id DESC LIMIT 3` → test-session-001, 0, Avoid; TEMP_SESSION, 0, Avoid.
- **Live verification:** Never. Ollama was not run in this thread; stream always hit the exception path and yielded the fallback message.
- **Defects / risks:**
  1. [Blocker for “production”] Real-token streaming path unverified — no evidence that `ollama.chat(stream=True)` was ever successfully consumed in this project run.
  2. [Medium] Sync Ollama client used inside async via `asyncio.to_thread` and sync generator in `_stream_ollama_reply` — can block during I/O.
  3. [Low] Duplicate tool name in one turn overwrites `results[name]` in `_execute_tools`.
  4. [Medium] Rate limiter `_tool_call_history` is in-memory only; lost on restart; not shared across workers.

---

### Stage 5: API & Integration

- **Status:** Code Complete but Untested Live (no curl/Postman in thread).
- **Completion %:** 85% — router and main-app mount implemented; 0 live HTTP/stream tests.
- **Files & key functions:**
  - `snippy_chatbot/api.py`: `router = APIRouter(prefix="/api/chat", tags=["chatbot"])` (line 48); `POST /stream` (51–56): reads JSON body, validates via `ChatRequest` or SimpleNamespace (67–82), builds `ChatManager`, `event_stream()` async generator yields `data: {"token": token}\n\n` then `data: [DONE]\n\n`, on exception `data: {"error": "Something went wrong. Please try again."}\n\n` then `data: [DONE]\n\n` (102–112). `get_app()` for standalone; `if __name__ == "__main__"`: uvicorn port 9000.
  - `operator_onboarding/api_server.py`: lines 43–48 try/except import `snippy_chatbot.api.router as chat_router`, set `CHAT_ROUTER_AVAILABLE`; lines 122–123 `if CHAT_ROUTER_AVAILABLE: app.include_router(chat_router)`.
- **Dependencies & wiring:** Real: `ChatManager`, request validation (Pydantic or manual). Optional: Pydantic for `ChatRequest`.
- **Standalone test evidence:** None. No command was run in the conversation to start the API or to curl it.
- **Database impact:** When the endpoint is invoked, same as Stage 4 (messages and valuation_results written by ChatManager).
- **Live verification:** Never. No curl, no Postman, no browser EventSource.
- **Defects / risks:**
  1. [High] No authentication on `/api/chat/stream` — lines 39–40 and 55 show commented-out auth dependency.
  2. [Medium] No maximum message length — only `str(message).strip()` (line 81); unbounded payload risk.
  3. [Low] Stream error path: client sees generic message; real exception only in server logs (`logger.exception`, line 110).

---

## 3. OLLAMA & LLM INTEGRATION FORENSIC CHECK

- **Configured model name:** `OLLAMA_MODEL = "qwen2.5:7b"` in `snippy_chatbot/chat_manager.py` line 149. Comment: "or llama3.2, qwen3, etc."
- **Ollama server:** Default client behavior (e.g. localhost:11434). No explicit base URL in the code audited.
- **Structured output path:** Implemented. `_call_ollama_structured` (lines 439–494): `ollama.chat(model=OLLAMA_MODEL, messages=full_messages, format="json", options={"temperature": 0.0, "top_p": 0.95, "num_predict": 1024})`; response parsed with `json.loads`; when Pydantic available, `StructuredDecision.model_validate(parsed)`; up to 3 parse attempts (loop 1–4); on failure returns `{"thinking": "...", "tool_calls": [], "final_reply": None}`.
- **Streaming path:** Implemented. `_stream_ollama_reply` (lines 518–550): `ollama.chat(model=OLLAMA_MODEL, messages=full_messages, stream=True)`; sync generator yields `(chunk.get("message") or {}).get("content") or ""`; async generator yields chunk then `await asyncio.sleep(0)`. On exception inside generator: yields exactly `"I'm sorry, I couldn't generate a reply right now. Please try again or contact us directly."` (line 541). On exception in outer try: yields exactly `"I'm sorry, I couldn't generate a reply right now. Please try again."` (line 550).
- **Temperature / options:** `temperature: 0.0`, `top_p: 0.95`, `num_predict: 1024` (lines 448–451).
- **Last confirmed real-token-stream test:** Never demonstrated in this thread. The only run of `python3 -m snippy_chatbot.chat_manager` produced the fallback string.
- **Fallback message wording (exact):**
  - First: `"I'm sorry, I couldn't generate a reply right now. Please try again or contact us directly."` (chat_manager.py line 541)
  - Second: `"I'm sorry, I couldn't generate a reply right now. Please try again."` (chat_manager.py line 550)
- **Risk if Ollama down/misconfigured/model missing:** Client receives one of the above fallback strings; no stack trace. Structured-call path returns empty tool_calls and no final_reply; stream path yields fallback. No health check or user-visible “Ollama unavailable” status.

---

## 4. DATABASE & PERSISTENCE FORENSIC AUDIT

- **File path resolution (exact code):**
  ```python
  def _get_db_path() -> Path:
      path = os.getenv("CRM_DB_PATH")
      if path:
          return Path(path)
      return Path(__file__).resolve().parent.parent / "data" / "crm.db"
  DB_PATH = _get_db_path()
  ```
  (snippy_chatbot/db.py lines 7–14)

- **Tables & schema:**
  - **chat_sessions:** id TEXT PRIMARY KEY, operator_id INTEGER NOT NULL, owner_id INTEGER, property_id INTEGER, status TEXT DEFAULT 'active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, last_message_at TIMESTAMP (db.py 31–39).
  - **chat_messages:** id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, valuation_json TEXT, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (session_id) REFERENCES chat_sessions(id) (41–49).
  - **valuation_results:** id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, full_json TEXT NOT NULL, natural_summary TEXT NOT NULL, score INTEGER NOT NULL, recommendation TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (session_id) REFERENCES chat_sessions(id) (51–59).

- **Connection handling:** `get_db_connection()` (17–21): no pool; `sqlite3.connect(str(DB_PATH))`, `row_factory = sqlite3.Row`; no explicit timeout; no WAL. Each caller opens and closes; no thread-local or pool. Not safe for concurrent writes from multiple processes.

- **Write evidence from tests (exact from conversation):**
  - After chat_manager test: `SELECT id, session_id, role, length(content) FROM chat_messages ORDER BY id DESC LIMIT 5` → 2|test-session-001|assistant|90 and 1|test-session-001|user|59.
  - `SELECT session_id, score, recommendation FROM valuation_results ORDER BY id DESC LIMIT 3` → test-session-001|0|Avoid and TEMP_SESSION|0|Avoid.
  - No `SELECT COUNT(*)` was run in the thread; counts inferred: at least 2 chat_messages, at least 2 valuation_results.

- **Read patterns:** History: `SELECT role, content, valuation_json FROM chat_messages WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?` (MAX_HISTORY_MESSAGES = 25). Latest valuation: `SELECT natural_summary FROM valuation_results WHERE session_id = ? ORDER BY created_at DESC LIMIT 1`.

- **Concurrency / lock risk:** SQLite default; no WAL; multiple workers could see "database is locked" under write load. Single-process, single-threaded usage is safe.

- **Backup / migration:** None. Schema is fixed in code; no version table or migration scripts.

---

## 5. SECURITY, RELIABILITY & OPERATIONS AUDIT

- **Authentication & authorization on /api/chat/stream:** Missing. api.py lines 39–40 and 55: optional auth is commented out; no Depends on the route. No check that operator_id belongs to the caller.
- **Input validation & bounds:** session_id, operator_id, message required (and type coercion when Pydantic absent). No maximum length on message; no JSON body size limit; no operator_id ownership or existence check.
- **Rate limiting:** Tool calls only: 4 per session per minute in `_enforce_rate_limit` (chat_manager.py 92–110). No per-IP, per-user, or global message/request rate limit.
- **Error handling & exposure:** Client sees generic "Invalid request body" (400) or "Something went wrong. Please try again." (SSE). Server logs full exception in api.py (`logger.exception`, line 110). No stack trace to client.
- **Logging:** `logging.basicConfig(level=logging.INFO)` in tools and api; loggers `snippy_chatbot.tools`, `snippy_chatbot.api`, `snippy_chatbot.chat_manager`. No file handler or structured JSON; no correlation IDs.
- **In-memory state:** `_tool_call_history` (rate limiter) and `_session_cache` (chat_manager 155 — declared but not used in hot path) are process-local; lost on restart; not shared across workers.
- **Dependency optionality:** Pydantic optional: ChatRequest falls back to SimpleNamespace + manual checks (api.py 69–82); StructuredDecision falls back to dict parsing (chat_manager). Tenacity optional: _get_retry_config returns {} when tenacity missing; no retries. Graceful degradation present but not exhaustively tested.

---

## 6. EVIDENCE TABLE — WHAT IS LITERALLY PROVEN WORKING

- `python3 -m snippy_chatbot.db` → printed `✅ Snippy Chat Bot tables initialized successfully`.
- `sqlite3 data/crm.db ".tables"` → listed chat_messages, chat_sessions, conversations, owners, properties, valuation_results (three chatbot tables present).
- `python3 -m snippy_chatbot.tools` → valuation JSON returned with success, score 0, full_json, natural_summary; contact links dict with whatsapp, phone, email, calendly.
- `python3 -m snippy_chatbot.prompts` → prompt printed; "Total length: 24330 characters"; 20 rules visible in output.
- `python3 -m snippy_chatbot.chat_manager` → ran without crash; user message saved; valuation ran (score 0); admin flag set; stream yielded fallback string; assistant message saved; session last_message_at updated.
- `SELECT ... FROM chat_messages` → 2 rows (user + assistant) for session test-session-001.
- `SELECT ... FROM valuation_results` → at least 2 rows (test-session-001 and TEMP_SESSION), score 0, recommendation Avoid.
- Chat router imported in api_server.py (try/except) and mounted when import succeeds (`if CHAT_ROUTER_AVAILABLE: app.include_router(chat_router)`).
- Standalone app: `python -m snippy_chatbot.api` starts uvicorn on port 9000 (documented in file; not run in thread).
- Request validation without Pydantic: SimpleNamespace path with session_id, operator_id, message checks (api.py 69–82).

---

## 7. COMPLETE DEFECT & TECHNICAL DEBT INVENTORY

1. [Blocker] No live test of real Ollama token stream — Impact: primary user-facing path unverified. Fix: Run Ollama, pull model, run chat_manager then curl stream and confirm tokens.
2. [High] api.py:55 — No auth on /api/chat/stream — Impact: any client can send any session_id/operator_id/message. Fix: Enable auth Depends and optionally validate operator_id.
3. [High] api.py — No message or body size limit — Impact: DoS or memory stress. Fix: Reject body or message over a chosen max (e.g. 4KB message).
4. [Medium] chat_manager.py — Rate limiter in-memory only — Impact: Lost on restart; not shared across workers. Fix: Use Redis or DB-backed store, or document single-process only.
5. [Medium] chat_manager.py — Sync Ollama in async path — Impact: Blocking possible in thread/generator. Fix: Use async Ollama client or document and accept blocking.
6. [Medium] db.py — No WAL or connection timeout — Impact: Lock risk under concurrency. Fix: Enable WAL and set timeout or document single-writer.
7. [Medium] chat_manager.py — Duplicate tool name in one turn overwrites results — Impact: Second call to same tool lost. Fix: Key results by (name, index) or list per name.
8. [Low] prompts.py:28 — current_property_info unused — Impact: Dead parameter. Fix: Use in prompt or remove.
9. [Low] api.py:110 — Client sees generic error — Impact: Harder to debug from client. Fix: Optional debug mode or error codes; keep generic in production.
10. [Low] Pydantic/tenacity optional — Impact: Reduced validation/retries when missing. Fix: Document and test fallback paths.
11. [Low] Valuation LLM stub when plug unset — Impact: Score 0, Avoid; documented. Fix: None beyond documentation.
12. [Low] api_server.py — Chat router import failure leaves app without chat — Impact: No health signal for “chat available.” Fix: Add health or capability flag.

---

## 8. PRIORITIZED NEXT-ACTION ROADMAP

1. **<Effort: Low>** Run Ollama (pull qwen2.5:7b or set OLLAMA_MODEL), then run `python3 -m snippy_chatbot.chat_manager` and confirm stream yields real tokens, not fallback. **Files:** none (env/model). **Acceptance:** stdout shows natural language reply, not "I'm sorry, I couldn't generate a reply right now."

2. **<Effort: Low>** Start API (`python3 -m snippy_chatbot.api`), run curl: `curl -N -X POST http://localhost:9000/api/chat/stream -H "Content-Type: application/json" -d '{"session_id":"audit-1","operator_id":1,"message":"I have a 2 bed in Kirchberg."}'`. **Files:** none. **Acceptance:** SSE events `data: {"token": "..."}` and `data: [DONE]` observed.

3. **<Effort: Low>** Add message length limit (e.g. 4000 chars) in api.py after validation; return 400 with clear detail if exceeded. **Files:** snippy_chatbot/api.py. **Acceptance:** curl with message length > limit returns 400.

4. **<Effort: Medium>** Enable auth on /api/chat/stream: uncomment and wire Depends (e.g. get_current_user); optionally validate operator_id. **Files:** snippy_chatbot/api.py; operator_onboarding/auth.py if needed. **Acceptance:** Unauthenticated request returns 401; valid token returns stream.

5. **<Effort: Low>** Start main app on 8000, curl POST http://localhost:8000/api/chat/stream with same body. **Files:** none. **Acceptance:** Stream returned and no import error.

6. **<Effort: Low>** In _execute_tools, preserve multiple calls to same tool (e.g. key by index or list). **Files:** snippy_chatbot/chat_manager.py. **Acceptance:** Unit or manual test with two run_valuation in one turn; both in tool_results.

7. **<Effort: Low>** In db.py, enable WAL after connection: `conn.execute("PRAGMA journal_mode=WAL")`. **Files:** snippy_chatbot/db.py. **Acceptance:** No regression; optional concurrent read test.

8. **<Effort: Medium>** Add minimal EventSource or fetch+stream example (HTML or doc) for frontend. **Files:** New static file or doc. **Acceptance:** Open in browser, send one message, see streamed reply.

9. **<Effort: Medium>** Document or implement Redis/DB-backed rate limit for multi-process. **Files:** snippy_chatbot/chat_manager.py + optional new module. **Acceptance:** Rate limit survives restart or works across workers.

10. **<Effort: Low>** Use or remove current_property_info in build_system_prompt. **Files:** snippy_chatbot/prompts.py. **Acceptance:** Parameter used in prompt or removed from signature.

---

## 9. FINAL RISK HEATMAP

| Risk Area                        | Severity | Mitigation Status | Next Action                                      |
|----------------------------------|----------|-------------------|--------------------------------------------------|
| Ollama real-token stream untested| Blocker  | Unverified        | Run Ollama + chat_manager; confirm real tokens  |
| No auth on /api/chat/stream      | High     | Missing           | Enable auth Depends; validate operator_id        |
| No message/body size limit       | High     | Missing           | Add max length; return 400                       |
| Rate limiter in-memory only      | Medium   | Partial           | Document or move to Redis/DB                     |
| Sync Ollama in async             | Medium   | Accepted          | Document or adopt async client                   |
| SQLite concurrency / WAL         | Medium   | Missing           | Enable WAL; document single-writer if needed     |
| Duplicate tool name overwrite    | Low      | Missing           | Key results by index or list                     |
| current_property_info unused     | Low      | Missing           | Use in prompt or remove                          |
| Pydantic/tenacity optional       | Low      | Documented        | Test fallback paths                              |
| No live curl to stream           | High     | Unverified        | Run curl to 9000 and 8000                        |

---

End of audit.
