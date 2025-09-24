// Script de depuración para la API de La Cajita TV
// Ejecutar con: node debug-api.js

import https from 'https';
import http from 'http';

const API_BASE = 'https://b5f8a23e7d06c2de5ef515ae93e16016.sajet.us';

console.log('🔍 Diagnóstico de La Cajita TV API');
console.log('=====================================');

// Función para hacer peticiones HTTP
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LaCajita-Debug/1.0',
        ...options.headers
      },
      // Ignorar certificados SSL inválidos para desarrollo
      rejectUnauthorized: false
    };

    const req = protocol.request(url, requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        let jsonData = null;
        try {
          jsonData = JSON.parse(data);
        } catch (e) {
          jsonData = data; // Si no es JSON, devolver como texto
        }
        
        resolve({
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          data: jsonData,
          rawData: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Tests a ejecutar
const tests = [
  {
    name: '1. Health Check',
    url: `${API_BASE}/health`,
    method: 'GET'
  },
  {
    name: '2. Root Endpoint',
    url: `${API_BASE}/`,
    method: 'GET'
  },
  {
    name: '3. OpenAPI Documentation',
    url: `${API_BASE}/openapi.json`,
    method: 'GET'
  },
  {
    name: '4. Login Endpoint (Query Params)',
    url: `${API_BASE}/login?email=admin&password=admin`,
    method: 'POST'
  },
  {
    name: '5. Login Endpoint (JSON Body)',
    url: `${API_BASE}/login`,
    method: 'POST',
    body: JSON.stringify({ email: 'admin', password: 'admin' }),
    headers: { 'Content-Type': 'application/json' }
  },
  {
    name: '6. Client Credentials',
    url: `${API_BASE}/auth/client-credentials`,
    method: 'POST',
    body: JSON.stringify({ client_secret: '3e1601b5f867d06c2de5ef515ae93e23e' }),
    headers: { 'Content-Type': 'application/json' }
  },
  {
    name: '7. Playlists (sin auth)',
    url: `${API_BASE}/playlists`,
    method: 'GET'
  }
];

// Ejecutar tests
async function runTests() {
  for (const test of tests) {
    console.log(`\n🧪 ${test.name}`);
    console.log(`   URL: ${test.url}`);
    console.log(`   Método: ${test.method}`);
    
    try {
      const result = await makeRequest(test.url, {
        method: test.method,
        body: test.body,
        headers: test.headers
      });
      
      console.log(`   ✅ Status: ${result.status} ${result.statusText}`);
      
      if (result.status >= 200 && result.status < 300) {
        console.log(`   📊 Respuesta: ${typeof result.data === 'object' ? JSON.stringify(result.data).substring(0, 100) + '...' : result.data.substring(0, 100)}`);
      } else if (result.status === 401) {
        console.log(`   🔒 Requiere autenticación`);
      } else if (result.status === 422) {
        console.log(`   ⚠️  Formato de datos incorrecto`);
        console.log(`   📄 Error: ${JSON.stringify(result.data)}`);
      } else {
        console.log(`   ❌ Error: ${JSON.stringify(result.data).substring(0, 200)}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error de conexión: ${error.message}`);
    }
    
    // Pausa entre requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Ejecutar diagnóstico
runTests().then(() => {
  console.log('\n🎯 Diagnóstico completado');
  console.log('\n📋 Resumen:');
  console.log('   - Si health check funciona: API está online');
  console.log('   - Si login da 422: endpoint existe pero formato incorrecto');
  console.log('   - Si login da 500: error interno del servidor');
  console.log('   - Si client-credentials funciona: usar ese para auth');
}).catch((error) => {
  console.error('💥 Error ejecutando diagnóstico:', error);
});
