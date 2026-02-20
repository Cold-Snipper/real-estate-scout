#!/usr/bin/env bash
# Start the API server on port 8000 (for use with real-estate-scout on 8080).
# From repo root: ./scripts/run-backend.sh

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -d "${ROOT}/.venv" ]; then
  echo "Creating .venv..."
  python3 -m venv .venv
  . .venv/bin/activate
  pip install -q -r operator_onboarding/requirements.txt
else
  . .venv/bin/activate
fi

echo "Starting API on http://localhost:8000 (frontend proxies /api here)"
exec .venv/bin/uvicorn operator_onboarding.api_server:app --host 0.0.0.0 --port 8000
