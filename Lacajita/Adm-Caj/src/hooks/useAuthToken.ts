import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';
import { ENV } from '../config/env';

const useAuthToken = () => {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    const storeToken = async () => {
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently({
            authorizationParams: {
              audience: ENV.AUTH0_AUDIENCE,
            },
          });
          localStorage.setItem('authToken', token);
          console.log('Token de Auth0 almacenado en localStorage.');
        } catch (error) {
          console.error('Error al obtener el token de Auth0:', error);
        }
      }
    };

    storeToken();
  }, [isAuthenticated, getAccessTokenSilently]);
};

export default useAuthToken;
