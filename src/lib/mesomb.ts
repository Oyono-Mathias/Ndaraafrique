import crypto from 'crypto';

/**
 * @fileOverview Client API MeSomb avec Signature HMAC SHA1.
 * 🛡️ SÉCURITÉ : Authentification de niveau bancaire conforme au format requis.
 * Résout l'erreur "Your authorization header is in an invalid format".
 */

export async function fetchMeSomb(endpoint: string, options: RequestInit = {}) {
  // 1. Récupération et nettoyage des clés
  const accessKey = process.env.MESOMB_ACCESS_KEY?.trim();
  const secretKey = process.env.MESOMB_SECRET_KEY?.trim();
  const appKey = process.env.MESOMB_APPLICATION_KEY?.trim();

  if (!accessKey || !secretKey || !appKey) {
    console.error("[MeSomb] Erreur : Clés de signature manquantes (ACCESS/SECRET/APP).");
    throw new Error("Configuration MeSomb incomplète.");
  }

  // 2. Normalisation de l'URL et de la Méthode
  const method = (options.method || 'GET').toUpperCase();
  const cleanEndpoint = endpoint.replace(/^\/+|\/+$/g, "");
  const canonicalUri = `/api/v1.1/${cleanEndpoint}/`;
  const url = `https://mesomb.hachther.com${canonicalUri}`;
  
  // 3. Préparation des variables de signature
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const body = options.body ? String(options.body) : '';
  
  // 4. Construction du message (Format Strict MeSomb)
  // Format : Method\nCanonicalURI\nTimestamp\nNonce\nBody
  const message = `${method}\n${canonicalUri}\n${timestamp}\n${nonce}\n${body}`;
  
  // 5. Calcul de la signature HMAC SHA1
  const signature = crypto
    .createHmac('sha1', secretKey)
    .update(message)
    .digest('hex');

  // 6. Construction du header Authorization STRICT
  // Format requis : MeSomb <access_key>:<signature>:<nonce>:<timestamp>
  const credentials = `${accessKey}:${signature}:${nonce}:${timestamp}`;
  const authHeader = `MeSomb ${credentials}`;

  const headers = {
    ...(options.headers || {}),
    'Authorization': authHeader,
    'X-MeSomb-Application': appKey,
    'X-MeSomb-Date': timestamp,
    'X-MeSomb-Nonce': nonce,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  try {
    const response = await fetch(url, { 
      ...options, 
      headers,
      cache: 'no-store'
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[MeSomb API Error]", {
        status: response.status,
        message: data?.detail || data?.message || "Erreur inconnue",
        endpoint: cleanEndpoint
      });
      throw new Error(data?.detail || data?.message || `Erreur MeSomb (${response.status})`);
    }

    return data;
  } catch (error: any) {
    console.error("[MeSomb Fatal]", error.message);
    throw error;
  }
}
