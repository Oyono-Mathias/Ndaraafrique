import { PaymentOperation } from '@hachther/mesomb';
import { createHmac, randomBytes } from 'crypto';

/**
 * @fileOverview Client MeSomb optimisé pour Next.js (Environnement Node.js).
 * ✅ SÉCURITÉ : Signature V4 gérée par le SDK pour les collectes.
 * ✅ COMPATIBILITÉ : Signature V1.1 manuelle pour les endpoints de consultation (GET).
 */

export function getMeSombClient() {
  const applicationKey = process.env.MESOMB_APPLICATION_KEY?.trim();
  const accessKey = process.env.MESOMB_ACCESS_KEY?.trim();
  const secretKey = process.env.MESOMB_SECRET_KEY?.trim();

  if (!applicationKey || !accessKey || !secretKey) {
    throw new Error("CONFIG_MISSING: Les variables MeSomb sont absentes de l'environnement.");
  }

  return new PaymentOperation({
    applicationKey,
    accessKey,
    secretKey,
  });
}

/**
 * Récupère le solde du compte marchand.
 * Utilise la signature V1.1 (Standard pour les requêtes GET de compte).
 */
export async function getMeSombAccountBalance() {
  const applicationKey = process.env.MESOMB_APPLICATION_KEY?.trim();
  const accessKey = process.env.MESOMB_ACCESS_KEY?.trim();
  const secretKey = process.env.MESOMB_SECRET_KEY?.trim();

  if (!applicationKey || !accessKey || !secretKey) {
    throw new Error("Configuration MeSomb incomplète.");
  }

  const nonce = randomBytes(8).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const method = 'GET';
  const endpoint = '/v1.1/payment/account/';
  
  // Signature V1.1 compacte
  const signString = method + endpoint + timestamp + nonce;
  const signature = createHmac('sha1', secretKey).update(signString).digest('hex');

  const url = `https://api.mesomb.com${endpoint}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-MeSomb-Application': applicationKey,
      'Authorization': `MeSomb ${accessKey}:${signature}:${nonce}:${timestamp}`,
      'Accept': 'application/json',
      'User-Agent': 'NdaraAfrique/2.5',
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MeSomb API Error (${response.status}): ${errorText.substring(0, 100)}`);
  }

  return await response.json();
}

export async function getMeSombTransactionStatus(transactionId: string) {
    try {
        const client = getMeSombClient();
        // @ts-ignore - Le SDK a parfois des types incomplets mais la méthode existe
        const response = await client.getStatus(transactionId);
        return response.transaction || response;
    } catch (e) {
        console.error(`[MeSomb Status Check Fail] ID: ${transactionId}`, e);
        return null;
    }
}

export function generateNonce() {
    return randomBytes(16).toString('hex');
}
