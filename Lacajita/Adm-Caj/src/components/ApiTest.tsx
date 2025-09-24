import React, { useState } from 'react';

// Protección: solo permitir pruebas de client-credentials si la flag VITE_ENABLE_CLIENT_CREDENTIALS está activa
const ENABLE_CLIENT_CREDENTIALS = (import.meta.env.VITE_ENABLE_CLIENT_CREDENTIALS || 'false') === 'true';

const ApiTest: React.FC = () => {
  const [results, setResults] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    setResults(prev => prev + '\n' + message);
  };

  const testProxy = async () => {
    setLoading(true);
    setResults('🔍 Iniciando pruebas de conectividad...');

    try {
      // Probar endpoint raíz a través del proxy
      addResult('\n📡 Probando endpoint raíz...');
      const rootResponse = await fetch('/api/', {
        method: 'GET',
      });
      addResult(`✅ Root response: ${rootResponse.status} - ${await rootResponse.text()}`);

      // Probar client credentials (solo si está explícitamente habilitado en VITE)
      if (!ENABLE_CLIENT_CREDENTIALS) {
        addResult('\n🔒 Client Credentials está deshabilitado en el navegador (VITE_ENABLE_CLIENT_CREDENTIALS=false). Saltando prueba.');
      } else {
        // Ejecutar la prueba de client-credentials (solo entornos de desarrollo controlados)
        addResult('\n🔑 Probando client credentials...');
        const clientResponse = await fetch('/api/auth/client-credentials', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_secret: import.meta.env.VITE_SECRET_KEY || import.meta.env.VITE_CLIENT_SECRET || ''
          })
        });

        if (clientResponse.ok) {
          const clientData = await clientResponse.json();
          addResult(`✅ Client credentials OK: ${clientData.token_type} token recibido`);

          // Probar login con token
          addResult('\n🔐 Probando login de usuario...');
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

          if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            addResult(`✅ Login exitoso: ${loginData.token_type} token recibido`);
          } else {
            const loginError = await loginResponse.text();
            addResult(`❌ Login falló: ${loginResponse.status} - ${loginError}`);
          }
        } else {
          const clientError = await clientResponse.text();
          addResult(`❌ Client credentials falló: ${clientResponse.status} - ${clientError}`);
        }
      }

    } catch (error) {
      addResult(`❌ Error en las pruebas: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>🔧 Pruebas de API</h2>
      <button onClick={testProxy} disabled={loading}>
        {loading ? 'Probando...' : 'Ejecutar Pruebas'}
      </button>
      <pre style={{ 
        background: '#f5f5f5', 
        padding: '10px', 
        marginTop: '20px',
        maxHeight: '400px',
        overflow: 'auto'
      }}>
        {results}
      </pre>
    </div>
  );
};

export default ApiTest;
