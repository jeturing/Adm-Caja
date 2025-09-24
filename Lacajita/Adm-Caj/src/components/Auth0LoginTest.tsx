import React from 'react';
import { ENV } from '../config/env';

function Auth0LoginTest() {
  const [result, setResult] = React.useState<string>('');

  const redirectToAuth0 = () => {
    const domain = 'segrd.us.auth0.com';
    const clientId = ENV.AUTH0_CLIENT_ID || '';
    const redirectUri = encodeURIComponent(window.location.origin + '/callback');
    const scope = encodeURIComponent('openid profile email');
    const audience = encodeURIComponent('https://b5f8a23e7d06c2de5ef515ae93e16016.sajet.us/');

    const auth0Url = `https://${domain}/authorize?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${redirectUri}&` +
      `scope=${scope}&` +
      `audience=${audience}`;

    setResult('Redirigiendo a Auth0...');
    window.location.href = auth0Url;
  };

  const testDirectAuth = async () => {
    try {
      setResult('🔄 Probando autenticación directa...');
      
      // Intentar con el endpoint de login de nuestra API
      const response = await fetch('/api/login?email=soc@jeturing.com&password=*963.Abcd.', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      if (response.ok) {
        const data = await response.json();
        setResult(`✅ Login exitoso: ${JSON.stringify(data, null, 2)}`);
      } else {
        const errorText = await response.text();
        setResult(`❌ Error ${response.status}: ${errorText}`);
      }
    } catch (error) {
      setResult(`❌ Error de red: ${error}`);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-md mx-auto mt-10">
      <h2 className="text-xl font-bold mb-4">Prueba de Auth0</h2>
      <p className="text-sm text-gray-600 mb-4">
        Probar diferentes métodos de autenticación
      </p>
      
      <div className="space-y-3">
        <button
          onClick={redirectToAuth0}
          className="w-full px-4 py-2 rounded-md text-white font-medium bg-blue-600 hover:bg-blue-700"
        >
          Login con Auth0 (Redirect)
        </button>
        
        <button
          onClick={testDirectAuth}
          className="w-full px-4 py-2 rounded-md text-white font-medium bg-green-600 hover:bg-green-700"
        >
          Probar API Directa
        </button>
      </div>
      
      {result && (
        <div className="mt-4 p-3 rounded-md bg-gray-50 text-sm">
          <pre className="whitespace-pre-wrap">{result}</pre>
        </div>
      )}
    </div>
  );
}

export default Auth0LoginTest;
