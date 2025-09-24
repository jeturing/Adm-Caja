#!/bin/bash

# Script de inicio del backend con sistema de auto-discovery dinámico
# Este script configura y ejecuta el backend con todas las características de seguridad

set -e

# --- Funciones ---
# --- Configuración ---
# Forzamos la raíz del proyecto a la carpeta superior al directorio actual
PROJECT_ROOT=$(dirname "$(pwd)")  
BASE_PORT=8000
VENV_DIR="$PROJECT_ROOT/venv"
PID_FILE="$PROJECT_ROOT/backend_pids.txt"
REQUIREMENTS_FILE="$PROJECT_ROOT/requirements.txt"
ENV_FILE="$PROJECT_ROOT/.env"
DEPS_MARKER="$PROJECT_ROOT/.deps_installed"
SERVICE_MODE=false
UPDATE_MODE=false
SKIP_DEPS=false
API_FILES=$(grep -rl -E "(app\s*=\s*FastAPI|FastAPI\()" "$PROJECT_ROOT" --include="*.py" 2>/dev/null | grep -vE 'venv/' || true)

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

# Función para liberar puerto si está ocupado
free_port() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        local pid_in_use
        pid_in_use=$(lsof -ti tcp:"$port" 2>/dev/null || true)
        if [ -n "$pid_in_use" ]; then
            echo "   ⚠️  Puerto $port ocupado por PID $pid_in_use. Liberando puerto..."
            kill "$pid_in_use" 2>/dev/null || true
            sleep 2  # Dar tiempo para que el proceso termine
python-jose[cryptography]>=3.3.1
    else
        # Alternativa usando netstat si lsof no está disponible
        local pid_in_use
        pid_in_use=$(netstat -tlnp 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f1 | head -1 || true)
        if [ -n "$pid_in_use" ] && [ "$pid_in_use" != "-" ]; then
            echo "   ⚠️  Puerto $port ocupado por PID $pid_in_use. Liberando puerto..."
            kill "$pid_in_use" 2>/dev/null || true
            sleep 2
        fi
    fi
}

# Función para crear servicio systemd
create_systemd_service() {
    local service_name=$1
    local module_path=$2
    local port=$3
    local api_file=$4
    
    local service_file="/etc/systemd/system/${service_name}.service"
    local user_name=$(whoami)
    
    echo "   📋 Creando servicio systemd: $service_name"
    
    sudo tee "$service_file" > /dev/null << EOF
[Unit]
Description=FastAPI ${service_name} - Jeturing Core Backend
After=network.target
Wants=network.target

[Service]
Type=simple
User=$user_name
Group=$user_name
WorkingDirectory=$PROJECT_ROOT
Environment=PATH=$VENV_DIR/bin
ExecStart=$VENV_DIR/bin/uvicorn $module_path:app --host 0.0.0.0 --port $port
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$service_name

[Install]
WantedBy=multi-user.target
EOF

    # Recargar systemd y habilitar el servicio
    sudo systemctl daemon-reload
    sudo systemctl enable "$service_name"
    
    echo "   ✅ Servicio $service_name creado y habilitado"
}

# Función para gestionar servicios
manage_services() {
    local action=$1
    shift
    local services=("$@")
    
    for service in "${services[@]}"; do
        case $action in
            "start")
                echo "   🚀 Iniciando servicio: $service"
                sudo systemctl start "$service"
                ;;
            "stop")
                echo "   🛑 Deteniendo servicio: $service"
                sudo systemctl stop "$service" 2>/dev/null || true
                ;;
            "status")
                echo "   📊 Estado del servicio: $service"
                sudo systemctl --no-pager status "$service" || true
                ;;
        esac
    done
}

# Función para mostrar barra de progreso
show_progress() {
    local pid=$1
    local message=$2
    local chars="⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
    local delay=0.1
    
    while kill -0 "$pid" 2>/dev/null; do
        for (( i=0; i<${#chars}; i++ )); do
            echo -ne "\r   ${chars:$i:1} $message"
            sleep $delay
            if ! kill -0 "$pid" 2>/dev/null; then
                break 2
            fi
        done
    done
    echo -ne "\r   ✅ $message - Completado\n"
}

# Función para instalar dependencias con progreso
install_dependencies_with_progress() {
    echo "📦 Instalando dependencias por primera vez..."
    
    # Crear requirements.txt si no existe
    if [ ! -f "$REQUIREMENTS_FILE" ]; then
        echo "📝 Creando 'requirements.txt'..."
        cat > "$REQUIREMENTS_FILE" << EOF
    fastapi>=0.104.1
    uvicorn[standard]>=0.24.0
    pydantic>=2.5.0
    requests>=2.31.0
    # security update
    python-jose[cryptography]>=3.3.1
    python-dotenv>=1.0.0
    sentry-sdk>=1.40.0
    mysql-connector-python>=8.0.0
    EOF
    fi
    
    # Verificar si pip funciona
    if ! pip --version >/dev/null 2>&1; then
        echo "❌ Error: pip no está disponible en el entorno virtual"
        exit 1
    fi
    
    echo "📋 Instalando todas las dependencias de una vez..."
    echo "⏳ Esto puede tomar varios minutos..."
    
    # Instalar todas las dependencias de una vez (más rápido y confiable)
    if pip install -r "$REQUIREMENTS_FILE" --upgrade --no-cache-dir; then
        echo "✅ Dependencias instaladas correctamente"
    else
        echo "❌ Error instalando dependencias"
        echo "🔄 Intentando instalación individual de paquetes..."
        
        # Fallback: instalar paquetes uno por uno
        local packages=($(grep -v '^#' "$REQUIREMENTS_FILE" | grep -v '^$'))
        local failed_packages=()
        
        for package in "${packages[@]}"; do
            echo "   📦 Instalando: $package"
            if pip install "$package" --upgrade --no-cache-dir >/dev/null 2>&1; then
                echo "   ✅ $package instalado"
            else
                echo "   ❌ Error con $package"
                failed_packages+=("$package")
            fi
        done
        
        if [ ${#failed_packages[@]} -gt 0 ]; then
            echo "⚠️  Paquetes que fallaron:"
            for pkg in "${failed_packages[@]}"; do
                echo "   • $pkg"
            done
            echo "💡 El sistema puede funcionar sin estos paquetes opcionales"
        fi
    fi
    
    echo "=================================================="
    echo "✅ Instalación de dependencias completada"
    echo "=================================================="
}

# Función para detectar servicios existentes
detect_existing_services() {
    local existing_services=()
    
    # Buscar servicios jeturing existentes
    for service_file in /etc/systemd/system/jeturing-api-*.service; do
        if [ -f "$service_file" ]; then
            local service_name=$(basename "$service_file" .service)
            existing_services+=("$service_name")
        fi
    done
    
    echo "${existing_services[@]}"
}

# Función para mostrar menú de selección de servicios
show_service_selection_menu() {
    local services=("$@")
    local selected_services=()
    
    if [ ${#services[@]} -eq 0 ]; then
        echo "❌ No se encontraron servicios jeturing existentes."
        return 1
    fi
    
    echo ""
    echo "🔧 Modo Actualización - Seleccionar Servicios"
    echo "=============================================="
    echo "Servicios existentes encontrados:"
    echo ""
    
    for i in "${!services[@]}"; do
        local service="${services[$i]}"
        local status_icon="🔴"
        
        # Verificar si el servicio está activo
        if sudo systemctl is-active --quiet "$service" 2>/dev/null; then
            status_icon="🟢"
        fi
        
        echo "   $((i+1)). $status_icon $service"
    done
    
    echo ""
    echo "   A. Todos los servicios"
    echo "   N. Ninguno (cancelar)"
    echo ""
    
    while true; do
        echo -n "Selecciona los servicios a actualizar (ej: 1,3,5 o A para todos): "
        read -r selection
        
        case "$selection" in
            [Aa]|[Tt]odos)
                selected_services=("${services[@]}")
                break
                ;;
            [Nn]|[Cc]ancelar)
                echo "❌ Operación cancelada por el usuario."
                exit 0
                ;;
            *[0-9]*)
                # Procesar selección de números
                IFS=',' read -ra numbers <<< "$selection"
                local valid_selection=true
                local temp_services=()
                
                for num in "${numbers[@]}"; do
                    # Limpiar espacios
                    num=$(echo "$num" | tr -d ' ')
                    
                    if [[ "$num" =~ ^[0-9]+$ ]] && [ "$num" -ge 1 ] && [ "$num" -le ${#services[@]} ]; then
                        temp_services+=("${services[$((num-1))]}")
                    else
                        echo "❌ Número inválido: $num"
                        valid_selection=false
                        break
                    fi
                done
                
                if [ "$valid_selection" = true ] && [ ${#temp_services[@]} -gt 0 ]; then
                    selected_services=("${temp_services[@]}")
                    break
                fi
                ;;
            *)
                echo "❌ Selección inválida. Usa números separados por comas, 'A' para todos, o 'N' para cancelar."
                ;;
        esac
    done
    
    echo ""
    echo "✅ Servicios seleccionados para actualizar:"
    for service in "${selected_services[@]}"; do
        echo "   • $service"
    done
    echo ""
    
    echo -n "¿Continuar con la actualización? (s/N): "
    read -r confirm
    case "$confirm" in
        [Ss]|[Yy]es|[Sí])
            echo "🚀 Procediendo con la actualización..."
            ;;
        *)
            echo "❌ Actualización cancelada."
            exit 0
            ;;
    esac
    
    echo "${selected_services[@]}"
}

# --- Configuración ---
PROJECT_ROOT=$(find_project_root)
BASE_PORT=8000
VENV_DIR="$PROJECT_ROOT/venv"
PID_FILE="$PROJECT_ROOT/backend_pids.txt"
REQUIREMENTS_FILE="$PROJECT_ROOT/requirements.txt"
ENV_FILE="$PROJECT_ROOT/.env"
DEPS_MARKER="$PROJECT_ROOT/.deps_installed"
SERVICE_MODE=false
UPDATE_MODE=false
SKIP_DEPS=false

# Verificar argumentos del script
while [[ $# -gt 0 ]]; do
    case $1 in
        --service|--systemd|-s)
            SERVICE_MODE=true
            shift
            ;;
        --update|-u)
            SERVICE_MODE=true
            UPDATE_MODE=true
            shift
            ;;
        --skip-deps|--no-deps|-n)
            SKIP_DEPS=true
            shift
            ;;
        --force-deps|--reinstall-deps)
            echo "🔄 Forzando reinstalación de dependencias..."
            rm -f "$PROJECT_ROOT/.deps_installed" 2>/dev/null || true
            shift
            ;;
        --help|-h)
            echo "Uso: $0 [opciones]"
            echo "Opciones:"
            echo "  --service, --systemd, -s    Ejecutar como servicios systemd"
            echo "  --update, -u                Modo actualización - seleccionar servicios a actualizar"
            echo "  --skip-deps, --no-deps, -n  Saltar verificación/instalación de dependencias"
            echo "  --force-deps, --reinstall-deps  Forzar reinstalación de dependencias"
            echo "  --help, -h                  Mostrar esta ayuda"
            echo ""
            echo "Ejemplos:"
            echo "  $0                          Modo desarrollo con verificación de dependencias"
            echo "  $0 --service                Crear servicios systemd con dependencias"
            echo "  $0 --update                 Actualizar servicios selectivamente"
            echo "  $0 --service --skip-deps    Crear servicios sin verificar dependencias"
            echo "  $0 --update --skip-deps     Actualizar servicios sin verificar dependencias"
            echo "  $0 --force-deps             Reinstalar todas las dependencias"
            exit 0
            ;;
        *)
            echo "Opción desconocida: $1"
            echo "Usa --help para ver las opciones disponibles"
            exit 1
            ;;
    esac
done


# Limpieza al salir del script
cleanup() {
    echo ""
    if [ "$SERVICE_MODE" = true ]; then
        echo "🛑 Deteniendo servicios systemd..."
        if [ ${#CREATED_SERVICES[@]} -gt 0 ]; then
            manage_services "stop" "${CREATED_SERVICES[@]}"
        fi
    else
        echo "🛑 Deteniendo todos los servidores backend..."
        if [ -f "$PID_FILE" ]; then
            # Matar todos los procesos guardados en el archivo PID
            while read -r pid; do
                # Verificar si el proceso existe antes de intentar matarlo
                if ps -p "$pid" > /dev/null 2>&1; then
                    echo "   -> Deteniendo proceso con PID: $pid"
                    kill "$pid" 2>/dev/null || true
                fi
            done < "$PID_FILE"
            rm -f "$PID_FILE"
        fi
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
if [ "$SERVICE_MODE" = true ]; then
    if [ "$UPDATE_MODE" = true ]; then
        echo "🔧 Modo: Actualización de servicios systemd"
    else
        echo "🔧 Modo: Servicios systemd"
    fi
else
    echo "🔧 Modo: Procesos locales"
fi

if [ "$SKIP_DEPS" = true ]; then
    echo "⚡ Saltando verificación de dependencias (modo rápido)"
fi

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

# 2. Instalar dependencias (solo la primera vez)
if [ "$SKIP_DEPS" = true ]; then
    echo "⚡ Omitiendo verificación e instalación de dependencias (--skip-deps activado)"
    echo "💡 Asegúrate de que las dependencias estén instaladas correctamente"
elif [ ! -f "$DEPS_MARKER" ]; then
    install_dependencies_with_progress
    
    # Marcar que las dependencias han sido instaladas
    touch "$DEPS_MARKER"
    echo "📌 Marcador de dependencias creado: $DEPS_MARKER"
else
    echo "✅ Dependencias ya instaladas previamente. Omitiendo instalación."
    echo "📌 Para reinstalar dependencias, elimina: $DEPS_MARKER"
fi

# 3. Verificar configuración de .env y Auth0
echo "🔐 Verificando configuración de entorno..."
if [ -z "$AUTH0_DOMAIN" ] || [ -z "$AUTH0_API_AUDIENCE" ]; then
    if [ -f "$ENV_FILE" ]; then
        echo "📄 Cargando variables desde: $ENV_FILE"
        set -a
        source "$ENV_FILE"
        set +a
    else
        echo "❌ Error: No se encontró el archivo .env en '$PROJECT_ROOT' y las variables críticas no están en el entorno."
        echo "📝 Crea un archivo .env con las siguientes variables:"
        echo "   AUTH0_DOMAIN=tu-dominio.auth0.com"
        echo "   AUTH0_API_AUDIENCE=tu-audience"
        exit 1
    fi
fi

echo "🔍 Verificando configuración de Auth0..."
if [ -z "$AUTH0_DOMAIN" ] || [ -z "$AUTH0_API_AUDIENCE" ]; then
    echo "❌ Error: Asegúrate de configurar AUTH0_DOMAIN y AUTH0_API_AUDIENCE en el entorno o en .env"
    exit 1
fi
echo "✅ Configuración de Auth0 verificada (Dominio: $AUTH0_DOMAIN)"

# 4. Descubrir y ejecutar APIs dinámicamente
echo "🔍 Buscando archivos de API (conteniendo FastAPI)..."
# Limpiar el archivo de PIDs al inicio
> "$PID_FILE"

# Array para almacenar servicios creados
CREATED_SERVICES=()

# Manejo del modo actualización
if [ "$UPDATE_MODE" = true ]; then
    echo "🔍 Detectando servicios existentes..."
    existing_services=($(detect_existing_services))
    
    if [ ${#existing_services[@]} -eq 0 ]; then
        echo "❌ No hay servicios jeturing existentes para actualizar."
        echo "💡 Ejecuta primero: $0 --service"
        exit 1
    fi
    
    # Mostrar menú de selección
    selected_services=($(show_service_selection_menu "${existing_services[@]}"))
    
    echo "🔄 Actualizando servicios seleccionados..."
    
    # Detener servicios seleccionados
    for service in "${selected_services[@]}"; do
        echo "   🛑 Deteniendo $service..."
        sudo systemctl stop "$service" 2>/dev/null || true
    done
    
    echo "✅ Servicios detenidos. Continuando con la reconfiguración..."
fi

# Buscar archivos con diferentes patrones de FastAPI
API_FILES=$(grep -rl -E "(app\s*=\s*FastAPI|FastAPI\()" . --include="*.py" 2>/dev/null | grep -vE 'venv/' || true)

if [ -z "$API_FILES" ]; then
    echo "=================================================="
    echo "⚠️ No se encontraron archivos de API de FastAPI."
    echo "📝 Archivos Python encontrados en el directorio:"
    find . -name "*.py" -not -path "./venv/*" | head -5 | sed 's/^/   • /'
    echo "=================================================="
    exit 0
fi

API_COUNT=$(echo "$API_FILES" | wc -l)
echo "=================================================="
echo "✅ Se encontraron $API_COUNT APIs FastAPI para levantar:"
echo "$API_FILES" | sed 's/^/   • /'
echo "=================================================="

CURRENT_PORT=$BASE_PORT
HOST_IP="0.0.0.0"

if [ "$SERVICE_MODE" = true ]; then
    echo ""
    echo "🔧 Configurando servicios systemd..."
    echo "=================================================="
fi

for API_FILE in $API_FILES; do
    MODULE_PATH=$(echo "$API_FILE" | sed 's|^\./||; s|\.py$||; s|/|\.|g')
    SERVICE_NAME="jeturing-api-$(echo "$MODULE_PATH" | sed 's|\.|-|g')"
    
    # En modo actualización, solo procesar servicios seleccionados
    if [ "$UPDATE_MODE" = true ]; then
        local should_process=false
        for selected in "${selected_services[@]}"; do
            if [ "$SERVICE_NAME" = "$selected" ]; then
                should_process=true
                break
            fi
        done
        
        if [ "$should_process" = false ]; then
            echo "--------------------------------------------------"
            echo "⏭️  Omitiendo API: '$MODULE_PATH' (no seleccionada)"
            continue
        fi
    fi
    
    echo "--------------------------------------------------"
    echo "🚀 Configurando API: '$MODULE_PATH'"
    echo "   Puerto: $CURRENT_PORT | Host: $HOST_IP"
    echo "   Documentación: http://localhost:$CURRENT_PORT/docs"
    
    # Verificar que el archivo existe antes de intentar ejecutarlo
    if [ ! -f "$API_FILE" ]; then
        echo "   ❌ Error: Archivo '$API_FILE' no encontrado"
        continue
    fi
    
    # Liberar puerto si está ocupado
    free_port "$CURRENT_PORT"
    
    if [ "$SERVICE_MODE" = true ]; then
        # Modo servicio systemd
        echo "   🔧 Servicio: $SERVICE_NAME"
        
        # Verificar permisos sudo
        if ! sudo -n true 2>/dev/null; then
            echo "   ⚠️  Se requieren permisos sudo para crear servicios systemd"
            echo "   💡 Ejecuta: sudo $0 --service"
            exit 1
        fi
        
        # Detener servicio existente si está corriendo (solo si no estamos en modo actualización)
        if [ "$UPDATE_MODE" = false ]; then
            sudo systemctl stop "$SERVICE_NAME" 2>/dev/null || true
        fi
        
        # Crear el servicio
        if [ "$UPDATE_MODE" = true ]; then
            echo "   🔄 Actualizando configuración del servicio..."
        fi
        create_systemd_service "$SERVICE_NAME" "$MODULE_PATH" "$CURRENT_PORT" "$API_FILE"
        
        # Iniciar el servicio
        sudo systemctl start "$SERVICE_NAME"
        
        # Verificar estado
        if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
            if [ "$UPDATE_MODE" = true ]; then
                echo "   ✅ Servicio $SERVICE_NAME actualizado e iniciado correctamente"
            else
                echo "   ✅ Servicio $SERVICE_NAME iniciado correctamente"
            fi
            CREATED_SERVICES+=("$SERVICE_NAME")
        else
            echo "   ❌ Error iniciando servicio $SERVICE_NAME"
            sudo systemctl status "$SERVICE_NAME" --no-pager || true
        fi
    else
        # Modo proceso local (original)
        uvicorn "$MODULE_PATH:app" --host $HOST_IP --port "$CURRENT_PORT" --reload &
        PID=$!
        echo $PID >> "$PID_FILE"
        echo "   ✅ API iniciada con PID $PID"
    fi
    
    echo "   📱 Acceso: http://localhost:$CURRENT_PORT/docs"
    ((CURRENT_PORT++))
    
    # Pequeña pausa para evitar conflictos de puerto
    sleep 1
done

echo "=================================================="
if [ "$UPDATE_MODE" = true ]; then
    echo "✅ Actualización de servicios completada."
else
    echo "✅ Todas las APIs han sido iniciadas."
fi

if [ "$SERVICE_MODE" = true ]; then
    echo ""
    if [ "$UPDATE_MODE" = true ]; then
        echo "🔄 Servicios actualizados:"
    else
        echo "🎯 Servicios systemd creados:"
    fi
    for service in "${CREATED_SERVICES[@]}"; do
        echo "   • $service"
    done
    echo ""
    echo "💡 Comandos útiles:"
    echo "   sudo systemctl status <servicio>       - Ver estado"
    echo "   sudo journalctl -f -u <servicio>       - Ver logs en tiempo real"
    echo "   sudo systemctl stop <servicio>         - Detener servicio"
    echo "   sudo systemctl disable <servicio>      - Deshabilitar servicio"
    if [ "$UPDATE_MODE" = false ]; then
        echo "   $0 --update                         - Actualizar servicios selectivamente"
        echo "   $0 --update --skip-deps             - Actualizar servicios sin verificar deps"
    fi
    echo ""
    echo "📊 Estado actual de los servicios:"
    manage_services "status" "${CREATED_SERVICES[@]}"
else
    echo "🔧 Presiona Ctrl+C para detener todos los procesos."
    echo "=================================================="
    # Esperar a que todos los procesos en segundo plano terminen
    wait
fi

