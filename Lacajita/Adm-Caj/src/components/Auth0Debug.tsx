import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { ENV } from '../config/env';

export const Auth0Debug: React.FC = () => {
  const { loginWithRedirect, logout, user, isAuthenticated, isLoading, error } = useAuth0();
  const [domainStatus, setDomainStatus] = React.useState<'testing' | 'accessible' | 'cors-blocked'>('testing');

  const handleLogin = async () => {
    try {
      await loginWithRedirect({
        appState: { returnTo: window.location.pathname }
      });
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  const handleLogout = () => {
    logout({ 
      logoutParams: { 
        returnTo: window.location.origin 
      } 
    });
  };

  // Test Auth0 domain connectivity
  const testAuth0Ping = async () => {
    try {
      // Use a simple endpoint that should work with CORS
      const response = await fetch(`https://${ENV.AUTH0_DOMAIN}/.well-known/openid-configuration`);
      if (response.ok) {
        console.log('✅ Auth0 Domain accessible:', response.status);
        return true;
      } else {
        console.log('⚠️ Auth0 Domain responded with:', response.status);
        return false;
      }
    } catch (err) {
      console.log('❌ Auth0 Domain connectivity test failed:', err);
      // This is normal for CORS restrictions, doesn't mean Auth0 won't work
      console.log('ℹ️ This error is expected due to CORS restrictions and doesn\'t affect Auth0 functionality');
      return false;
    }
  };

  React.useEffect(() => {
    testAuth0Ping().then(success => {
      setDomainStatus(success ? 'accessible' : 'cors-blocked');
    });
  }, []);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>🔧 Auth0 Debug Information</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <strong>Domain:</strong> {ENV.AUTH0_DOMAIN}<br/>
        <strong>Client ID:</strong> {ENV.AUTH0_CLIENT_ID}<br/>
        <strong>Current Origin:</strong> {window.location.origin}<br/>
        <strong>Current URL:</strong> {window.location.href}<br/>
        <strong>User Agent:</strong> {navigator.userAgent}<br/>
        <strong>Timestamp:</strong> {new Date().toISOString()}<br/>
        <strong>Domain Status:</strong> 
        <span style={{ 
          color: domainStatus === 'accessible' ? 'green' : domainStatus === 'cors-blocked' ? 'orange' : 'blue',
          marginLeft: '5px'
        }}>
          {domainStatus === 'testing' && '🔄 Testing...'}
          {domainStatus === 'accessible' && '✅ Accessible'}
          {domainStatus === 'cors-blocked' && '⚠️ CORS Blocked (Normal)'}
        </span>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <strong>Environment Variables:</strong><br/>
        <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', fontSize: '12px' }}>
          VITE_AUTH0_DOMAIN: {import.meta.env.VITE_AUTH0_DOMAIN || 'not set'}<br/>
          VITE_AUTH0_CLIENT_ID: {import.meta.env.VITE_AUTH0_CLIENT_ID || 'not set'}<br/>
          VITE_API_BASE_URL: {import.meta.env.VITE_API_BASE_URL || 'not set'}<br/>
          <br/>
          ENV.AUTH0_DOMAIN: {ENV.AUTH0_DOMAIN}<br/>
          ENV.AUTH0_CLIENT_ID: {ENV.AUTH0_CLIENT_ID}<br/>
          ENV.API_BASE_URL: {ENV.API_BASE_URL}<br/>
          <br/>
          <strong>Debug Info:</strong><br/>
          DEV: {import.meta.env.DEV ? 'true' : 'false'}<br/>
          MODE: {import.meta.env.MODE}<br/>
          All env vars: {JSON.stringify(import.meta.env, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <strong>Configured Callback URLs in Auth0:</strong>
        <ul>
          <li>http://localhost:5174/</li>
          <li>http://localhost:3000/</li>
          <li>https://b5f8a23e7d06c2de5ef515ae93e16016.sajet.us/</li>
        </ul>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <strong>Expected Auth0 Login URL:</strong><br/>
        <small>
          https://{ENV.AUTH0_DOMAIN}/authorize?response_type=code&client_id={ENV.AUTH0_CLIENT_ID}&redirect_uri={encodeURIComponent(window.location.origin)}&scope=openid%20profile%20email&audience={encodeURIComponent(ENV.API_BASE_URL + '/')}
        </small>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Manual Tests</h3>
        <a 
          href={`https://${ENV.AUTH0_DOMAIN}`} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ marginRight: '10px', color: 'blue' }}
        >
          🌐 Test Auth0 Domain Connectivity
        </a>
        <a 
          href={`https://${ENV.AUTH0_DOMAIN}/authorize?response_type=code&client_id=${ENV.AUTH0_CLIENT_ID}&redirect_uri=${encodeURIComponent(window.location.origin)}&scope=openid%20profile%20email&audience=${encodeURIComponent(ENV.API_BASE_URL + '/')}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ marginRight: '10px', color: 'blue' }}
        >
          🔐 Test Direct Auth0 Login
        </a>
        <a 
          href={`https://${ENV.AUTH0_DOMAIN}`} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ color: 'blue' }}
        >
          🌍 Open Auth0 Domain
        </a>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <strong>Status:</strong><br/>
        <strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}<br/>
        <strong>Is Loading:</strong> {isLoading ? 'Yes' : 'No'}<br/>
        {error && <><strong>Error:</strong> {error.message}<br/></>}
      </div>

      {user && (
        <div style={{ marginBottom: '20px' }}>
          <strong>User Information:</strong><br/>
          <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', fontSize: '12px' }}>
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        {!isAuthenticated ? (
          <button onClick={handleLogin} style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Login with Auth0
          </button>
        ) : (
          <button onClick={handleLogout} style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Logout
          </button>
        )}
      </div>

      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px' }}>
        <strong>Troubleshooting Steps:</strong>
        <ol>
          <li>Verify Auth0 domain is accessible</li>
          <li>Check if user exists in Auth0 dashboard</li>
          <li>Verify application is enabled</li>
          <li>Check connection settings</li>
          <li>Review Auth0 logs for errors</li>
        </ol>
        
        {domainStatus === 'cors-blocked' && (
          <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px' }}>
            <strong>ℹ️ Nota sobre CORS:</strong><br/>
            El error "Failed to fetch" es normal debido a las políticas CORS del navegador. 
            Esto NO afecta la funcionalidad de Auth0. El login debería funcionar correctamente 
            al hacer clic en el botón "Login with Auth0".
          </div>
        )}
      </div>
    </div>
  );
};
