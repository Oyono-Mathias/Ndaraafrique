import { createHash, createHmac, randomBytes } from 'crypto';

/**
 * @fileOverview Client MeSomb avec implémentation manuelle de MeSomb Signature V4 (HMAC-SHA1).
 * Conforme aux Task 1, 2, 3 et 4 de la documentation officielle Ndara Afrique.
 */

export async function fetchMeSombSigned(endpoint: string, options: RequestInit = {}) {
  const accessKey = process.env.MESOMB_ACCESS_KEY?.trim();
  const secretKey = process.env.MESOMB_SECRET_KEY?.trim();
  const appKey = process.env.MESOMB_APPLICATION_KEY?.trim();

  if (!accessKey || !secretKey || !appKey) {
    throw new Error("Configuration MeSomb incomplète (ACCESS_KEY, SECRET_KEY ou APPLICATION_KEY manquante).");
  }

  const method = (options.method || 'GET').toUpperCase();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const baseUrl = 'https://mesomb.hachther.com/api/v1.1';
  const fullUrl = new URL(`${baseUrl}${cleanEndpoint}`);
  
  const host = fullUrl.host; // mesomb.hachther.com
  const path = fullUrl.pathname;
  
  // 1. Préparation du corps compact (Task 1: HashedPayload)
  const body = options.body ? String(options.body) : '{}';
  const hashedPayload = createHash('sha1').update(body).digest('hex');

  // 2. Gestion du Temps et du Nonce
  const now = new Date();
  const timestamp = Math.floor(now.getTime() / 1000).toString();
  const dateFormatted = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const nonce = randomBytes(8).toString('hex');
  const service = 'payment';

  // 3. TASK 1: Canonical Request
  // Headers à inclure dans la signature (Ordre alphabétique obligatoire)
  const headersToSign: Record<string, string> = {
    'content-type': 'application/json',
    'host': host,
    'x-mesomb-application': appKey,
    'x-mesomb-date': timestamp,
    'x-mesomb-nonce': nonce,
  };

  const signedHeadersList = Object.keys(headersToSign).sort().join(';');
  const canonicalHeaders = Object.keys(headersToSign)
    .sort()
    .map(h => `${h}:${headersToSign[h].trim()}\n`)
    .join('');

  // Query String (Vide pour collect/status)
  const canonicalQueryString = ''; 

  const canonicalRequest = [
    method,
    path,
    canonicalQueryString,
    canonicalHeaders,
    signedHeadersList,
    hashedPayload
  ].join('\n');

  const hashedCanonicalRequest = createHash('sha1').update(canonicalRequest).digest('hex');

  // 4. TASK 2: String to Sign
  const credentialScope = `${dateFormatted}/${service}/mesomb_request`;
  const stringToSign = [
    'HMAC-SHA1',
    timestamp,
    credentialScope,
    hashedCanonicalRequest
  ].join('\n');

  // 5. TASK 3: Calculate Signature
  const signature = createHmac('sha1', secretKey)
    .update(stringToSign)
    .digest('hex');

  // 6. TASK 4: Final Headers
  const authorizationHeader = `HMAC-SHA1 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeadersList}, Signature=${signature}`;

  const fetchHeaders: Record<string, string> = {
    'Authorization': authorizationHeader,
    'X-MeSomb-Application': appKey,
    'X-MeSomb-Date': timestamp,
    'X-MeSomb-Nonce': nonce,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

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
    console.error("[MeSomb Bad Signature Debug]", {
        status: response.status,
        message: data.message,
        canonicalRequest,
        stringToSign,
        auth: authorizationHeader
    });
    throw new Error(data.detail || data.message || `Erreur MeSomb: ${response.status}`);
  }

  return data;
}
