#!/usr/bin/env bash
# One-command start: API (8000) + frontend (8080). App at http://localhost:8080
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [ ! -d "${ROOT}/.venv" ]; then
  echo "Creating .venv and installing API deps..."
  python3 -m venv .venv
  . .venv/bin/activate
  pip install -q -r operator_onboarding/requirements.txt
else
  . .venv/bin/activate
fi

echo "Starting API on port 8000..."
.venv/bin/uvicorn operator_onboarding.api_server:app --host 127.0.0.1 --port 8000 &
API_PID=$!
sleep 2

echo "Starting frontend on port 8080..."
(cd real-estate-scout && (test -d node_modules || npm install) && npm run dev) &
VITE_PID=$!

echo ""
echo "Immo Snippy running:"
echo "  App:  http://localhost:8080"
echo "  CRM:  http://localhost:8080/crm"
echo "  API:  http://localhost:8000"
echo "Press Ctrl+C to stop."
trap "kill $API_PID $VITE_PID 2>/dev/null; exit" INT TERM
wait
