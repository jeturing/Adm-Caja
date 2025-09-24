import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { authFlowService } from '../services/authFlowService';

// Interfaz para el objeto de usuario
interface User {
  sub: string;
  email: string;
  name: string;
  email_verified?: boolean;
}

// Interfaz para el valor del contexto de autenticación
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  token: string | null;
}

// Crear el contexto de autenticación
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Props para el AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

// Componente proveedor de autenticación
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  // Integrar Auth0
  const { 
    isAuthenticated: auth0IsAuthenticated, 
    user: auth0User, 
    isLoading: auth0IsLoading,
    logout: auth0Logout
  } = useAuth0();

  // Función para verificar la autenticación al cargar la app
  const checkAuth = async () => {
    setLoading(true);
    try {
      // Si Auth0 está autenticado, usar esos datos
      if (auth0IsAuthenticated && auth0User) {
        console.log('✅ Usuario autenticado con Auth0:', auth0User);
        
        const internalUser: User = {
          sub: auth0User.sub || '',
          email: auth0User.email || '',
          name: auth0User.name || auth0User.email || '',
          email_verified: auth0User.email_verified
        };
        
        setUser(internalUser);
        setToken('auth0_authenticated');
        console.log('🔑 Usuario Auth0 configurado');
        
        // Inicializar flujo de API
        await authFlowService.initializeAfterAuth0Login(auth0User);
        return;
      }

      // Si no hay Auth0, usar token básico
      setUser(null);
      await authFlowService.initialize();
      setToken('basic_access');
      
    } catch (error) {
      console.log('ℹ️ Usuario no autenticado, continuando sin sesión');
      setUser(null);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Inicializar AuthFlowService
    authFlowService.initialize();
    
    // Monitorear cambios en Auth0
    if (!auth0IsLoading) {
      setLoading(false);

      // Si el usuario está autenticado con Auth0, inicializar flujo completo
      if (auth0IsAuthenticated && auth0User) {
        console.log('✅ Usuario autenticado con Auth0, iniciando flujo de API...');
        
        // Inicializar flujo de autenticación con la API
        authFlowService.initializeAfterAuth0Login(auth0User).then(() => {
          const internalUser: User = {
            sub: auth0User.sub || '',
            email: auth0User.email || '',
            name: auth0User.name || auth0User.email || '',
            email_verified: auth0User.email_verified
          };
          setUser(internalUser);
          setToken('auth0_authenticated');
          
          // Exponer usuario para authService.getUserInfo()
          (window as any).auth0User = auth0User;
        }).catch(error => {
          console.error('❌ Error inicializando flujo de API:', error);
          setError('Error conectando con la API del servidor');
        });
      }
    }
  }, [auth0IsAuthenticated, auth0User, auth0IsLoading]);

  // Función de login mejorada (ahora principalmente redirige a Auth0)
  const login = async (_email: string, _password: string) => {
    // Esta función ya no se usa directamente, pero la mantenemos para compatibilidad
    // El login real se hace a través de Auth0
    console.warn('⚠️ Login tradicional deshabilitado. Usa Auth0 en su lugar.');
    setError('Por favor usa el botón "Iniciar Sesión Segura" para acceder con Auth0');
    throw new Error('Login tradicional deshabilitado. Usa Auth0.');
  };

  // Función de logout actualizada
  const logout = () => {
    // Limpiar estado local
    authFlowService.logout();
    localStorage.removeItem('authToken');
    setUser(null);
    setError(null);
    setToken(null);
    
    // Si está autenticado con Auth0, hacer logout de Auth0
    if (auth0IsAuthenticated) {
      console.log('👋 Cerrando sesión de Auth0...');
      auth0Logout({ 
        logoutParams: { 
          returnTo: window.location.origin + '/signin' 
        } 
      });
    } else {
      console.log('👋 Sesión cerrada');
      // Redirigir a signin si no hay Auth0
      setTimeout(() => {
        window.location.href = '/signin';
      }, 100);
    }
  };

  // Función para limpiar errores
  const clearError = () => {
    setError(null);
  };

  const value = {
    isAuthenticated: auth0IsAuthenticated || (!!user && !!token),
    user: auth0IsAuthenticated && auth0User ? {
      sub: auth0User.sub || '',
      email: auth0User.email || '',
      name: auth0User.name || auth0User.email || '',
      email_verified: auth0User.email_verified
    } : user,
    loading: loading || auth0IsLoading,
    error,
    login,
    logout,
    checkAuth,
    clearError,
    token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar el contexto de autenticación
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
