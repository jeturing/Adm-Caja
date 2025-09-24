#!/usr/bin/env bash
set -euo pipefail

echo "Starting local deploy script"
# Example deploy actions — adapt paths and commands to your app
APP_DIR="/opt/adm-caja-unified"
VENV_DIR="$APP_DIR/.venv"

if [ -d "$APP_DIR" ]; then
  echo "Syncing repository to /opt/adm-caja-unified"
  rsync -av --delete . $APP_DIR/
fi

if [ -d "$VENV_DIR" ]; then
  echo "Updating virtualenv dependencies"
  source "$VENV_DIR/bin/activate"
  pip install -r "$APP_DIR/requirements.txt" || true
  deactivate
fi

echo "Restarting service(s)"
systemctl restart azagent.service || true

echo "Deploy finished"
