import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth0();

  console.log('🔒 ProtectedRoute check:', { isAuthenticated, isLoading, user: user?.email });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('❌ Usuario no autenticado, redirigiendo a signin');
    return <Navigate to="/signin" replace />;
  }

  console.log('✅ Usuario autenticado, mostrando contenido protegido anidado');
  return <Outlet />;
};

export default ProtectedRoute;
