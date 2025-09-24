#!/bin/bash

# Script de integración entre Jeturing Core y el gestor de Cloudflare existente
# Utiliza el sistema cf_manager.sh ya configurado en ~/Cloudflare/

set -e

COLOR_CYAN="\033[0;36m"
COLOR_GREEN="\033[0;32m"
COLOR_RED="\033[0;31m"
COLOR_YELLOW="\033[1;33m"
COLOR_RESET="\033[0m"

echo -e "${COLOR_CYAN}🔗 Integración Jeturing Core + Cloudflare Manager${COLOR_RESET}"
echo "=========================================================="

# Verificar que existe el gestor de Cloudflare
CF_MANAGER_PATH="/root/Cloudflare/cf_manager.sh"
DOMAINS_FILE="/root/Cloudflare/dominios.json"
CREDENTIALS_FILE="/root/.cf_credentials"

if [ ! -f "$CF_MANAGER_PATH" ]; then
    echo -e "${COLOR_RED}❌ No se encontró el gestor de Cloudflare en $CF_MANAGER_PATH${COLOR_RESET}"
    exit 1
fi

if [ ! -f "$DOMAINS_FILE" ]; then
    echo -e "${COLOR_RED}❌ No se encontró el archivo de dominios en $DOMAINS_FILE${COLOR_RESET}"
    exit 1
fi

if [ ! -f "$CREDENTIALS_FILE" ]; then
    echo -e "${COLOR_RED}❌ No se encontró el archivo de credenciales en $CREDENTIALS_FILE${COLOR_RESET}"
    exit 1
fi

echo -e "${COLOR_GREEN}✅ Sistema Cloudflare Manager encontrado${COLOR_RESET}"

# Mostrar dominios disponibles
echo -e "\n${COLOR_CYAN}📋 Dominios disponibles:${COLOR_RESET}"
if command -v jq &> /dev/null; then
    jq -r '.[] | "• \(.name)"' "$DOMAINS_FILE"
else
    echo "Instalando jq para mostrar dominios..."
    apt update && apt install -y jq
    jq -r '.[] | "• \(.name)"' "$DOMAINS_FILE"
fi

# Función para verificar si el servicio Jeturing está corriendo
check_jeturing_service() {
    if systemctl is-active --quiet jeturing-core; then
        echo -e "${COLOR_GREEN}✅ Servicio jeturing-core está corriendo${COLOR_RESET}"
        return 0
    else
        echo -e "${COLOR_YELLOW}⚠️ Servicio jeturing-core no está corriendo${COLOR_RESET}"
        return 1
    fi
}

# Función para crear túneles automáticamente para Jeturing Core
create_jeturing_tunnels() {
    local domain=$1
    local base_name=$(echo "$domain" | sed 's/\.[^.]*$//')
    
    echo -e "\n${COLOR_CYAN}🚀 Creando túneles para Jeturing Core en $domain${COLOR_RESET}"
    
    # Definir los servicios y puertos
    declare -A services=(
        ["api"]="8000"
        ["manager"]="8002"  
        ["app"]="8001"
    )
    
    for service in "${!services[@]}"; do
        local port=${services[$service]}
        local tunnel_name="${service}-${base_name}-jeturing"
        local full_domain="${service}.${domain}"
        
        echo -e "\n${COLOR_YELLOW}📡 Configurando túnel para $full_domain (puerto $port)${COLOR_RESET}"
        
        # Crear el túnel usando cloudflared directamente
        if cloudflared tunnel create "$tunnel_name" 2>/dev/null; then
            echo -e "${COLOR_GREEN}✅ Túnel '$tunnel_name' creado${COLOR_RESET}"
        else
            echo -e "${COLOR_YELLOW}⚠️ El túnel '$tunnel_name' ya existe o falló la creación${COLOR_RESET}"
        fi
        
        # Configurar DNS
        if cloudflared tunnel route dns "$tunnel_name" "$full_domain" 2>/dev/null; then
            echo -e "${COLOR_GREEN}✅ DNS configurado para $full_domain${COLOR_RESET}"
        else
            echo -e "${COLOR_YELLOW}⚠️ DNS para $full_domain ya existe o falló la configuración${COLOR_RESET}"
        fi
        
        # Crear servicio systemd
        local service_file="/etc/systemd/system/cloudflared-${tunnel_name}.service"
        
        cat > "$service_file" << EOF
[Unit]
Description=Cloudflare Tunnel for Jeturing Core - $full_domain
After=network.target jeturing-core.service
Requires=jeturing-core.service

[Service]
TimeoutStartSec=0
ExecStart=/usr/bin/cloudflared tunnel --no-autoupdate run --url http://localhost:${port} ${tunnel_name}
Restart=always
RestartSec=5s
User=root

[Install]
WantedBy=multi-user.target
EOF
        
        echo -e "${COLOR_GREEN}✅ Servicio systemd creado: $service_file${COLOR_RESET}"
        
        # Habilitar e iniciar el servicio
        systemctl daemon-reload
        systemctl enable "cloudflared-${tunnel_name}.service"
        
        if systemctl start "cloudflared-${tunnel_name}.service"; then
            echo -e "${COLOR_GREEN}✅ Servicio iniciado: cloudflared-${tunnel_name}${COLOR_RESET}"
        else
            echo -e "${COLOR_RED}❌ Error al iniciar el servicio: cloudflared-${tunnel_name}${COLOR_RESET}"
        fi
    done
}

# Función para mostrar el estado de los túneles
show_tunnel_status() {
    echo -e "\n${COLOR_CYAN}📊 Estado de los túneles Jeturing:${COLOR_RESET}"
    echo "============================================"
    
    for service in api manager app; do
        local service_pattern="cloudflared-${service}-*-jeturing.service"
        if systemctl list-units --type=service --state=running | grep -q "$service"; then
            echo -e "${COLOR_GREEN}✅ $service: Activo${COLOR_RESET}"
        else
            echo -e "${COLOR_RED}❌ $service: Inactivo${COLOR_RESET}"
        fi
    done
    
    echo -e "\n${COLOR_CYAN}🌐 Túneles registrados:${COLOR_RESET}"
    cloudflared tunnel list | grep -E "(api|manager|app).*jeturing" || echo "No hay túneles Jeturing registrados"
}

# Función para eliminar todos los túneles de Jeturing
cleanup_jeturing_tunnels() {
    echo -e "\n${COLOR_YELLOW}🧹 Limpiando túneles de Jeturing Core...${COLOR_RESET}"
    
    # Detener servicios
    for service in api manager app; do
        local service_pattern="cloudflared-${service}-*-jeturing"
        systemctl stop ${service_pattern}.service 2>/dev/null || true
        systemctl disable ${service_pattern}.service 2>/dev/null || true
    done
    
    # Eliminar archivos de servicio
    rm -f /etc/systemd/system/cloudflared-*-jeturing.service
    systemctl daemon-reload
    
    # Listar túneles para eliminación manual
    echo -e "${COLOR_CYAN}📋 Túneles Jeturing encontrados:${COLOR_RESET}"
    cloudflared tunnel list | grep -E "(api|manager|app).*jeturing" || echo "No hay túneles Jeturing para eliminar"
    
    echo -e "\n${COLOR_YELLOW}⚠️ Usa el comando siguiente para eliminar túneles manualmente:${COLOR_RESET}"
    echo "cloudflared tunnel delete TUNNEL_NAME_OR_ID"
}

# Menú principal
echo -e "\n${COLOR_CYAN}🎯 ¿Qué deseas hacer?${COLOR_RESET}"
PS3="Selecciona una opción: "
options=(
    "Verificar estado del servicio Jeturing"
    "Crear túneles automáticamente para Jeturing Core"
    "Ver estado de túneles existentes"
    "Abrir gestor completo de Cloudflare"
    "Limpiar túneles de Jeturing"
    "Salir"
)

select opt in "${options[@]}"; do
    case $opt in
        "Verificar estado del servicio Jeturing")
            check_jeturing_service
            echo -e "\n${COLOR_CYAN}💡 Si no está corriendo, ejecuta:${COLOR_RESET}"
            echo "sudo ./install_service.sh"
            ;;
        "Crear túneles automáticamente para Jeturing Core")
            if ! check_jeturing_service; then
                echo -e "${COLOR_RED}❌ El servicio Jeturing debe estar corriendo primero${COLOR_RESET}"
                echo "Ejecuta: sudo ./install_service.sh"
                break
            fi
            
            echo -e "\n${COLOR_CYAN}📋 Dominios disponibles:${COLOR_RESET}"
            jq -r '.[] | "\(.name)"' "$DOMAINS_FILE" | nl
            read -p "Selecciona el número del dominio: " domain_num
            
            selected_domain=$(jq -r --argjson index "$((domain_num-1))" '.[$index].name' "$DOMAINS_FILE")
            
            if [ "$selected_domain" != "null" ] && [ -n "$selected_domain" ]; then
                create_jeturing_tunnels "$selected_domain"
                echo -e "\n${COLOR_GREEN}🎉 Túneles creados exitosamente!${COLOR_RESET}"
                echo -e "\n${COLOR_CYAN}🌐 URLs públicas:${COLOR_RESET}"
                echo "• https://api.$selected_domain"
                echo "• https://manager.$selected_domain"
                echo "• https://app.$selected_domain"
            else
                echo -e "${COLOR_RED}❌ Dominio no válido${COLOR_RESET}"
            fi
            ;;
        "Ver estado de túneles existentes")
            show_tunnel_status
            ;;
        "Abrir gestor completo de Cloudflare")
            echo -e "${COLOR_CYAN}🚀 Abriendo gestor completo de Cloudflare...${COLOR_RESET}"
            cd /root/Cloudflare
            exec bash cf_manager.sh
            ;;
        "Limpiar túneles de Jeturing")
            cleanup_jeturing_tunnels
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
    echo -e "\n${COLOR_CYAN}🎯 ¿Qué más deseas hacer?${COLOR_RESET}"
done

echo -e "\n${COLOR_GREEN}👋 ¡Configuración completada!${COLOR_RESET}"
