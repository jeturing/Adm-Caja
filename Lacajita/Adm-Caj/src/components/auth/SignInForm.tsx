import { useEffect, useState } from "react";
import { ChevronLeftIcon } from "../../icons";
import { useAuth0 } from "@auth0/auth0-react";

export default function SignInForm() {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();

  // Redirigir al dashboard si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      window.location.href = "/lchome";
    }
  }, [isAuthenticated]);

  // Local form state for email/password login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAuth0Login = async () => {
    try {
      await loginWithRedirect({
        appState: { returnTo: "/lchome" },
      });
    } catch (err) {
      console.error("Error durante el login con Auth0:", err);
    }
  };

  const handleLocalLogin = async (ev?: React.FormEvent) => {
    if (ev) ev.preventDefault();
    setErrorMsg(null);
    setLoadingLocal(true);
    // Preferir Universal Login: redirigir a Auth0 con login_hint para que el usuario
    // ingrese su contraseña de forma segura en la página de Auth0.
    // Evita usar Resource Owner Password Grant desde el navegador.
    try {
      if (!email || email.trim() === '') {
        setErrorMsg('Por favor ingresa tu email para continuar con Auth0');
        setLoadingLocal(false);
        return;
      }

      await loginWithRedirect({
        authorizationParams: {
          login_hint: email.trim()
        },
        appState: { returnTo: '/lchome' }
      });
    } catch (e) {
      console.error('Error al redirigir a Auth0:', e);
      setErrorMsg('No se pudo iniciar el flujo de autenticación. Intenta nuevamente.');
    } finally {
      setLoadingLocal(false);
    }
  };

  const handleBackClick = () => {
    // Por ahora volver a la misma página de signin o podríamos crear una landing page
    window.history.back();
  };

  const handleForgotPasswordClick = () => {
    const resetUrl = `https://segrd.us.auth0.com/u/reset-password`;
    window.open(resetUrl, "_blank");
  };

  const handleSignUpClick = () => {
    loginWithRedirect({
      authorizationParams: {
        screen_hint: "signup",
      },
      appState: { returnTo: "/lchome" },
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1">
        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando autenticación...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto">
        <button
          onClick={handleBackClick}
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Volver al inicio
        </button>
      </div>

      <div className="flex flex-1 w-full max-w-md mx-auto">
        {/* Formulario de Login centrado */}
        <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-8 h-full flex flex-col justify-center">
            <div className="max-w-md mx-auto w-full">
              <div className="mb-8 text-center">
                <div className="mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto flex items-center justify-center">
                    <svg
                      className="w-10 h-10 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Iniciar Sesión
                </h2>
                <p className="text-gray-600">Accede con tu cuenta de Auth0</p>
              </div>

              {/* Formulario local (email/password) */}
              <form onSubmit={handleLocalLogin} className="space-y-6">
                {errorMsg && (
                  <div className="text-red-600 text-sm text-center">{errorMsg}</div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loadingLocal}
                    className="flex-1 inline-flex items-center justify-center gap-3 py-3 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-4 disabled:opacity-60"
                  >
                    {loadingLocal ? 'Conectando...' : 'Ingresar'}
                  </button>

                  {/* Mantener opción de Auth0 redirect */}
                  <button
                    type="button"
                    onClick={handleAuth0Login}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 py-3 px-4 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
                  >
                    Continuar con Auth0
                  </button>
                </div>

                {/* Enlaces adicionales (signup/forgot) */}
                <div className="space-y-4 text-center">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 text-gray-500 bg-white">Opciones adicionales</span>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-3">
                    <button
                      type="button"
                      onClick={handleSignUpClick}
                      className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
                    >
                      ¿No tienes cuenta? Regístrate
                    </button>

                    <button
                      type="button"
                      onClick={handleForgotPasswordClick}
                      className="text-gray-600 hover:text-gray-700 hover:underline transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
