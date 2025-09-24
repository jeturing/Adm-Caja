#!/bin/bash

# Script para instalar el servicio Jeturing Core como servicio systemd
# Este servicio será accesible localmente y podrá exponerse mediante Cloudflare Tunnel

set -e

echo "🔧 Instalando Jeturing Core como servicio systemd"
echo "================================================="

# Verificar que se ejecuta como root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Error: Este script debe ejecutarse como root (use sudo)"
    exit 1
fi

# Obtener el directorio actual del proyecto
PROJECT_DIR=$(pwd)
SERVICE_NAME="jeturing-core"
SERVICE_USER="www-data"

echo "📂 Directorio del proyecto: $PROJECT_DIR"

# Crear usuario del servicio si no existe
if ! id "$SERVICE_USER" &>/dev/null; then
    echo "👤 Creando usuario del servicio: $SERVICE_USER"
    useradd --system --shell /bin/false --home-dir /var/lib/$SERVICE_NAME --create-home $SERVICE_USER
fi

# Usar el directorio actual como directorio de servicio
SERVICE_DIR="$PROJECT_DIR"
echo "📁 Usando directorio de servicio: $SERVICE_DIR"

# Crear el archivo de servicio systemd
echo "📝 Creando archivo de servicio systemd..."
cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=Jeturing Core Backend APIs
After=network.target
Wants=network.target

[Service]
Type=exec
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$SERVICE_DIR
Environment=PATH=$SERVICE_DIR/venv/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=$SERVICE_DIR/start.sh
ExecReload=/bin/kill -HUP \$MAINPID
KillMode=mixed
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

# Configuración de seguridad
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$SERVICE_DIR
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
EOF

# Crear script de wrapper para manejar el servicio correctamente
# Crear script de wrapper para manejar el servicio correctamente
echo "📝 Creando script wrapper..."
cat > $SERVICE_DIR/service_wrapper.sh << 'EOF'
#!/bin/bash
DIR=$(cd "$(dirname "$0")" && pwd)
cd "$DIR"
exec "$DIR/start.sh"
EOF

chmod +x $SERVICE_DIR/service_wrapper.sh
chown $SERVICE_USER:$SERVICE_USER $SERVICE_DIR/service_wrapper.sh

# Actualizar el archivo de servicio para usar el wrapper
sed -i "s|ExecStart=.*|ExecStart=$SERVICE_DIR/service_wrapper.sh|" /etc/systemd/system/$SERVICE_NAME.service

# Recargar systemd y habilitar el servicio
echo "🔄 Recargando systemd..."
systemctl daemon-reload

echo "✅ Habilitando servicio para inicio automático..."
systemctl enable $SERVICE_NAME

echo "🚀 Iniciando servicio..."
systemctl start $SERVICE_NAME

# Mostrar estado del servicio
sleep 3
echo ""
echo "📊 Estado del servicio:"
systemctl status $SERVICE_NAME --no-pager -l

echo ""
echo "🌐 URLs de acceso local:"
echo "=================================="
echo "API 1: http://localhost:8000/docs"
echo "API 2: http://localhost:8001/docs"
echo "API 3: http://localhost:8002/docs"
echo ""
echo "📋 Comandos útiles:"
echo "=================================="
echo "Ver logs:        sudo journalctl -u $SERVICE_NAME -f"
echo "Reiniciar:       sudo systemctl restart $SERVICE_NAME"
echo "Detener:         sudo systemctl stop $SERVICE_NAME"
echo "Deshabilitar:    sudo systemctl disable $SERVICE_NAME"
echo "Estado:          sudo systemctl status $SERVICE_NAME"
echo ""
echo "🔗 Para Cloudflare Tunnel:"
echo "=================================="
echo "Los servicios están corriendo en:"
echo "- localhost:8000 (API principal)"
echo "- localhost:8001 (API secundaria)"
echo "- localhost:8002 (Manager API)"
echo ""
echo "Ejemplo de configuración para cloudflared:"
echo "cloudflared tunnel route dns <tunnel_name> api.tudominio.com"
echo "cloudflared tunnel run --config config.yml <tunnel_name>"
echo ""
echo "✅ Servicio instalado correctamente!"
EOF
