import React from 'react';
import { Auth0Provider } from '@auth0/auth0-react';
import { ENV } from '../config/env';

const domain = ENV.AUTH0_DOMAIN;
const clientId = ENV.AUTH0_CLIENT_ID;

interface Auth0ProviderWrapperProps {
  children: React.ReactNode;
}

export const Auth0ProviderWrapper: React.FC<Auth0ProviderWrapperProps> = ({ children }) => {
  const redirectUri = ENV.AUTH0_REDIRECT_URI || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5174');

  // Debug logging
  React.useEffect(() => {
    console.log('🔧 Auth0 Configuration:');
    console.log('Domain:', domain);
    console.log('Client ID:', clientId);
    console.log('Redirect URI:', redirectUri);
    console.log('Audience: REMOVED (sin audience para evitar errores)');
  }, [redirectUri]);

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
        scope: 'openid profile email'
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
      onRedirectCallback={(appState) => {
        console.log('🔄 Auth0 Redirect Callback:', appState);
        const targetUrl = appState?.returnTo || '/dashboard';
        console.log('🎯 Redirigiendo a:', targetUrl);
        window.location.href = targetUrl;
      }}
    >
      {children}
    </Auth0Provider>
  );
};
