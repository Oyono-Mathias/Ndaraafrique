import crypto from 'crypto';

/**
 * @fileOverview Client API MeSomb avec Signature HMAC SHA1.
 * 🛡️ SÉCURITÉ : Authentification de niveau bancaire.
 */

export async function fetchMeSomb(endpoint: string, options: RequestInit = {}) {
  const accessKey = process.env.MESOMB_ACCESS_KEY;
  const secretKey = process.env.MESOMB_SECRET_KEY;
  const appKey = process.env.MESOMB_APPLICATION_KEY;

  if (!accessKey || !secretKey || !appKey) {
    console.error("[MeSomb] Erreur : Variables de signature manquantes (ACCESS/SECRET/APP).");
    throw new Error("Configuration MeSomb incomplète.");
  }

  const method = (options.method || 'GET').toUpperCase();
  const cleanEndpoint = endpoint.replace(/^\/+/, "");
  const url = `https://mesomb.hachther.com/api/v1.1/${cleanEndpoint}`;
  
  // Construction du message de signature
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const body = options.body ? String(options.body) : '';
  
  // Format requis par MeSomb : Method\nCanonicalURI\nTimestamp\nNonce\nBody
  // CanonicalURI doit inclure le chemin complet après le domaine
  const canonicalUri = `/api/v1.1/${cleanEndpoint}`;
  const message = `${method}\n${canonicalUri}\n${timestamp}\n${nonce}\n${body}`;
  
  const signature = crypto
    .createHmac('sha1', secretKey)
    .update(message)
    .digest('hex');

  const headers = {
    ...(options.headers || {}),
    'Authorization': `MeSomb ${accessKey}:${signature}:${nonce}:${timestamp}`,
    'X-MeSomb-Application': appKey,
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(url, { 
      ...options, 
      headers,
      cache: 'no-store'
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[MeSomb API Error]", data);
      throw new Error(data?.detail || data?.message || `Erreur MeSomb (${response.status})`);
    }

    return data;
  } catch (error: any) {
    console.error("[MeSomb Fatal]", error.message);
    throw error;
  }
}
