#!/usr/bin/env bash
set -euo pipefail

# Prueba la API a través del proxy de Vite (http://127.0.0.1:5174/api)
# Requiere que Vite esté corriendo en 5174 y que el backend esté accesible.

BASE=http://127.0.0.1:5174/api

echo "[test] Health"
curl -sS $BASE/health | sed -e 's/.*/[test] &/'

# Obtener token vía Client Credentials en el backend directo (puerto 8002 por defecto)
API_DIRECT=${API_DIRECT:-http://127.0.0.1:8002}
SECRET=${SECRET_KEY:-}
if [[ -z "$SECRET" ]]; then
  if [[ -f "/root/APP/Lacajita/.env" ]]; then
    SECRET=$(grep -E '^SECRET_KEY=' /root/APP/Lacajita/.env | head -n1 | cut -d= -f2-)
  fi
fi
if [[ -z "$SECRET" ]]; then
  echo "[test] SECRET_KEY no está definido. Exporta SECRET_KEY o configúralo en .env." >&2
  exit 1
fi

echo "[test] Solicitando token..."
JSON=$(curl -sS -X POST "$API_DIRECT/auth/client-credentials" \
  -H "Content-Type: application/json" \
  -d "{\"client_secret\":\"$SECRET\"}")

# Intérprete Python del venv para extraer access_token
VENV_PY="/root/APP/Lacajita/venv/bin/python"
if [[ -x "$VENV_PY" ]]; then
  TOKEN=$(printf '%s' "$JSON" | "$VENV_PY" -c 'import sys,json;print(json.load(sys.stdin).get("access_token",""))')
else
  # Fallback a python3 del sistema si existiera
  if command -v python3 >/dev/null 2>&1; then
    TOKEN=$(printf '%s' "$JSON" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("access_token",""))')
  else
    echo "[test] No se encontró Python para parsear JSON. TOKEN no extraído." >&2
    TOKEN=""
  fi
fi

if [[ -z "$TOKEN" ]]; then
  echo "[test] No se obtuvo token. Revisa SECRET_KEY y backend." >&2
  exit 1
fi

echo "[test] Token OK (${#TOKEN} chars). Probando endpoints..."
for ep in allsegments homecarousel categories segments; do
  echo "[test] GET $BASE/$ep"
  http_code=$(curl -sS -o /tmp/resp.json -w "%{http_code}" "$BASE/$ep" -H "Authorization: Bearer $TOKEN") || true
  echo "[test] HTTP $http_code"
  head -c 200 /tmp/resp.json | sed -e 's/.*/[test] &/' || true
  echo
done
echo "[test] Done."