import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, error } = useAuth0();

  useEffect(() => {
    // Una vez que Auth0 procesa el callback, redirigimos a la app principal
    if (!isLoading) {
      if (isAuthenticated) {
        navigate('/dashboard', { replace: true });
      } else {
        console.warn('AuthCallback: no autenticado, redirigiendo a /signin');
        navigate('/signin', { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, navigate]);

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold">Procesando login...</h2>
      {error && <pre className="text-sm text-red-600">{JSON.stringify(error)}</pre>}
      <p>Espere mientras finalizamos la autenticación.</p>
    </div>
  );
};

export default AuthCallback;
