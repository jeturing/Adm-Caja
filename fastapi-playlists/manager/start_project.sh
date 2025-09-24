#!/bin/bash
# Script para preparar y ejecutar el frontend y backend en WSL (distro odoo)

set -e

# Ir a la raíz del proyecto
cd "$(dirname "$0")"

# --- FRONTEND ---
echo "Navegando al directorio Adm-WebCore..."
if [ ! -d "Adm-WebCore" ]; then
    echo "Error: La carpeta Adm-WebCore no existe"
    exit 1
fi

cd Adm-WebCore

echo "Instalando dependencias de frontend..."
npm install

echo "Iniciando servidor de desarrollo frontend..."
npm run dev &
FRONTEND_PID=$!

# Volver al directorio raíz
cd ..

# --- BACKEND ---
echo "Preparando entorno virtual de Python..."
if [ ! -d "venv" ]; then
    echo "Creando entorno virtual..."
    python3 -m venv venv
fi

echo "Activando entorno virtual..."
source venv/bin/activate

echo "Instalando dependencias básicas de Python..."
pip install --upgrade pip
    pip install fastapi uvicorn python-dotenv requests "python-jose[cryptography]>=3.3.1" python-multipart sentry-sdk[fastapi]

echo "Iniciando backend..."
cd Backend
python3 API.py &
BACKEND_PID=$!

echo "Ambos servidores están en ejecución."
echo "Frontend PID: $FRONTEND_PID"
echo "Backend PID: $BACKEND_PID"
echo "Presiona Ctrl+C para detener ambos servidores."

# Función para limpiar procesos al salir
cleanup() {
    echo "Deteniendo servidores..."
    kill $FRONTEND_PID $BACKEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

wait
