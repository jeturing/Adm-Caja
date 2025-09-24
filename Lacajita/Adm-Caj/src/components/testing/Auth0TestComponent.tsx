import React, { useState } from 'react';
import { auth0ManagementService } from '../../services/auth0ManagementService';
import { useAuth0 } from '@auth0/auth0-react';

const Auth0TestComponent: React.FC = () => {
  const { user } = useAuth0();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testAuth0Connection = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      console.log('🧪 Testing Auth0 Management API...');
      
      // Test basic connection
      const users = await auth0ManagementService.getUsers(0, 5);
      console.log('✅ Users fetched:', users);

      const roles = await auth0ManagementService.getRoles();
      console.log('✅ Roles fetched:', roles);

      setResult({
        users: users.length,
        roles: roles.length,
        sampleUser: users[0] || null,
        sampleRole: roles[0] || null
      });

    } catch (err) {
      console.error('❌ Auth0 Management API test failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        🧪 Auth0 Management API Test
      </h3>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Usuario actual: {user?.email || 'No autenticado'}
        </p>
      </div>

      <button
        onClick={testAuth0Connection}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 mb-4"
      >
        {loading ? '🔄 Probando...' : '🚀 Probar Conexión'}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
          <h4 className="text-red-800 font-medium">Error</h4>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded p-4">
          <h4 className="text-green-800 font-medium mb-2">✅ Conexión exitosa</h4>
          <div className="text-sm text-green-700 space-y-1">
            <p>Usuarios encontrados: {result.users}</p>
            <p>Roles encontrados: {result.roles}</p>
            {result.sampleUser && (
              <div className="mt-2">
                <p className="font-medium">Usuario de ejemplo:</p>
                <pre className="text-xs bg-white p-2 rounded mt-1 overflow-x-auto">
                  {JSON.stringify(result.sampleUser, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Auth0TestComponent;
