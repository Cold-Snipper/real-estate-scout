#!/usr/bin/env bash
# Immo Snippy — install deps, check MongoDB, run SQLite + frontend tests.
# From repo root: ./scripts/run_all.sh   or   bash scripts/run_all.sh

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== 1. Backend Python deps (pymongo, dotenv) ==="
"${ROOT}/.venv/bin/pip" install -q -r backend/requirements.txt
echo "  OK"

echo ""
echo "=== 2. MongoDB connection check ==="
if "${ROOT}/.venv/bin/python" backend/scripts/check_mongo_connect.py; then
  echo "  MongoDB: connected"
else
  echo "  MongoDB: failed (set real password in backend/.env MONGO_URI)"
fi

echo ""
echo "=== 3. SQLite operator onboarding (init + get_provider_context) ==="
"${ROOT}/.venv/bin/python" operator_onboarding/test_context_injection.py 2>&1 | head -20
echo "  (ollama step skipped if not installed)"

echo ""
echo "=== 4. Frontend tests (Vitest) ==="
cd "${ROOT}/frontend" && npm run test 2>&1
echo "  Done"

echo ""
echo "=== All steps finished ==="
