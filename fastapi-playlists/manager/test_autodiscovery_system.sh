#!/bin/bash

# Script de prueba para el sistema de Auto-Discovery de Seguridad
# Verifica que todos los componentes estén funcionando correctamente

echo "🧪 Pruebas del Sistema de Auto-Discovery de Seguridad"
echo "=================================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contadores
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Función para ejecutar pruebas
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    echo -e "${BLUE}🔍 Ejecutando: $test_name${NC}"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASS: $test_name${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ FAIL: $test_name${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    echo ""
}

# Función para pruebas HTTP
test_http_endpoint() {
    local endpoint="$1"
    local expected_status="$2"
    local description="$3"
    
    echo -e "${BLUE}🌐 Probando: $description${NC}"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080$endpoint" 2>/dev/null)
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS: $description (HTTP $response)${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ FAIL: $description (HTTP $response, esperado $expected_status)${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    echo ""
}

# Verificar que el backend esté ejecutándose
echo -e "${YELLOW}📡 Verificando conectividad del backend...${NC}"
if ! curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: El backend no está ejecutándose en localhost:8080${NC}"
    echo -e "${YELLOW}💡 Ejecuta primero: ./start_backend_with_autodiscovery.sh${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend conectado correctamente${NC}"
echo ""

# Pruebas de endpoints básicos
echo -e "${BLUE}🔧 === PRUEBAS DE ENDPOINTS BÁSICOS ===${NC}"
test_http_endpoint "/health" "200" "Health Check"
test_http_endpoint "/docs" "200" "API Documentation"
test_http_endpoint "/openapi.json" "200" "OpenAPI Schema"

# Pruebas de endpoints de auto-discovery
echo -e "${BLUE}🔍 === PRUEBAS DE AUTO-DISCOVERY ===${NC}"
test_http_endpoint "/api/security/endpoints" "200" "Security Discovery Endpoint"

# Verificar contenido del endpoint de discovery
echo -e "${BLUE}📊 Verificando contenido del discovery endpoint...${NC}"
discovery_response=$(curl -s http://localhost:8080/api/security/endpoints 2>/dev/null)

if echo "$discovery_response" | jq -e '.endpoints' > /dev/null 2>&1; then
    endpoint_count=$(echo "$discovery_response" | jq -r '.total_endpoints // 0')
    categories_count=$(echo "$discovery_response" | jq -r '.categories | length // 0')
    
    echo -e "${GREEN}✅ Discovery response válido${NC}"
    echo -e "  📈 Total endpoints: $endpoint_count"
    echo -e "  📂 Total categorías: $categories_count"
    
    if [ "$endpoint_count" -gt 0 ]; then
        echo -e "${GREEN}✅ PASS: Endpoints encontrados en discovery${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ FAIL: No se encontraron endpoints en discovery${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Mostrar categorías encontradas
    if [ "$categories_count" -gt 0 ]; then
        echo -e "  🏷️  Categorías encontradas:"
        echo "$discovery_response" | jq -r '.categories[]' | sed 's/^/    - /'
    fi
else
    echo -e "${RED}❌ FAIL: Discovery response inválido${NC}"
    echo -e "Response: $discovery_response"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
fi
echo ""

# Verificar archivos del sistema
echo -e "${BLUE}📁 === VERIFICACIÓN DE ARCHIVOS ===${NC}"
run_test "Archivo security_metadata.py existe" "test -f Backend/security_metadata.py"
run_test "Archivo security_metadata.py no está vacío" "test -s Backend/security_metadata.py"
run_test "Servicio securityAutoDiscovery existe" "test -f Adm-WebCore/src/services/securityAutoDiscovery.ts"
run_test "Componente SecurityAutoDiscoveryPanel existe" "test -f Adm-WebCore/src/components/security/SecurityAutoDiscoveryPanel.tsx"

# Verificar contenido de archivos críticos
echo -e "${BLUE}🔍 === VERIFICACIÓN DE CONTENIDO ===${NC}"
run_test "SecurityRegistry está definido en security_metadata.py" "grep -q 'class SecurityRegistry' Backend/security_metadata.py"
run_test "secure_endpoint está definido en security_metadata.py" "grep -q 'def secure_endpoint' Backend/security_metadata.py"
run_test "register_existing_endpoints está llamado" "grep -q 'register_existing_endpoints()' Backend/security_metadata.py"

# Verificar imports en API.py
run_test "API.py importa security_metadata" "grep -q 'security_metadata' Backend/API.py"
run_test "API.py tiene endpoint de discovery" "grep -q '/api/security/endpoints' Backend/API.py"

# Pruebas de Python
echo -e "${BLUE}🐍 === PRUEBAS DE PYTHON ===${NC}"
cd Backend

# Verificar que se puede importar security_metadata
echo -e "${BLUE}📦 Verificando imports de Python...${NC}"
TESTS_TOTAL=$((TESTS_TOTAL + 1))
if python3 -c "from security_metadata import SecurityRegistry, secure_endpoint; print('Imports OK')" 2>/dev/null; then
    echo -e "${GREEN}✅ PASS: Imports de security_metadata funcionan${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ FAIL: Error en imports de security_metadata${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Verificar que hay endpoints registrados
echo -e "${BLUE}📊 Verificando endpoints registrados...${NC}"
TESTS_TOTAL=$((TESTS_TOTAL + 1))
endpoints_count=$(python3 -c "
try:
    from security_metadata import SecurityRegistry
    endpoints = SecurityRegistry.get_all_endpoints()
    print(len(endpoints))
except Exception as e:
    print('0')
" 2>/dev/null)

if [ "$endpoints_count" -gt 0 ]; then
    echo -e "${GREEN}✅ PASS: $endpoints_count endpoints registrados en SecurityRegistry${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    
    # Mostrar detalles de endpoints registrados
    echo -e "  📋 Endpoints registrados:"
    python3 -c "
from security_metadata import SecurityRegistry
endpoints = SecurityRegistry.get_all_endpoints()
categories = SecurityRegistry.get_categories()

print(f'    Total: {len(endpoints)}')
print(f'    Categorías: {len(categories)}')
for category in sorted(categories):
    count = len([e for e in endpoints.values() if e.menu_category == category])
    print(f'      - {category}: {count} endpoints')
" 2>/dev/null
else
    echo -e "${RED}❌ FAIL: No hay endpoints registrados en SecurityRegistry${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

cd ..

# Verificar configuración de Auth0
echo -e "${BLUE}🔐 === VERIFICACIÓN DE AUTH0 ===${NC}"
run_test "AUTH0_DOMAIN está configurado" "test -n '$AUTH0_DOMAIN'"
run_test "AUTH0_API_AUDIENCE está configurado" "test -n '$AUTH0_API_AUDIENCE'"
run_test "AUTH0_MGMT_CLIENT_ID está configurado" "test -n '$AUTH0_MGMT_CLIENT_ID'"
run_test "AUTH0_MGMT_CLIENT_SECRET está configurado" "test -n '$AUTH0_MGMT_CLIENT_SECRET'"

# Prueba de conectividad con Auth0
if [ -n "$AUTH0_DOMAIN" ]; then
    echo -e "${BLUE}🌐 Probando conectividad con Auth0...${NC}"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if curl -s "https://$AUTH0_DOMAIN/.well-known/jwks.json" | jq -e '.keys' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS: Conectividad con Auth0 OK${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ FAIL: No se puede conectar con Auth0${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
fi

# Verificar frontend
echo -e "${BLUE}🎨 === VERIFICACIÓN DE FRONTEND ===${NC}"
cd Adm-WebCore

# Verificar que existen los archivos TypeScript
run_test "Archivo de tipos permissions.ts actualizado" "grep -q 'CrudPermissions' src/types/permissions.ts"
run_test "UserPermissionsManager incluye auto-discovery" "grep -q 'auto-discovery' src/components/security/UserPermissionsManager.tsx"

# Verificar configuración de API
run_test "API config incluye endpoints de seguridad" "grep -q 'SECURITY:' src/config/api.ts"

cd ..

# Resumen final
echo ""
echo -e "${BLUE}📊 === RESUMEN DE PRUEBAS ===${NC}"
echo -e "${GREEN}✅ Pruebas exitosas: $TESTS_PASSED${NC}"
echo -e "${RED}❌ Pruebas fallidas: $TESTS_FAILED${NC}"
echo -e "${BLUE}📈 Total de pruebas: $TESTS_TOTAL${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 ¡TODAS LAS PRUEBAS PASARON!${NC}"
    echo -e "${GREEN}✨ El sistema de Auto-Discovery está funcionando correctamente${NC}"
    echo ""
    echo -e "${BLUE}🚀 Próximos pasos:${NC}"
    echo -e "  1. Abre el frontend: http://localhost:3000"
    echo -e "  2. Ve a: Gestión de Permisos → Auto-Discovery"
    echo -e "  3. Ejecuta el redescubrimiento de endpoints"
    echo -e "  4. Configura la sincronización automática"
    exit 0
else
    echo ""
    echo -e "${RED}⚠️  ALGUNAS PRUEBAS FALLARON${NC}"
    echo -e "${YELLOW}🔧 Revisa los errores arriba y corrige los problemas antes de continuar${NC}"
    
    if [ $TESTS_FAILED -eq $TESTS_TOTAL ]; then
        echo -e "${RED}💥 TODAS LAS PRUEBAS FALLARON - Verifica la configuración básica${NC}"
    fi
    
    exit 1
fi
