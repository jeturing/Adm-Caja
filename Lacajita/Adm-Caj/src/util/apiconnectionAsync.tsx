import SecureStorage from "react-secure-storage";

const apiUrl = (method: string): string => {
  const env: any = (import.meta as any).env || {};
  const base: string = env.DEV ? '/api' : (env.VITE_API_BASE_URL || '/api');
  const clean = (method || '').toString().replace(/^\/+/, '');
  return `${base}/${clean}`;
};

// La función getToken queda obsoleta y se elimina.
// La lógica de Auth0 debe gestionar el token.

// Llama a la API usando el token si existe
export const AsyncMethod = async (
  apimethod: string,
  confmethod: string,
  callback: (json: any) => void,
  callfinally: () => void,
  params: Record<string, any> = {}
): Promise<void> => {
  // El token se obtiene de localStorage, donde el SDK de Auth0 debería guardarlo.
  const existingToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (existingToken) {
    headers["authorization"] = `Bearer ${existingToken}`;
  } else {
    // Si no hay token, se podría redirigir al login o manejar el error.
    // Por ahora, la llamada se hará sin autorización y fallará si el endpoint está protegido.
    console.warn(`AsyncMethod: No se encontró 'authToken' en localStorage para la llamada a '${apimethod}'. La petición podría fallar.`);
  }

  const config: RequestInit = {
    method: confmethod,
    headers,
  };

  if (Object.keys(params).length > 0) config.body = JSON.stringify(params);

  try {
    // En modo desarrollo, loguear la URL completa para depuración de 404/422
    if ((import.meta as any).env && (import.meta as any).env.DEV) {
      try { console.log("AsyncMethod: calling URL", apiUrl(apimethod), confmethod, params); } catch (e) { }
    }
    const res = await fetch(apiUrl(apimethod), config);
    if (!res.ok) {
      let bodyText: string | null = null;
      try {
        bodyText = await res.text();
      } catch (e) {
        // noop
      }
      // Intentar extraer un mensaje legible del cuerpo (JSON.detail, error, msg)
      let userMessage = bodyText || `${res.status} ${res.statusText}`;
      try {
        const parsed = bodyText ? JSON.parse(bodyText) : null;
        if (parsed) {
          if (typeof parsed === 'object') {
            userMessage = parsed.detail || parsed.error || parsed.msg || JSON.stringify(parsed);
          } else {
            userMessage = String(parsed);
          }
        }
      } catch (e) {
        // si no es JSON, usamos bodyText tal cual
      }
      console.warn("AsyncMethod: request failed", res.status, res.statusText, bodyText);
      // Mostrar mensaje al usuario en UI (fallback simple). Evitamos romper SSR/Node.
      // Usar toast visual en vez de alert
      try {
        if (typeof window !== 'undefined' && window.showToast) {
          window.showToast(`Error: ${res.status} ${res.statusText}\n${userMessage}`);
        }
      } catch (e) {
        // noop
      }
      // Si el error es 401, el AuthProvider debería encargarse de redirigir al login.
      if (res.status === 401) {
        // Opcional: disparar un evento personalizado para forzar el refresco del token o el login.
        // window.dispatchEvent(new Event('auth-token-expired'));
      }
      try {
        callfinally();
      } catch (e) {
        // noop
      }
      return;
    }

    const json = await res.json().catch((e) => {
      console.error("AsyncMethod: invalid JSON response", e);
      return null;
    });

    // La lógica de reintento con getToken se elimina.
    // Si la respuesta es un error de token, el AuthProvider debe manejarlo.
    if (json) {
      try {
        callback(json);
      } catch (e) {
        console.error("AsyncMethod: callback error", e);
      }
    }
  } catch (err) {
    console.error("AsyncMethod fetch error:", err);
  } finally {
    try {
      callfinally();
    } catch (e) {
      // noop
    }
  }
};

// No default export; use named export { AsyncMethod }
