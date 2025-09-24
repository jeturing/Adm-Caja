import { Auth0Provider } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { ENV } from '../config/env';
import React from 'react';

interface Auth0ProviderWithNavigateProps {
    children: React.ReactNode;
}

export const Auth0ProviderWithNavigate: React.FC<Auth0ProviderWithNavigateProps> = ({ children }) => {
  const navigate = useNavigate();

  const domain = ENV.AUTH0_DOMAIN;
  const clientId = ENV.AUTH0_CLIENT_ID;
  const audience = ENV.AUTH0_AUDIENCE;

  // Determine redirectUri at runtime.
  // Prefer the current browser origin (window.location.origin) to avoid localhost vs 127.0.0.1 mismatches
  // unless the environment explicitly provides an exact, matching value.
  let redirectUri = '';
  try {
    const runtimeOrigin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    const envRedirect = ENV.AUTH0_REDIRECT_URI || '';

    // If envRedirect is set and its origin matches the runtime origin, use it (with /callback).
    // Otherwise prefer runtimeOrigin so callbacks land in the same host the browser used (important when using SSH tunnels).
    const pickOrigin = (() => {
      try {
        if (!envRedirect) return runtimeOrigin;
        const envUrl = new URL(envRedirect);
        if (runtimeOrigin && envUrl.origin === runtimeOrigin) return envRedirect;
        // envRedirect and runtimeOrigin differ -> prefer runtimeOrigin
        return runtimeOrigin || envRedirect;
      } catch (err) {
        return runtimeOrigin || envRedirect;
      }
    })();

    if (pickOrigin) {
      redirectUri = pickOrigin.replace(/\/$/, '') + '/callback';
    } else {
      redirectUri = 'http://127.0.0.1:5174/callback';
    }
  } catch (e) {
    redirectUri = (ENV.AUTH0_REDIRECT_URI || 'http://127.0.0.1:5174').replace(/\/$/, '') + '/callback';
  }

  const onRedirectCallback = (appState: any) => {
    console.log('🔄 Auth0 Redirect Callback with Navigate:', appState);
    const targetUrl = appState?.returnTo || '/dashboard';
    console.log('🎯 Navegando a:', targetUrl);
    navigate(targetUrl, { replace: true });
  };

  if (!(domain && clientId && redirectUri)) {
    return null;
  }

  // Debugging: log the values used by the provider at runtime so we can trace
  // where an unexpected client_id may come from (e.g. cache or old build).
  // Remove this log after debugging.
  console.log('Auth0Provider config ->', { domain, clientId, audience, redirectUri });

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
        scope: 'openid profile email',
        ...(audience ? { audience } : {})
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation="localstorage"
      useRefreshTokens={true}
    >
      {children}
    </Auth0Provider>
  );
};
