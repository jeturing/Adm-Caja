#!/bin/bash

# Script de verificación rápida antes del despliegue
# Ejecutar desde Backend/rest_coletions

echo "🔍 VERIFICACIÓN RÁPIDA DEL SISTEMA"
echo "=================================="

# Verificar ubicación
echo "📍 Ubicación actual: $(pwd)"
echo "📂 Contenido del directorio:"
ls -la

echo ""
echo "🔍 Verificando archivos necesarios:"

# Verificar scripts
files_to_check=(
    "start_backend_with_autodiscovery.sh"
    "deploy_jeturing.sh"
    "install_service.sh"
    "integrate_with_cloudflare.sh"
    "API_core.py"
    "manager.py"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file - Presente"
        if [ -x "$file" ]; then
            echo "   🔑 Ejecutable: SÍ"
        else
            echo "   🔑 Ejecutable: NO (aplicando permisos...)"
            chmod +x "$file" 2>/dev/null || echo "   ❌ Error al aplicar permisos"
        fi
    else
        echo "❌ $file - FALTANTE"
    fi
done

echo ""
echo "🔍 Verificando estructura del proyecto:"
echo "📂 Proyecto raíz (../../): "
ls -la ../../ | head -10

echo ""
echo "🔍 Verificando archivo .env:"
if [ -f "../../.env" ]; then
    echo "✅ .env encontrado en la raíz del proyecto"
else
    echo "⚠️ .env no encontrado. Disponible .env.example"
    if [ -f "../../.env.example" ]; then
        echo "💡 Puedes copiar: cp ../../.env.example ../../.env"
    fi
fi

echo ""
echo "🔍 Verificando sistema Cloudflare:"
if [ -f "/root/Cloudflare/cf_manager.sh" ]; then
    echo "✅ Sistema Cloudflare detectado en /root/Cloudflare/"
    if [ -f "/root/.cf_credentials" ]; then
        echo "✅ Credenciales Cloudflare presentes"
    else
        echo "❌ Credenciales Cloudflare no encontradas"
    fi
else
    echo "❌ Sistema Cloudflare no encontrado"
fi

echo ""
echo "🚀 LISTO PARA DESPLIEGUE"
echo "======================="
echo "Ejecuta: ./deploy_jeturing.sh"
