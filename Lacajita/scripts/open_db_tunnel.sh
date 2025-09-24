#!/usr/bin/env bash
set -euo pipefail

# Abre un túnel SSH para MySQL hacia el puerto local indicado.
# Requiere las siguientes variables de entorno (o pásalas inline):
#   TUNNEL_USER   -> usuario SSH del bastion/jump host
#   TUNNEL_HOST   -> bastion/jump host (ej. bastion.example.com)
#   REMOTE_DB_HOST-> host de la base detrás del bastion (ej. db.internal.local)
#   LOCAL_DB_PORT -> puerto local a utilizar (default 3306)

LOCAL_DB_PORT=${LOCAL_DB_PORT:-3306}

if [[ -z "${TUNNEL_USER:-}" || -z "${TUNNEL_HOST:-}" || -z "${REMOTE_DB_HOST:-}" ]]; then
  echo "[tunnel] Faltan variables. Exporta TUNNEL_USER, TUNNEL_HOST y REMOTE_DB_HOST."
  echo "Ejemplo: TUNNEL_USER=ubuntu TUNNEL_HOST=bastion.example.com REMOTE_DB_HOST=db.internal.local ./scripts/open_db_tunnel.sh"
  exit 1
fi

echo "[tunnel] Abriendo túnel: localhost:${LOCAL_DB_PORT} -> ${REMOTE_DB_HOST}:3306 vía ${TUNNEL_USER}@${TUNNEL_HOST}"
echo "[tunnel] Comando: ssh -N -L ${LOCAL_DB_PORT}:${REMOTE_DB_HOST}:3306 ${TUNNEL_USER}@${TUNNEL_HOST}"
echo "[tunnel] (Se quedará en foreground; usa otra terminal para pruebas)"

exec ssh -N -L ${LOCAL_DB_PORT}:${REMOTE_DB_HOST}:3306 ${TUNNEL_USER}@${TUNNEL_HOST}
