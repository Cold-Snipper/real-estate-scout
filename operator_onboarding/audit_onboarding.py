#!/usr/bin/env python3
"""
Immo Snippy — Deep audit: onboarding + context + APIs + LLM plugs.
Run from repo root: python operator_onboarding/audit_onboarding.py
"""
import json
import os
import sqlite3
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
os.chdir(REPO_ROOT)
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

def section(title: str) -> None:
    print("\n" + "=" * 60)
    print(title)
    print("=" * 60)

def main() -> None:
    report = []
    mode = "local"

    # ─── 1. DB Mode ─────────────────────────────────────────────────────
    section("1. DB MODE")
    try:
        from lib.db import get_mode, get_db, MODE_ENV
        mode = get_mode()
        env_mode = os.getenv(MODE_ENV, "(not set)")
        print(f"  lib/db get_mode(): {mode}")
        print(f"  IMMO_SNIPPY_MODE env: {env_mode or 'defaults to local'}")
        report.append(("Mode", f"Local (SQLite) / Cloud (MongoDB): lib/db reports '{mode}' (env: {env_mode or 'default'})"))
    except Exception as e:
        print(f"  Error: {e}")
        report.append(("Mode", f"Error: {e}"))

    # Operator onboarding uses its own SQLite (operator_onboarding/db.py), not lib/db.
    try:
        from operator_onboarding.db import get_db_path, init_db
        db_path = init_db()
        print(f"  Operator API data source: SQLite at {db_path}")
        report.append(("Operator DB", f"SQLite at {db_path} (operator_onboarding; not lib/db)"))
    except Exception as e:
        print(f"  Operator DB init error: {e}")
        report.append(("Operator DB", f"Error: {e}"))

    # ─── 2. Connection test ───────────────────────────────────────────────
    section("2. CONNECTION TEST")
    if mode == "cloud":
        try:
            from pymongo import MongoClient
            uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
            db_name = os.getenv("MONGO_DB_NAME", "coldbot")
            client = MongoClient(uri)
            client.admin.command("ping")
            db = client[db_name]
            colls = list(db.list_collection_names())
            op_count = db.operators.count_documents({}) if "operators" in db.list_collection_names() else 0
            print(f"  MongoDB: PASS (uri={uri[:40]}..., db={db_name})")
            print(f"  Collections: {colls}")
            print(f"  operators count: {op_count}")
            report.append(("Connection", f"PASS (MongoDB). Collections: {colls}. operators count: {op_count}"))
        except Exception as e:
            print(f"  MongoDB: FAIL - {e}")
            report.append(("Connection", f"FAIL: {e}"))
    else:
        try:
            from operator_onboarding.db import get_db_path, init_db
            path = init_db()
            conn = sqlite3.connect(str(path))
            cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            tables = [r[0] for r in cur.fetchall()]
            cur = conn.execute("SELECT COUNT(*) FROM operators")
            count = cur.fetchone()[0]
            conn.close()
            print(f"  SQLite: PASS ({path})")
            print(f"  Tables: {tables}")
            print(f"  operators count: {count}")
            report.append(("Connection", f"PASS (SQLite). Tables: {tables}. operators count: {count}"))
        except Exception as e:
            print(f"  SQLite: FAIL - {e}")
            report.append(("Connection", f"FAIL: {e}"))

    # ─── 3. API endpoints (from code) ──────────────────────────────────────
    section("3. API ENDPOINTS (from api_server.py)")
    endpoints = [
        ("GET", "/health"),
        ("GET", "/api/operators"),
        ("POST", "/api/operators"),
        ("GET", "/api/operators/{operator_id}"),
        ("PATCH", "/api/operators/{operator_id}"),
        ("DELETE", "/api/operators/{operator_id}"),
        ("GET", "/api/operators/{operator_id}/documents"),
        ("POST", "/api/operators/{operator_id}/documents"),
        ("DELETE", "/api/operators/{operator_id}/documents/{doc_id}"),
        ("GET", "/api/operators/{operator_id}/context"),
        ("POST", "/api/operators/{operator_id}/test-message"),
        ("POST", "/api/operators/reset-defaults"),
        ("GET", "/api/settings"),
        ("POST", "/api/settings"),
        ("GET", "/api/logs"),
        ("GET", "/api/auth/me"),
        ("POST", "/api/auth/logout"),
        ("POST", "/api/auth/local"),
    ]
    for method, path in endpoints:
        print(f"  {method:6} {path}")
    report.append(("API Endpoints", "Listed above; will test /api/operators* next"))

    # ─── 4. Call /api/operators endpoints ─────────────────────────────────
    section("4. CALL /api/operators ENDPOINTS")
    base = os.getenv("API_BASE_URL", "http://localhost:8000")
    try:
        import urllib.request
        import urllib.error
        def req(method: str, url: str, data: dict | None = None) -> tuple[int, str]:
            body = json.dumps(data).encode() if data else None
            r = urllib.request.Request(url, data=body, method=method)
            if body:
                r.add_header("Content-Type", "application/json")
            try:
                with urllib.request.urlopen(r, timeout=5) as res:
                    return res.status, res.read().decode()[:500]
            except urllib.error.HTTPError as e:
                return e.code, (e.read().decode() if e.fp else str(e))[:500]
            except Exception as e:
                return -1, str(e)[:300]

        # GET /api/operators
        status, body = req("GET", f"{base}/api/operators")
        print(f"  GET  /api/operators         -> {status} | {body[:200]}...")
        report.append(("GET /api/operators", f"{status} | {body[:150]}..."))

        # GET /api/operators/1
        status, body = req("GET", f"{base}/api/operators/1")
        print(f"  GET  /api/operators/1       -> {status} | {body[:200]}...")
        report.append(("GET /api/operators/1", f"{status} | {body[:150]}..."))

        # POST /api/operators (create test)
        status, body = req("POST", f"{base}/api/operators", {"company_name": "Audit Test Co", "tagline": "Test"})
        print(f"  POST /api/operators        -> {status} | {body[:200]}")
        report.append(("POST /api/operators", f"{status} | {body[:150]}"))

        # GET /api/operators/1/context
        status, body = req("GET", f"{base}/api/operators/1/context")
        print(f"  GET  /api/operators/1/context -> {status} | (length {len(body)})")
        report.append(("GET /api/operators/1/context", f"{status} | length={len(body)}"))

        # PATCH /api/operators/1
        status, body = req("PATCH", f"{base}/api/operators/1", {"tagline": "Updated"})
        print(f"  PATCH /api/operators/1      -> {status}")
        report.append(("PATCH /api/operators/1", str(status)))

        # GET /api/operators/1/documents
        status, body = req("GET", f"{base}/api/operators/1/documents")
        print(f"  GET  /api/operators/1/documents -> {status} | {body[:150]}...")
        report.append(("GET /api/operators/1/documents", f"{status}"))

    except Exception as e:
        print(f"  API calls skipped (server not running?): {e}")
        report.append(("API calls", f"Skipped: {e}"))

    # ─── 5. Load one operator from DB ─────────────────────────────────────
    section("5. OPERATOR LOAD (raw data)")
    try:
        from operator_onboarding.operators import get_operator, get_all_operators
        all_ops = get_all_operators()
        op = get_operator(1) if all_ops else None
        if not op and all_ops:
            first_id = all_ops[0].get("id")
            op = get_operator(first_id) if first_id else None
        if op:
            raw = {k: (str(v)[:80] + "..." if isinstance(v, str) and len(str(v)) > 80 else v) for k, v in op.items()}
            print("  Success. Sample (truncated):")
            print(json.dumps(raw, indent=2, default=str)[:1200])
            report.append(("Operator Load", "success"))
            report.append(("Operator raw sample", json.dumps(raw, default=str)[:400]))
        else:
            print("  No operators in DB (id=1 or first).")
            report.append(("Operator Load", "no operators"))
    except Exception as e:
        print(f"  Fail: {e}")
        report.append(("Operator Load", f"fail: {e}"))

    # ─── 6. Context builder: first 500 chars ────────────────────────────────
    section("6. CONTEXT BUILDER (first 500 chars)")
    try:
        from operator_onboarding.context_builder import get_provider_context
        oid = op.get("id", 1) if op else 1
        ctx = get_provider_context(oid)
        snippet = ctx[:500] if ctx else "(empty)"
        print(snippet)
        print("  ...")
        report.append(("Context Builder", f"First 500 chars: {snippet[:200]}..."))
    except Exception as e:
        print(f"  Error: {e}")
        report.append(("Context Builder", f"Error: {e}"))

    # ─── 7. LLM injection points ──────────────────────────────────────────
    section("7. LLM PLUG POINT")
    plug_found = False
    locations = []
    try:
        with open(REPO_ROOT / "bot" / "llm.py") as f:
            src = f.read()
        if "provider_id" in src and "get_provider_context" in src and "system_content" in src:
            plug_found = True
            locations.append("bot/llm.py generate_proposal(..., provider_id=...) -> get_provider_context(provider_id) as system_content in _chat_json")
        try:
            from bot.llm import generate_proposal
            import inspect
            sig = inspect.signature(generate_proposal)
            if "provider_id" in sig.parameters:
                locations.append("bot/llm.py: generate_proposal(provider_id=...) confirmed by inspect")
        except ImportError:
            locations.append("(ollama not installed; plug verified from source)")
    except Exception as e:
        locations.append(f"Error: {e}")
    print("  Found:" if plug_found else "  Not found (or error)")
    for loc in locations:
        print(f"    - {loc}")
    report.append(("LLM Plug Point", "Found" if plug_found else "Not found"))
    report.append(("LLM Plug locations", "; ".join(locations)))

    # ─── 8. Full flow simulation ──────────────────────────────────────────
    section("8. FULL FLOW SIMULATION")
    try:
        from operator_onboarding.context_builder import get_provider_context
        oid = op.get("id", 1) if op else 1
        ctx = get_provider_context(oid)
        # Simulate what LLM receives: system = context + "Return JSON only."
        simulated_system = ctx + "\n\nReturn JSON only."
        prompt_snippet = simulated_system[:400] + "..." if len(simulated_system) > 400 else simulated_system
        print("  Simulated system prompt (first ~400 chars):")
        print("  ", prompt_snippet[:400].replace("\n", "\n   "))
        report.append(("Full Flow", "pass (context built and would be injected)"))
        report.append(("Generated prompt snippet", prompt_snippet[:300] + "..."))
        try:
            from bot.llm import generate_proposal
            result = generate_proposal("3-bed apartment, €1,200/mo.", model="llama3.2", provider_id=oid)
            print("  Live LLM call: subject =", result.get("subject", "")[:60], "| body length =", len(result.get("body", "")))
            report.append(("Full Flow live", f"pass | subject={str(result.get('subject',''))[:50]}..."))
        except ImportError as e:
            print("  Live LLM call skipped (ollama not installed). Context injection path verified from code.")
            report.append(("Full Flow live", "skip (ollama not installed)"))
    except Exception as e:
        print(f"  Fail: {e}")
        report.append(("Full Flow", f"fail: {e}"))

    # Summary
    section("AUDIT SUMMARY")
    for k, v in report:
        print(f"  {k}: {v[:120]}{'...' if len(str(v)) > 120 else ''}")

if __name__ == "__main__":
    main()
