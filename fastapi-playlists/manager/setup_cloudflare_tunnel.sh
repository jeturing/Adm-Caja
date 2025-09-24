#!/bin/bash

# DEPRECATED: Este script ha sido reemplazado por integrate_with_cloudflare.sh
# Utiliza el nuevo script que se integra con el sistema cf_manager.sh existente

echo "⚠️  SCRIPT DEPRECADO"
echo "===================="
echo ""
echo "Este script ha sido reemplazado por una integración más avanzada."
echo ""
echo "� Usa el nuevo script:"
echo "   ./integrate_with_cloudflare.sh"
echo ""
echo "✨ Características del nuevo sistema:"
echo "• Integración con cf_manager.sh existente"
echo "• Gestión automática de múltiples dominios"
echo "• Servicios systemd con dependencias"
echo "• Estado y monitoreo de túneles"
echo ""
exit 1

# Verificar que el servicio jeturing-core está corriendo
if ! systemctl is-active --quiet jeturing-core; then
    echo "⚠️ El servicio jeturing-core no está corriendo. Iniciándolo..."
    systemctl start jeturing-core
    sleep 5
fi

echo "🔑 Configuración inicial de Cloudflare Tunnel"
echo "=============================================="
echo ""
echo "1. Primero, autentica con Cloudflare:"
echo "   cloudflared tunnel login"
echo ""
echo "2. Crea un nuevo tunnel:"
echo "   cloudflared tunnel create jeturing-core"
echo ""
echo "3. Copia el UUID que se muestra y edita el archivo de configuración:"
echo "   cp cloudflare-tunnel-config.yml.example ~/.cloudflared/config.yml"
echo "   nano ~/.cloudflared/config.yml"
echo ""
echo "4. Configura los DNS records:"
echo "   cloudflared tunnel route dns jeturing-core api.tudominio.com"
echo "   cloudflared tunnel route dns jeturing-core manager.tudominio.com"
echo "   cloudflared tunnel route dns jeturing-core app.tudominio.com"
echo ""
echo "5. Ejecuta el tunnel:"
echo "   cloudflared tunnel run jeturing-core"
echo ""
echo "6. (Opcional) Instala como servicio:"
echo "   cloudflared service install"
echo ""

# Crear script de configuración automática
cat > setup_tunnel.sh << 'EOF'
#!/bin/bash

# Script de configuración automática del tunnel
echo "🔧 Configuración automática iniciada..."

# Verificar variables
if [ -z "$TUNNEL_NAME" ]; then
    TUNNEL_NAME="jeturing-core"
fi

if [ -z "$DOMAIN" ]; then
    echo "❌ Error: Define la variable DOMAIN antes de ejecutar"
    echo "Ejemplo: export DOMAIN=tudominio.com"
    exit 1
fi

# Crear tunnel
echo "📡 Creando tunnel: $TUNNEL_NAME"
TUNNEL_UUID=$(cloudflared tunnel create $TUNNEL_NAME | grep -oP 'Created tunnel \K[a-f0-9-]+')

if [ -z "$TUNNEL_UUID" ]; then
    echo "❌ Error creando el tunnel"
    exit 1
fi

echo "✅ Tunnel creado con UUID: $TUNNEL_UUID"

# Crear archivo de configuración
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << EOL
tunnel: $TUNNEL_UUID
credentials-file: /root/.cloudflared/$TUNNEL_UUID.json

ingress:
  - hostname: api.$DOMAIN
    service: http://localhost:8000
  - hostname: manager.$DOMAIN
    service: http://localhost:8002  
  - hostname: app.$DOMAIN
    service: http://localhost:8001
  - service: http_status:404

loglevel: info
EOL

# Configurar DNS
echo "🌐 Configurando DNS records..."
cloudflared tunnel route dns $TUNNEL_NAME api.$DOMAIN
cloudflared tunnel route dns $TUNNEL_NAME manager.$DOMAIN
cloudflared tunnel route dns $TUNNEL_NAME app.$DOMAIN

echo "✅ Configuración completada!"
echo ""
echo "🚀 Para iniciar el tunnel:"
echo "   cloudflared tunnel run $TUNNEL_NAME"
echo ""
echo "🔧 Para instalar como servicio:"
echo "   cloudflared service install"
echo "   systemctl enable cloudflared"
echo "   systemctl start cloudflared"
echo ""
echo "🌐 URLs públicas:"
echo "   https://api.$DOMAIN"
echo "   https://manager.$DOMAIN"  
echo "   https://app.$DOMAIN"
EOF

chmod +x setup_tunnel.sh

echo "📋 Archivos creados:"
echo "==================="
echo "• setup_tunnel.sh - Script de configuración automática"
echo "• cloudflare-tunnel-config.yml.example - Ejemplo de configuración"
echo ""
echo "🚀 Para configurar automáticamente:"
echo "   export DOMAIN=tudominio.com"
echo "   ./setup_tunnel.sh"
echo ""
echo "✅ Configuración de Cloudflare Tunnel lista!"
