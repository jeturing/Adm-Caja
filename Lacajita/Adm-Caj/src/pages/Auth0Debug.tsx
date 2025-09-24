import { ENV } from '../config/env';
import React from 'react';
import SentryTestButton from '../components/testing/SentryTestButton';

const Auth0Debug: React.FC = () => {
  const [debugInfo, setDebugInfo] = React.useState<string>('');

  React.useEffect(() => {
    const info = `
🔧 Auth0 Debug Information:

Domain: ${ENV.AUTH0_DOMAIN}
Client ID: ${ENV.AUTH0_CLIENT_ID || '(no configurado)'}
Current Origin: ${window.location.origin}
Current URL: ${window.location.href}
User Agent: ${navigator.userAgent}
Timestamp: ${new Date().toISOString()}

Configured Callback URLs in Auth0:
- http://localhost:5174/

Expected Auth0 Login URL:
https://${ENV.AUTH0_DOMAIN}/authorize?response_type=code&client_id=${encodeURIComponent(ENV.AUTH0_CLIENT_ID)}&redirect_uri=${encodeURIComponent(window.location.origin)}&scope=openid%20profile%20email
    `.trim();

    setDebugInfo(info);
  }, []);

  const testDirectAuth0 = () => {
  const authUrl = `https://${ENV.AUTH0_DOMAIN}/authorize?response_type=code&client_id=${encodeURIComponent(ENV.AUTH0_CLIENT_ID)}&redirect_uri=${encodeURIComponent(window.location.origin)}&scope=openid%20profile%20email`;
    
    console.log('🚀 Redirecting to Auth0:', authUrl);
    window.location.href = authUrl;
  };

  const testAuth0Ping = async () => {
    try {
      const response = await fetch('https://segrd.us.auth0.com/.well-known/openid_configuration');
      const data = await response.json();
      console.log('✅ Auth0 Domain is reachable:', data);
      alert('✅ Auth0 Domain is reachable! Check console for details.');
    } catch (error) {
      console.error('❌ Auth0 Domain unreachable:', error);
      alert('❌ Auth0 Domain unreachable. Check console for details.');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          🔧 Debug & Testing Panel
        </h1>
        
        {/* Sentry Testing Section */}
        <div className="mb-8">
          <SentryTestButton />
        </div>

        {/* Auth0 Debug Section */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            🔐 Auth0 Debug Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Debug Information</h3>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                {debugInfo}
              </pre>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Manual Tests</h3>
              <div className="space-y-4">
                <button
                  onClick={testAuth0Ping}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  🌐 Test Auth0 Domain Connectivity
                </button>

                <button
                  onClick={testDirectAuth0}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  🔐 Test Direct Auth0 Login
                </button>

          <a
            href={`https://${ENV.AUTH0_DOMAIN}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-center"
                >
                  🌍 Open Auth0 Domain
                </a>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <h3 className="font-semibold text-yellow-800 mb-2">Troubleshooting Steps:</h3>
                <ol className="text-sm text-yellow-700 space-y-1">
                  <li>1. Verify Auth0 domain is accessible</li>
                  <li>2. Check if user exists in Auth0 dashboard</li>
                  <li>3. Verify application is enabled</li>
                  <li>4. Check connection settings</li>
                  <li>5. Review Auth0 logs for errors</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth0Debug;
