#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="${1:-$(pwd)}"
ROOT_DIR="$BASE_DIR"
LC_DIR="$ROOT_DIR/Lacajita"
FRONT_DIR="$ROOT_DIR/Lacajita/Adm-Caj"
SERVICE_SRC="$ROOT_DIR/deploy/lacajita.service"
SERVICE_DST="/etc/systemd/system/lacajita.service"
SERVICE2_SRC="$ROOT_DIR/deploy/lacajita_la_cajita.service"
SERVICE2_DST="/etc/systemd/system/lacajita_la_cajita.service"

echo "Crear venv e instalar dependencias backend en base: $BASE_DIR ..."
# Si la estructura esperada no existe en BASE_DIR, buscar hacia arriba una carpeta que contenga LC y La cajita
if [ ! -d "$LC_DIR" ] || [ ! -d "${ROOT_DIR}/La cajita" ]; then
  echo "No se encontró 'Lacajita' o 'La cajita' en $BASE_DIR, buscando carpeta padre que contenga el proyecto..."
  CAND="$BASE_DIR"
  FOUND=""
  while [ "$CAND" != "/" ]; do
    if [ -d "$CAND/Lacajita" ] && [ -d "$CAND/Lacajita" ]; then
      FOUND="$CAND"
      break
    fi
    CAND="$(dirname "$CAND")"
  done
  if [ -n "$FOUND" ]; then
    echo "Proyecto detectado en: $FOUND"
    BASE_DIR="$FOUND"
    ROOT_DIR="$BASE_DIR"
    LC_DIR="$ROOT_DIR/Lacajita"
    FRONT_DIR="$ROOT_DIR/Lacajita/Adm-Caj"
    SERVICE_SRC="$ROOT_DIR/deploy/lacajita.service"
    SERVICE2_SRC="$ROOT_DIR/deploy/lacajita_la_cajita.service"
  else
    echo "No se encontró la estructura del proyecto (LC/ Lacajita). Abortando."
    exit 1
  fi
fi

cd "$LC_DIR"
if [ -d "venv" ]; then
  echo "Entorno virtual existente encontrado en $LC_DIR/venv — eliminando para recrear limpio"
  rm -rf venv
fi

echo "Creando entorno virtual limpio..."
python3 -m venv --clear venv
VE_PY="$LC_DIR/venv/bin/python"

echo "Actualizando pip/setuptools/wheel (intento estándar)..."
if ! "$VE_PY" -m pip install --upgrade pip setuptools wheel; then
  echo "Advertencia: la actualización estándar falló, reintentando con --break-system-packages"
  "$VE_PY" -m pip install --upgrade pip setuptools wheel --break-system-packages
fi

echo "Instalando requisitos (intento estándar)..."
if ! "$VE_PY" -m pip install -r requirements.txt; then
  echo "Advertencia: instalación estándar falló, reintentando con --break-system-packages"
  "$VE_PY" -m pip install -r requirements.txt --break-system-packages
fi

if [ -f "$SERVICE_SRC" ]; then
  echo "Copiando unit file a $SERVICE_DST"
  sudo cp "$SERVICE_SRC" "$SERVICE_DST"
  sudo systemctl daemon-reload
  sudo systemctl enable --now lacajita.service
  echo "Servicio lacajita habilitado y arrancado"
else
  echo "Unit file $SERVICE_SRC no encontrado. Saltando copia."
fi

# Frontend build (opcional)
if [ -d "$FRONT_DIR" ]; then
  echo "Construyendo frontend (Adm-Caj)..."
  cd "$FRONT_DIR"
  npm install --no-audit --no-fund
  npm run build
  echo "Frontend construido en $FRONT_DIR/dist"
fi

echo "Despliegue completado." 
