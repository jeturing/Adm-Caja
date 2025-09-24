#!/usr/bin/env bash
set -euo pipefail

# Setup y arranque local (backend + frontend) con verificación de DB y túnel opcional.
# - Lee configuración desde .env en la raíz del proyecto
# - Prepara venv Python e instala requirements
# - Arranca Uvicorn en API_PORT (default 8002)
# - Arranca Vite en 5174 con proxy /api -> backend
# - Valida /api/health directo y vía proxy
#
# Variables opcionales (para abrir túnel automáticamente si falla la DB):
#   TUNNEL_USER, TUNNEL_HOST, REMOTE_DB_HOST (default 127.0.0.1)
#   Forwards: ssh -f -N -L ${DB_PORT}:${REMOTE_DB_HOST}:3306 ${TUNNEL_USER}@${TUNNEL_HOST}

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$BASE_DIR"

log() { printf "[%s] %s\n" "$1" "$2"; }
ok()  { log OK "$1"; }
info(){ log info "$1"; }
warn(){ log warn "$1"; }
err() { log error "$1"; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "Comando requerido no encontrado: $1"; return 1
  fi
}

# 1) Paquetes base recomendados (opcional, si hay apt-get y sudo)
if command -v apt-get >/dev/null 2>&1; then
  info "Instalando dependencias del sistema (python3-venv, jq, mariadb-client)..."
  sudo apt-get update -y >/dev/null
  sudo apt-get install -y python3-venv jq mariadb-client >/dev/null || true
fi

# 2) Cargar .env
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
else
  warn ".env no encontrado en $BASE_DIR; se usarán valores por defecto."
fi

API_PORT="${API_PORT:-8002}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_NAME="${DB_NAME:-db_jeturing}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_PORT="${DB_PORT:-3306}"

# 3) Preparar venv + requirements
info "Preparando entorno virtual Python..."
if [[ ! -x venv/bin/python ]]; then
  python3 -m venv venv
fi
./venv/bin/python -m pip install --upgrade pip setuptools wheel >/dev/null
./venv/bin/python -m pip install -r requirements.txt >/dev/null
ok "Dependencias Python instaladas."

# 4) Verificar DB y abrir túnel si procede
db_check() {
  if command -v mysql >/dev/null 2>&1; then
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" \
      -e "SELECT 1" "$DB_NAME" >/dev/null 2>&1
  else
    return 0
  fi
}

if db_check; then
  ok "Conexión a DB OK en ${DB_HOST}:${DB_PORT}/${DB_NAME}."
else
  warn "No se pudo conectar a la DB en ${DB_HOST}:${DB_PORT}."
  if [[ -n "${TUNNEL_USER:-}" && -n "${TUNNEL_HOST:-}" ]]; then
    info "Intentando abrir túnel SSH al puerto local ${DB_PORT}..."
    REMOTE_DB_HOST="${REMOTE_DB_HOST:-127.0.0.1}"
    if ss -ltn | grep -q ":${DB_PORT} "; then
      warn "Ya hay algo escuchando en :${DB_PORT}. No se abrirá nuevo túnel."
    else
      ssh -f -N -L "${DB_PORT}:${REMOTE_DB_HOST}:3306" -o ExitOnForwardFailure=yes \
        "${TUNNEL_USER}@${TUNNEL_HOST}" || {
          err "Fallo abriendo túnel SSH."
        }
      sleep 1
    fi
    if db_check; then
      ok "Conexión a DB OK vía túnel en :${DB_PORT}."
    else
      warn "Sigue fallando la conexión a DB. Revisa credenciales/túnel."
    fi
  else
    info "Puedes exportar TUNNEL_USER/TUNNEL_HOST para abrir túnel automático."
    info "O usa: scripts/open_db_tunnel.sh (manual)."
  fi
fi

# 5) Arrancar backend (Uvicorn) en background si no está
if ss -ltn | grep -q ":${API_PORT} "; then
  warn "API ya escuchando en :${API_PORT}. No se inicia otra instancia."
else
  info "Arrancando backend en :${API_PORT}..."
  nohup ./venv/bin/python -m uvicorn Api:app --host 0.0.0.0 --port "${API_PORT}" --reload \
    > "uvicorn-${API_PORT}.log" 2>&1 & echo $! > "uvicorn-${API_PORT}.pid"
  sleep 1
  ss -ltn | grep -q ":${API_PORT} " && ok "API escuchando en :${API_PORT}." || {
    err "API no está escuchando. Revisa uvicorn-${API_PORT}.log"; exit 1; }
fi

# 6) Instalar deps frontend y arrancar Vite
info "Instalando dependencias frontend..."
pushd "$BASE_DIR/Adm-Caj" >/dev/null
if [[ -f package-lock.json ]]; then npm ci >/dev/null || npm install >/dev/null; else npm install >/dev/null; fi
if ss -ltn | grep -q ":5174 "; then
  warn "Vite ya escuchando en :5174."
else
  info "Arrancando Vite en :5174 (proxy a :${API_PORT})..."
  nohup env VITE_API_BASE_URL=/api API_PORT="${API_PORT}" npm run dev --silent \
    > "$BASE_DIR/vite-dev.log" 2>&1 & echo $! > "$BASE_DIR/vite.pid"
  sleep 2
  ss -ltn | grep -q ":5174 " && ok "Vite escuchando en :5174." || warn "Vite no parece estar arriba. Revisa vite-dev.log"
fi
popd >/dev/null

# 7) Health checks
info "Verificando health directo y vía proxy..."
set +e
curl -sfS "http://127.0.0.1:${API_PORT}/api/health" | jq . >/dev/null 2>&1 && ok "Health backend OK" || warn "Health backend fallo"
curl -sfS "http://127.0.0.1:5174/api/health" | jq . >/dev/null 2>&1 && ok "Health proxy OK" || warn "Health proxy fallo"
set -e

echo
ok "Setup local completado."
echo "- Backend: http://127.0.0.1:${API_PORT}/api/docs"
echo "- Frontend: http://127.0.0.1:5174"
