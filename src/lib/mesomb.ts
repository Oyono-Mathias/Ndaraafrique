import crypto from 'crypto';

/**
 * @fileOverview Client API MeSomb avec Signature HMAC SHA1.
 * 🛡️ SÉCURITÉ : Authentification de niveau bancaire conforme au format requis.
 */

export async function fetchMeSomb(endpoint: string, options: RequestInit = {}) {
  const accessKey = process.env.MESOMB_ACCESS_KEY?.trim();
  const secretKey = process.env.MESOMB_SECRET_KEY?.trim();
  const appKey = process.env.MESOMB_APPLICATION_KEY?.trim();

  if (!accessKey || !secretKey || !appKey) {
    console.error("[MeSomb] Erreur : Clés de signature manquantes dans l'environnement.");
    throw new Error("Configuration MeSomb incomplète. Vérifiez les variables ACCESS/SECRET/APP.");
  }

  const method = (options.method || 'GET').toUpperCase();
  // On s'assure que l'endpoint n'a pas de slash inutile au début ou à la fin pour la signature
  const cleanEndpoint = endpoint.replace(/^\/+|\/+$/g, "");
  const url = `https://mesomb.hachther.com/api/v1.1/${cleanEndpoint}/`;
  
  // Construction du message de signature
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const body = options.body ? String(options.body) : '';
  
  // Le chemin canonique DOIT correspondre exactement à l'URL appelée
  const canonicalUri = `/api/v1.1/${cleanEndpoint}/`;
  
  // Format requis par MeSomb : Method\nCanonicalURI\nTimestamp\nNonce\nBody
  const message = `${method}\n${canonicalUri}\n${timestamp}\n${nonce}\n${body}`;
  
  const signature = crypto
    .createHmac('sha1', secretKey)
    .update(message)
    .digest('hex');

  // Construction du header Authorization : STRICTEMENT "MeSomb <access>:<sig>:<nonce>:<ts>"
  const authHeader = `MeSomb ${accessKey}:${signature}:${nonce}:${timestamp}`;

  const headers = {
    ...(options.headers || {}),
    'Authorization': authHeader,
    'X-MeSomb-Application': appKey,
    'X-MeSomb-Date': timestamp,
    'X-MeSomb-Nonce': nonce,
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
      console.error("[MeSomb API Error]", {
        status: response.status,
        data,
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
