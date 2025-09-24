#!/bin/bash

# Script maestro para desplegar Jeturing Core completo
# Incluye instalación de servicios e integración con Cloudflare

set -e

COLOR_CYAN="\033[0;36m"
COLOR_GREEN="\033[0;32m"
COLOR_RED="\033[0;31m"
COLOR_YELLOW="\033[1;33m"
COLOR_RESET="\033[0m"

echo -e "${COLOR_CYAN}🚀 DESPLIEGUE COMPLETO - JETURING CORE${COLOR_RESET}"
echo "=========================================="

# Verificar que estamos ejecutando como root
if [ "$EUID" -ne 0 ]; then
    echo -e "${COLOR_RED}❌ Este script debe ejecutarse como root${COLOR_RESET}"
    echo "Usa: sudo $0"
    exit 1
fi

# Función para verificar el sistema Cloudflare
check_cloudflare_system() {
    local cf_manager="/root/Cloudflare/cf_manager.sh"
    local domains_file="/root/Cloudflare/dominios.json"
    local credentials_file="/root/.cf_credentials"
    
    if [ -f "$cf_manager" ] && [ -f "$domains_file" ] && [ -f "$credentials_file" ]; then
        echo -e "${COLOR_GREEN}✅ Sistema Cloudflare detectado y configurado${COLOR_RESET}"
        echo -e "   • Gestor: $cf_manager"
        echo -e "   • Dominios: $(jq -r 'length' "$domains_file") disponibles"
        return 0
    else
        echo -e "${COLOR_YELLOW}⚠️ Sistema Cloudflare no completamente configurado${COLOR_RESET}"
        return 1
    fi
}

# Paso 1: Verificar y mostrar estado actual
echo -e "\n${COLOR_CYAN}📋 ESTADO ACTUAL DEL SISTEMA${COLOR_RESET}"
echo "==============================="

# Verificar auto-discovery
if [ -f "./start_backend_with_autodiscovery.sh" ]; then
    echo -e "${COLOR_GREEN}✅ Script de auto-discovery presente${COLOR_RESET}"
else
    echo -e "${COLOR_RED}❌ Script de auto-discovery no encontrado${COLOR_RESET}"
fi

# Verificar servicio
if systemctl is-active --quiet jeturing-core 2>/dev/null; then
    echo -e "${COLOR_GREEN}✅ Servicio jeturing-core: ACTIVO${COLOR_RESET}"
    SERVICE_INSTALLED=true
else
    echo -e "${COLOR_YELLOW}⚠️ Servicio jeturing-core: NO INSTALADO/INACTIVO${COLOR_RESET}"
    SERVICE_INSTALLED=false
fi

# Verificar Cloudflare
if check_cloudflare_system; then
    CLOUDFLARE_READY=true
else
    CLOUDFLARE_READY=false
fi

# Paso 2: Menú de opciones
echo -e "\n${COLOR_CYAN}🎯 OPCIONES DE DESPLIEGUE${COLOR_RESET}"
echo "=========================="

PS3="Selecciona una opción: "
options=(
    "Despliegue completo (Servicio + Cloudflare)"
    "Solo instalar servicio systemd"
    "Solo configurar Cloudflare (requiere servicio activo)"
    "Verificar estado de APIs"
    "Desinstalar todo"
    "Salir"
)

select opt in "${options[@]}"; do
    case $opt in
        "Despliegue completo (Servicio + Cloudflare)")
            echo -e "\n${COLOR_CYAN}🚀 INICIANDO DESPLIEGUE COMPLETO${COLOR_RESET}"
            
            # Instalar servicio si no está activo
            if [ "$SERVICE_INSTALLED" = false ]; then
                echo -e "\n${COLOR_YELLOW}📦 Instalando servicio systemd...${COLOR_RESET}"
                if [ -f "./install_service.sh" ]; then
                    chmod +x ./install_service.sh
                    ./install_service.sh
                    echo -e "${COLOR_GREEN}✅ Servicio instalado${COLOR_RESET}"
                else
                    echo -e "${COLOR_RED}❌ install_service.sh no encontrado${COLOR_RESET}"
                    break
                fi
            fi
            
            # Esperar a que el servicio esté completamente activo
            echo -e "\n${COLOR_YELLOW}⏳ Esperando a que las APIs estén completamente activas...${COLOR_RESET}"
            sleep 10
            
            # Configurar Cloudflare
            if [ "$CLOUDFLARE_READY" = true ]; then
                echo -e "\n${COLOR_YELLOW}🌐 Configurando túneles Cloudflare...${COLOR_RESET}"
                chmod +x ./integrate_with_cloudflare.sh
                ./integrate_with_cloudflare.sh
            else
                echo -e "\n${COLOR_RED}❌ Sistema Cloudflare no está listo${COLOR_RESET}"
                echo "Configura primero:"
                echo "1. /root/Cloudflare/cf_manager.sh"
                echo "2. /root/Cloudflare/dominios.json"
                echo "3. /root/.cf_credentials"
            fi
            ;;
            
        "Solo instalar servicio systemd")
            echo -e "\n${COLOR_YELLOW}📦 Instalando solo el servicio...${COLOR_RESET}"
            if [ -f "./install_service.sh" ]; then
                chmod +x ./install_service.sh
                ./install_service.sh
            else
                echo -e "${COLOR_RED}❌ install_service.sh no encontrado${COLOR_RESET}"
            fi
            ;;
            
        "Solo configurar Cloudflare (requiere servicio activo)")
            if systemctl is-active --quiet jeturing-core; then
                echo -e "\n${COLOR_YELLOW}🌐 Configurando Cloudflare...${COLOR_RESET}"
                if [ "$CLOUDFLARE_READY" = true ]; then
                    chmod +x ./integrate_with_cloudflare.sh
                    ./integrate_with_cloudflare.sh
                else
                    echo -e "${COLOR_RED}❌ Sistema Cloudflare no configurado${COLOR_RESET}"
                fi
            else
                echo -e "${COLOR_RED}❌ El servicio jeturing-core no está activo${COLOR_RESET}"
                echo "Instala primero el servicio con la opción 2"
            fi
            ;;
            
        "Verificar estado de APIs")
            echo -e "\n${COLOR_CYAN}📊 ESTADO DE LAS APIs${COLOR_RESET}"
            echo "===================="
            
            if systemctl is-active --quiet jeturing-core; then
                echo -e "${COLOR_GREEN}✅ Servicio jeturing-core: ACTIVO${COLOR_RESET}"
                
                # Verificar puertos
                for port in 8000 8001 8002; do
                    if ss -tuln | grep -q ":$port "; then
                        echo -e "${COLOR_GREEN}✅ Puerto $port: ACTIVO${COLOR_RESET}"
                    else
                        echo -e "${COLOR_RED}❌ Puerto $port: INACTIVO${COLOR_RESET}"
                    fi
                done
                
                # Mostrar logs recientes
                echo -e "\n${COLOR_CYAN}📝 Últimos logs del servicio:${COLOR_RESET}"
                journalctl -u jeturing-core --no-pager -n 10
                
            else
                echo -e "${COLOR_RED}❌ Servicio jeturing-core: INACTIVO${COLOR_RESET}"
            fi
            
            # Verificar túneles Cloudflare
            echo -e "\n${COLOR_CYAN}🌐 Estado de túneles Cloudflare:${COLOR_RESET}"
            if command -v cloudflared &> /dev/null; then
                cloudflared tunnel list | grep -E "(api|manager|app).*jeturing" || echo "No hay túneles Jeturing activos"
            else
                echo "cloudflared no instalado"
            fi
            ;;
            
        "Desinstalar todo")
            echo -e "\n${COLOR_RED}🗑️ DESINSTALACIÓN COMPLETA${COLOR_RESET}"
            echo "=========================="
            
            read -p "¿Estás seguro? Esto eliminará servicios y túneles (y/n): " confirm
            if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                # Detener servicio
                systemctl stop jeturing-core 2>/dev/null || true
                systemctl disable jeturing-core 2>/dev/null || true
                rm -f /etc/systemd/system/jeturing-core.service
                
                # Limpiar túneles Cloudflare
                if [ -f "./integrate_with_cloudflare.sh" ]; then
                    chmod +x ./integrate_with_cloudflare.sh
                    echo "Ejecuta manualmente para limpiar túneles:"
                    echo "./integrate_with_cloudflare.sh (opción 5)"
                fi
                
                systemctl daemon-reload
                echo -e "${COLOR_GREEN}✅ Desinstalación completada${COLOR_RESET}"
            else
                echo "Desinstalación cancelada"
            fi
            ;;
            
        "Salir")
            break
            ;;
            
        *) 
            echo -e "${COLOR_RED}Opción no válida${COLOR_RESET}"
            ;;
    esac
    
    echo -e "\n${COLOR_CYAN}Presiona Enter para continuar...${COLOR_RESET}"
    read
    
    # Actualizar estado después de cada operación
    if systemctl is-active --quiet jeturing-core 2>/dev/null; then
        SERVICE_INSTALLED=true
    else
        SERVICE_INSTALLED=false
    fi
    
    echo -e "\n${COLOR_CYAN}🎯 ¿Qué más deseas hacer?${COLOR_RESET}"
done

echo -e "\n${COLOR_GREEN}👋 ¡Despliegue finalizado!${COLOR_RESET}"
