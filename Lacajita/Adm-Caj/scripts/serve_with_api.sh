#!/usr/bin/env bash
set -euo pipefail

# Encuentra dinámicamente el directorio "Lacajita" partiendo desde este script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LACAJITA_DIR=""

# Subir hasta encontrar carpeta Lacajita o archivos Api.py
dir="$SCRIPT_DIR"
for _ in {1..8}; do
  base="$(basename "$dir")"
  if [ "$base" = "Lacajita" ]; then
    LACAJITA_DIR="$dir"
    break
  fi
  if [ -d "$dir/Lacajita" ]; then
    LACAJITA_DIR="$dir/Lacajita"
    break
  fi
  if [ -f "$dir/Api.py" ]; then
    LACAJITA_DIR="$dir"
    break
  fi
  [ "$dir" = "/" ] && break
  dir="$(dirname "$dir")"
done

if [ -z "$LACAJITA_DIR" ]; then
  echo "[serve-with-api] No se encontró el directorio 'Lacajita'." >&2
  exit 1
fi

ADM_DIR="$LACAJITA_DIR/Adm-Caj"
cd "$ADM_DIR"

# Levantar API en 8001 si no está arriba
API_HEALTH="http://127.0.0.1:8001/health"
if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 2 "$API_HEALTH" >/dev/null 2>&1; then
  echo "[serve-with-api] API ya está activo en 8001"
else
  echo "[serve-with-api] Iniciando API en 8001..."
  # Elegir comando Python/uvicorn disponible
  if command -v python3.12 >/dev/null 2>&1; then
    PY_CMD=(python3.12 -m uvicorn Api:app --host 0.0.0.0 --port 8001)
  elif command -v python3 >/dev/null 2>&1; then
    PY_CMD=(python3 -m uvicorn Api:app --host 0.0.0.0 --port 8001)
  elif command -v python >/dev/null 2>&1; then
    PY_CMD=(python -m uvicorn Api:app --host 0.0.0.0 --port 8001)
  elif command -v uvicorn >/dev/null 2>&1; then
    PY_CMD=(uvicorn Api:app --host 0.0.0.0 --port 8001)
  else
    echo "[serve-with-api] No se encontró Python/uvicorn en PATH." >&2
    exit 1
  fi

  (
    cd "$LACAJITA_DIR"
    nohup "${PY_CMD[@]}" > "$LACAJITA_DIR/uvicorn.log" 2>&1 &
    echo $! > /tmp/lacajita-api.pid
  )
  # Dar un respiro y probar
  sleep 1
  if ! curl -fsS --max-time 3 "$API_HEALTH" >/dev/null 2>&1; then
    echo "[serve-with-api] Advertencia: API aún no responde en /health, revisa $LACAJITA_DIR/uvicorn.log" >&2
  fi
fi

# Construir frontend si falta dist
if [ ! -f "$ADM_DIR/dist/index.html" ]; then
  echo "[serve-with-api] Construyendo frontend (vite build)..."
  npm run build
fi

echo "[serve-with-api] Sirviendo frontend en http://127.0.0.1:5174"
exec npx serve -s dist -l 5174
