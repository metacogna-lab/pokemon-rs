#!/usr/bin/env bash
set -euo pipefail

BUN="/Users/nullzero/Library/Application Support/reflex/bun/bin/bun"
BACKEND_PID=""
FRONTEND_PID=""
BIND="${BIND_ADDR:-0.0.0.0:8080}"
PORT="${BIND##*:}"
API_BASE="http://localhost:${PORT}/v1"

cleanup() {
  echo ""
  echo "Shutting down..."
  [[ -n "$BACKEND_PID" ]]  && kill "$BACKEND_PID"  2>/dev/null || true
  [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "=== pokemon-rs launcher ==="
echo ""

# 1. Prerequisites
if ! command -v cargo &>/dev/null; then
  echo "ERROR: cargo not found. Install Rust via https://rustup.rs/"
  exit 1
fi
if ! "$BUN" --version &>/dev/null; then
  echo "ERROR: bun not found at: $BUN"
  exit 1
fi
echo "Prerequisites OK  (cargo $(cargo --version | cut -d' ' -f2), bun $("$BUN" --version))"
echo ""

# 2. Validate API_KEYS (warn only — dev mode works without keys)
if [[ -z "${API_KEYS:-}" ]]; then
  echo "WARN: API_KEYS is not set — backend will accept all requests (dev mode)"
fi

# 3. Start backend
echo "Starting Rust backend on $BIND..."
BIND_ADDR="$BIND" cargo run -p pokemon-cli -- serve &
BACKEND_PID=$!

# 4. Wait for health check
echo "Waiting for backend health..."
HEALTHY=0
for i in $(seq 1 30); do
  sleep 1
  if curl -sf "${API_BASE}/health" &>/dev/null; then
    echo "Backend healthy after ${i}s"
    HEALTHY=1
    break
  fi
done

if [[ "$HEALTHY" -ne 1 ]]; then
  echo "ERROR: Backend did not become healthy within 30s"
  exit 1
fi
echo ""

# 5. TypeScript unit tests
echo "Running TypeScript unit tests..."
cd agents && "$BUN" test && cd ..

# 6. Rust unit tests
echo "Running Rust unit tests..."
cargo test --workspace

echo ""
echo "=== System ready ==="
echo "  Backend:  ${API_BASE}"

# 7. Optional frontend
if [[ "${START_FRONTEND:-0}" == "1" ]]; then
  echo "Starting Vite frontend dev server..."
  cd frontend && "$BUN" run dev &
  FRONTEND_PID=$!
  cd ..
  echo "  Frontend: http://localhost:5173"
fi

echo ""
echo "Commands:"
echo "  E2E tests:     RUN_E2E=1 API_KEY=\$key make test-e2e"
echo "  Training loop: make train"
echo "  Lint:          make lint"
echo ""
echo "Press Ctrl-C to stop all services."
wait
