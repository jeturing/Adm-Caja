import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export const Auth0LoginButton: React.FC = () => {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Cargando...</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // El usuario ya está autenticado
  }

  return (
    <button
      onClick={() => loginWithRedirect()}
      className="w-full px-4 py-2 rounded-md text-white font-medium bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
    >
      Iniciar Sesión con Auth0
    </button>
  );
};

export const Auth0LogoutButton: React.FC = () => {
  const { logout, isAuthenticated } = useAuth0();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <button
      onClick={() => logout({ 
        logoutParams: { 
          returnTo: window.location.origin 
        } 
      })}
      className="px-4 py-2 rounded-md text-white font-medium bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
    >
      Cerrar Sesión
    </button>
  );
};

export const Auth0UserProfile: React.FC = () => {
  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [accessToken, setAccessToken] = React.useState<string>('');

  React.useEffect(() => {
    const getToken = async () => {
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently();
          setAccessToken(token);
        } catch (error) {
          console.error('Error getting access token:', error);
        }
      }
    };

    getToken();
  }, [isAuthenticated, getAccessTokenSilently]);

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4">Perfil de Usuario</h3>
      <div className="space-y-2">
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Nombre:</strong> {user.name}</p>
        <p><strong>ID:</strong> {user.sub}</p>
        {user.picture && (
          <div>
            <strong>Avatar:</strong>
            <img src={user.picture} alt="Avatar" className="w-12 h-12 rounded-full mt-2" />
          </div>
        )}
        {accessToken && (
          <div>
            <strong>Access Token:</strong>
            <textarea 
              value={accessToken} 
              readOnly 
              className="w-full h-20 text-xs bg-gray-100 p-2 rounded mt-2"
            />
          </div>
        )}
      </div>
    </div>
  );
};
