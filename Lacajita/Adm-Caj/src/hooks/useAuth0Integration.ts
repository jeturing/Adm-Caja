import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';

export const useAuth0Integration = () => {
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    getAccessTokenSilently, 
    loginWithRedirect, 
    logout 
  } = useAuth0();

  const [token, setToken] = useState<string | null>(null);
  const [apiUser, setApiUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      if (isAuthenticated && user) {
        try {
          // Obtener el token de Auth0
          const accessToken = await getAccessTokenSilently();
          setToken(accessToken);

          // Configurar el token en nuestro apiService
          apiService.setToken(accessToken);

          // Obtener los datos del usuario desde nuestra API
          try {
            const userData = await apiService.getMe();
            setApiUser(userData);
            
            // Guardar en localStorage para persistencia
            localStorage.setItem('authToken', accessToken);
            
            console.log('✅ Auth0 Integration: Usuario autenticado correctamente');
          } catch (apiError) {
            console.warn('⚠️ Error obteniendo datos del usuario desde API:', apiError);
            // Aún podemos usar Auth0 aunque nuestra API tenga problemas
          }
        } catch (tokenError) {
          console.error('❌ Error obteniendo token de Auth0:', tokenError);
          setError('Error obteniendo token de acceso');
        }
      } else if (!isAuthenticated && !isLoading) {
        // Usuario no autenticado, limpiar datos
        setToken(null);
        setApiUser(null);
        setError(null);
        apiService.clearToken();
        localStorage.removeItem('authToken');
      }
    };

    handleAuth();
  }, [isAuthenticated, user, getAccessTokenSilently, isLoading]);

  const handleLogin = () => {
    loginWithRedirect();
  };

  const handleLogout = () => {
    logout({ 
      logoutParams: { 
        returnTo: window.location.origin 
      } 
    });
  };

  const testApiCall = async () => {
    if (!token) {
      throw new Error('No hay token disponible');
    }

    try {
      const response = await fetch('/api/user/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error en llamada a API:', error);
      throw error;
    }
  };

  return {
    // Estados de Auth0
    isAuthenticated,
    isLoading,
    user,
    error,
    
    // Estados integrados
    token,
    apiUser,
    
    // Funciones
    handleLogin,
    handleLogout,
    testApiCall,
    
    // Datos útiles
    userEmail: user?.email || null,
    userName: user?.name || null,
    userId: user?.sub || null,
  };
};
