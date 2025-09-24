import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth0();
  const navigate = useNavigate();

  console.log('🏠 Home component - Auth status:', { isAuthenticated, isLoading });

  useEffect(() => {
    console.log('🏠 Home useEffect triggered:', { isAuthenticated, isLoading });
    if (!isLoading) {
      if (isAuthenticated) {
        // Usuario autenticado, redirigir al dashboard
        console.log('✅ Usuario autenticado en Home, redirigiendo al dashboard');
        navigate('/dashboard', { replace: true });
      } else {
        // Usuario no autenticado, redirigir a signin
        console.log('🔄 Usuario no autenticado en Home, redirigiendo a signin');
        navigate('/signin', { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando estado de autenticación...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  // Este componente no renderiza nada visible porque el dashboard se renderiza a través de las rutas protegidas
  return null;
};

export default Home;
