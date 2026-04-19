import { createHash, createHmac, randomBytes } from 'crypto';

/**
 * @fileOverview Client MeSomb avec implémentation manuelle de MeSomb Signature V4 (SHA1).
 * Conforme aux Task 1, 2, 3 et 4 de la documentation officielle.
 */

export async function fetchMeSombSigned(endpoint: string, options: RequestInit = {}) {
  const accessKey = process.env.MESOMB_ACCESS_KEY?.trim();
  const secretKey = process.env.MESOMB_SECRET_KEY?.trim();
  const appKey = process.env.MESOMB_APPLICATION_KEY?.trim();

  if (!accessKey || !secretKey || !appKey) {
    throw new Error("Configuration MeSomb incomplète (ACCESS_KEY, SECRET_KEY ou APPLICATION_KEY manquante).");
  }

  const method = (options.method || 'GET').toUpperCase();
  // On s'assure que l'URL se termine par un slash si nécessaire pour le backend MeSomb
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const baseUrl = 'https://mesomb.hachther.com/api/v1.1';
  const fullUrl = new URL(`${baseUrl}${cleanEndpoint}`);
  
  const host = fullUrl.host;
  const path = fullUrl.pathname;
  
  // Préparation du Query String Canonique (Task 1)
  const queryParams = Array.from(fullUrl.searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const now = new Date();
  const timestamp = Math.floor(now.getTime() / 1000).toString();
  const dateFormatted = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const nonce = randomBytes(8).toString('hex');
  const service = 'payment';

  const body = options.body ? String(options.body) : '{}';
  const hashedPayload = createHash('sha1').update(body).digest('hex');

  // Headers Canoniques (Task 1)
  // Note: Les noms doivent être en minuscule et triés
  const headersToSign: Record<string, string> = {
    'host': host,
    'x-mesomb-date': timestamp,
    'x-mesomb-nonce': nonce,
  };
  
  if (options.body) {
    headersToSign['content-type'] = 'application/json';
  }

  const signedHeadersList = Object.keys(headersToSign).sort().join(';');
  const canonicalHeaders = Object.keys(headersToSign)
    .sort()
    .map(h => `${h}:${headersToSign[h].trim()}\n`)
    .join('');

  // TASK 1: Canonical Request
  const canonicalRequest = [
    method,
    path,
    queryParams,
    canonicalHeaders,
    signedHeadersList,
    hashedPayload
  ].join('\n');

  const hashedCanonicalRequest = createHash('sha1').update(canonicalRequest).digest('hex');

  // TASK 2: String to Sign
  const credentialScope = `${dateFormatted}/${service}/mesomb_request`;
  const stringToSign = [
    'HMAC-SHA1',
    timestamp,
    credentialScope,
    hashedCanonicalRequest
  ].join('\n');

  // TASK 3: Calculate Signature
  const signature = createHmac('sha1', secretKey)
    .update(stringToSign)
    .digest('hex');

  // TASK 4: Authorization Header
  const authorizationHeader = `HMAC-SHA1 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeadersList}, Signature=${signature}`;

  const fetchHeaders: Record<string, string> = {
    'Authorization': authorizationHeader,
    'X-MeSomb-Application': appKey,
    'X-MeSomb-Date': timestamp,
    'X-MeSomb-Nonce': nonce,
    'Accept': 'application/json',
  };

  if (options.body) {
    fetchHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(fullUrl.toString(), {
    ...options,
    headers: {
      ...options.headers,
      ...fetchHeaders
    },
    cache: 'no-store'
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error("[MeSomb API Error]", {
        status: response.status,
        data,
        auth: authorizationHeader
    });
    throw new Error(data.detail || data.message || `Erreur API MeSomb (${response.status})`);
  }

  return data;
}
