#!/bin/bash
set -euo pipefail

SERVICE_SRC="$(pwd)/deploy/adm-caj-frontend.service"
SERVICE_DST="/etc/systemd/system/adm-caj-frontend.service"

if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run as root. Use sudo." >&2
  exit 2
fi

cp -f "$SERVICE_SRC" "$SERVICE_DST"
systemctl daemon-reload
systemctl enable --now adm-caj-frontend.service
echo "Service adm-caj-frontend.service installed and started. Use 'journalctl -u adm-caj-frontend.service -f' to follow logs."
