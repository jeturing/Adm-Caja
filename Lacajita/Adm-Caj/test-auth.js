// Script simple para probar la autenticación
async function testAuth() {
  console.log('🔍 Probando autenticación...');
  
  try {
    // Probar client credentials
    console.log('📡 Probando client credentials...');
    const clientResponse = await fetch('/api/auth/client-credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_secret: '3e1601b5f867d06c2de5ef515ae93e23e'
      })
    });
    
    const clientData = await clientResponse.json();
    console.log('✅ Client credentials:', clientData);
    
    // Probar login de usuario
    console.log('🔐 Probando login de usuario...');
    const loginResponse = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'soc@jeturign.com',
        password: '*963.Abcd.'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('✅ Login response:', loginData);
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  }
}

// Ejecutar pruebas
testAuth();
