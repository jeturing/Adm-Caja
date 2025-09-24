#!/usr/bin/env bash
set -euo pipefail

API_PORT="${API_PORT:-8002}"

echo "[health] Backend /api/health"
curl -sS "http://127.0.0.1:${API_PORT}/api/health" | jq . || true

echo "[health] Proxy /api/health (Vite 5174)"
curl -sS "http://127.0.0.1:5174/api/health" | jq . || true
