// Simple script to request a Management API token (client_credentials) and print the 'aud' claim
const fetch = require('node-fetch');
const fs = require('fs');
require('dotenv').config({ path: './.env' });

async function main() {
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_MGMT_CLIENT_ID;
  const clientSecret = process.env.AUTH0_MGMT_CLIENT_SECRET;
  // Permitir forzar via CLI: node scripts/check_audience.js --api | --mgmt | --aud <value>
  const args = process.argv.slice(2);
  let audienceFromArgs = null;
  if (args.includes('--aud')) {
    const i = args.indexOf('--aud');
    audienceFromArgs = args[i + 1];
  } else if (args.includes('--api')) {
    audienceFromArgs = process.env.AUTH0_API_AUDIENCE;
  } else if (args.includes('--mgmt')) {
    audienceFromArgs = process.env.AUTH0_MGMT_AUDIENCE || `https://${domain}/api/v2/`;
  }

  // Por defecto prioriza Management API audience para evitar errores cuando la API custom no esté autorizada
  const audience = audienceFromArgs || process.env.AUTH0_MGMT_AUDIENCE || process.env.AUTH0_API_AUDIENCE;

  if (!domain || !clientId || !clientSecret) {
    console.error('Missing AUTH0_DOMAIN or AUTH0_MGMT_CLIENT_ID/SECRET in .env');
    process.exit(1);
  }

  const url = `https://${domain}/oauth/token`;
  const body = {
    client_id: clientId,
    client_secret: clientSecret,
    audience: audience,
    grant_type: 'client_credentials'
  };

  try {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) {
      console.error('Error fetching token:', data);
      console.error('Used audience:', audience);
      process.exit(1);
    }
    console.log('Access token retrieved (truncated):', data.access_token ? data.access_token.slice(0,40)+'...' : 'none');

    // Decode JWT (no verification) to inspect aud claim
    const parts = data.access_token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    console.log('aud claim:', payload.aud || payload.audience || '(none)');
    console.log('full payload keys:', Object.keys(payload));
  } catch (e) {
    console.error('Request failed', e);
    process.exit(1);
  }
}

main();
