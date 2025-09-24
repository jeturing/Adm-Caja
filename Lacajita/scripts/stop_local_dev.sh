#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$BASE_DIR"

kill_if() {
  local pidfile="$1"
  local name="$2"
  if [[ -f "$pidfile" ]]; then
    local pid
    pid=$(cat "$pidfile" || true)
    if [[ -n "$pid" ]] && ps -p "$pid" >/dev/null 2>&1; then
      echo "[stop] Parando $name (pid $pid)..."
      kill "$pid" || true
      sleep 1
      if ps -p "$pid" >/dev/null 2>&1; then
        echo "[stop] Forzando $name (SIGKILL)..."
        kill -9 "$pid" || true
      fi
    fi
    rm -f "$pidfile"
  else
    echo "[stop] $name no tiene pidfile ($pidfile)."
  fi
}

API_PORT="${API_PORT:-8002}"
kill_if "uvicorn-${API_PORT}.pid" "Uvicorn:${API_PORT}"
kill_if "vite.pid" "Vite"

# Intentar cerrar túneles ssh -L a DB_PORT del .env
if [[ -f .env ]]; then
  DB_PORT=$(grep -E '^DB_PORT=' .env | head -n1 | cut -d= -f2- || true)
fi
DB_PORT=${DB_PORT:-3306}

if pgrep -fa "ssh -f -N -L ${DB_PORT}:" >/dev/null 2>&1; then
  echo "[stop] Cerrando túneles SSH en :${DB_PORT}..."
  pkill -f "ssh -f -N -L ${DB_PORT}:" || true
fi

echo "[stop] Listo."
