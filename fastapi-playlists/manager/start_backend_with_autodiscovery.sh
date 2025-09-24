#!/bin/bash

# Script de inicio del backend con sistema de auto-discovery dinámico
# Este script configura y ejecuta el backend con todas las características de seguridad

set -e

# --- Funciones ---

# Función para encontrar la raíz del proyecto (buscando .git o .env)
find_project_root() {
    local current_dir
    current_dir=$(pwd)
    while [ "$current_dir" != "/" ]; do
        if [ -d "$current_dir/.git" ] || [ -f "$current_dir/.env" ]; then
            echo "$current_dir"
            return
        fi
        current_dir=$(dirname "$current_dir")
    done
    # Si no se encuentra, devuelve el directorio desde donde se ejecutó como último recurso
    echo "$(pwd)"
}

# --- Configuración ---
PROJECT_ROOT=$(find_project_root)
BASE_PORT=8000
VENV_DIR="$PROJECT_ROOT/venv"
PID_FILE="$PROJECT_ROOT/backend_pids.txt"
REQUIREMENTS_FILE="$PROJECT_ROOT/requirements.txt"
ENV_FILE="$PROJECT_ROOT/.env"


# Limpieza al salir del script
cleanup() {
    echo ""
    echo "🛑 Deteniendo todos los servidores backend..."
    if [ -f "$PID_FILE" ]; then
        # Matar todos los procesos guardados en el archivo PID
        while read -r pid; do
            # Verificar si el proceso existe antes de intentar matarlo
            if ps -p "$pid" > /dev/null; then
                echo "   -> Deteniendo proceso con PID: $pid"
                kill "$pid" 2>/dev/null || true
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi
    echo "👋 ¡Hasta luego!"
    exit 0
}

# Registrar la función de limpieza para que se ejecute al salir
trap cleanup SIGINT SIGTERM

# --- Flujo Principal ---

echo "🚀 Iniciando Jeturing Core Backend con Auto-Discovery de Seguridad"
echo "=================================================================="
echo "📂 Raíz del proyecto detectada en: $PROJECT_ROOT"
cd "$PROJECT_ROOT" # ¡Importante! Nos movemos a la raíz del proyecto

# 1. Verificar y configurar el entorno de Python
echo "🐍 Configurando entorno de Python..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python3 no está instalado."
    exit 1
fi

if [ ! -d "$VENV_DIR" ]; then
    echo "📦 Creando entorno virtual en '$VENV_DIR'..."
    python3 -m venv "$VENV_DIR"
fi

echo "🔄 Activando entorno virtual..."
source "$VENV_DIR/bin/activate"

# 2. Instalar dependencias
echo "📦 Verificando e instalando dependencias..."
if [ ! -f "$REQUIREMENTS_FILE" ]; then
    echo "📝 Creando 'requirements.txt'..."
    cat > "$REQUIREMENTS_FILE" << EOF
fastapi>=0.104.1
uvicorn[standard]>=0.24.0
pydantic>=2.5.0
requests>=2.31.0
python-jose[cryptography]>=3.3.1
python-dotenv>=1.0.0
sentry-sdk>=1.40.0
mysql-connector-python>=8.0.0
EOF
fi
pip install -r "$REQUIREMENTS_FILE" --upgrade
echo "✅ Dependencias actualizadas."

# 3. Verificar configuración de .env y Auth0
if [ -z "$AUTH0_DOMAIN" ] || [ -z "$AUTH0_API_AUDIENCE" ]; then
    if [ -f "$ENV_FILE" ]; then
        set -a
        source "$ENV_FILE"
        set +a
    else
        echo "❌ Error: No se encontró el archivo .env en '$PROJECT_ROOT' y las variables críticas no están en el entorno."
        exit 1
    fi
fi

echo "🔍 Verificando configuración de Auth0..."
if [ -z "$AUTH0_DOMAIN" ] || [ -z "$AUTH0_API_AUDIENCE" ]; then
    echo "❌ Error: Asegúrate de configurar AUTH0_DOMAIN y AUTH0_API_AUDIENCE en el entorno o en .env"
    exit 1
fi
echo "✅ Configuración de Auth0 verificada."

# 4. Descubrir y ejecutar APIs dinámicamente
echo "🔍 Buscando archivos de API (conteniendo 'app = FastAPI()')..."
# Limpiar el archivo de PIDs al inicio
> "$PID_FILE"

API_FILES=$(grep -rl "app = FastAPI()" . --include="*.py" | grep -vE 'venv/')

API_COUNT=$(echo "$API_FILES" | grep -c '^')
if [ -z "$API_FILES" ]; then
    echo "⚠️ No se encontraron archivos de API de FastAPI. Nada que ejecutar."
    exit 0
else
    echo "✅ Se encontraron $API_COUNT APIs FastAPI para levantar."
fi

CURRENT_PORT=$BASE_PORT
HOST_IP="0.0.0.0"
for API_FILE in $API_FILES; do
    MODULE_PATH=$(echo "$API_FILE" | sed 's|^\./||; s|\.py$||; s|/|\.|g')
    echo "--------------------------------------------------"
    echo "🚀 Lanzando API: '$MODULE_PATH' en el puerto $CURRENT_PORT (IP: $HOST_IP)"
    echo "   URL: http://$HOST_IP:$CURRENT_PORT/docs"
    uvicorn "$MODULE_PATH:app" --host $HOST_IP --port "$CURRENT_PORT" --reload &
    echo $! >> "$PID_FILE"
    echo "   ✅ API iniciada con PID $!. Docs: http://$HOST_IP:$CURRENT_PORT/docs"
    ((CURRENT_PORT++))
done

echo "=================================================="
echo "✅ Todos los servidores han sido iniciados."
echo "🔧 Presiona Ctrl+C para detener todos los procesos."

# Esperar a que todos los procesos en segundo plano terminen
wait
