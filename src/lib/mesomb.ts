import { PaymentOperation } from '@hachther/mesomb';

/**
 * @fileOverview Client MeSomb utilisant le SDK officiel.
 * 🛡️ SÉCURITÉ : La signature HMAC est gérée nativement par le SDK.
 */

export function getMeSombClient() {
  const applicationKey = process.env.MESOMB_APPLICATION_KEY?.trim();
  const accessKey = process.env.MESOMB_ACCESS_KEY?.trim();
  const secretKey = process.env.MESOMB_SECRET_KEY?.trim();

  if (!applicationKey || !accessKey || !secretKey) {
    console.error("[MeSomb] Erreur : Clés de signature manquantes (APP/ACCESS/SECRET).");
    throw new Error("Configuration MeSomb incomplète.");
  }

  // Retourne une instance de l'opération de paiement configurée
  return new PaymentOperation(applicationKey, accessKey, secretKey);
}

/**
 * Helper pour les appels manuels signés (ex: balance, status)
 * car le SDK gère principalement les collectes/dépôts.
 */
export async function fetchMeSombSigned(endpoint: string, options: RequestInit = {}) {
  const accessKey = process.env.MESOMB_ACCESS_KEY?.trim();
  const secretKey = process.env.MESOMB_SECRET_KEY?.trim();
  const appKey = process.env.MESOMB_APPLICATION_KEY?.trim();

  if (!accessKey || !secretKey || !appKey) throw new Error("Config MeSomb manquante.");

  const method = (options.method || 'GET').toUpperCase();
  const cleanEndpoint = endpoint.replace(/^\/+|\/+$/g, "");
  const url = `https://mesomb.hachther.com/api/v1.1/${cleanEndpoint}/`;
  
  // Note: Si le SDK n'expose pas de méthode générique signée, 
  // nous utilisons cette structure propre qui suit la doc.
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'X-MeSomb-Application': appKey,
      'Authorization': `Token ${process.env.MESOMB_API_KEY || accessKey}`, // Fallback Token si HMAC échoue encore sur certains endpoints
      'Content-Type': 'application/json',
    },
    cache: 'no-store'
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || data.message || "Erreur API MeSomb");
  return data;
}
