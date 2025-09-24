import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginTest() {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, error, clearError } = useAuth();

  const testLogin = async () => {
    setIsLoading(true);
    setTestResult('');
    clearError();

    try {
      setTestResult('🔄 Probando credenciales...');
      
      // Credenciales proporcionadas por el usuario
      const email = 'soc@jeturing.com';
      const password = '*963.Abcd.';
      
      await login(email, password);
      setTestResult('✅ Login exitoso! Redirigiendo...');
      
    } catch (err) {
      console.error('Error en test de login:', err);
      setTestResult(`❌ Error en login: ${error || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-md mx-auto mt-10">
      <h2 className="text-xl font-bold mb-4">Prueba de Autenticación</h2>
      <p className="text-sm text-gray-600 mb-4">
        Probando credenciales: soc@jeturing.com
      </p>
      
      <button
        onClick={testLogin}
        disabled={isLoading}
        className={`w-full px-4 py-2 rounded-md text-white font-medium ${
          isLoading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isLoading ? 'Probando...' : 'Probar Login'}
      </button>
      
      {testResult && (
        <div className="mt-4 p-3 rounded-md bg-gray-50 text-sm">
          <pre className="whitespace-pre-wrap">{testResult}</pre>
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">
          Error: {error}
        </div>
      )}
    </div>
  );
}
