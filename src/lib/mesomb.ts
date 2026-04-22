import { PaymentOperation } from '@hachther/mesomb';
import { createHmac, randomBytes } from 'crypto';

/**
 * @fileOverview Client MeSomb utilisant le SDK officiel et des appels API signés.
 * ✅ SÉCURITÉ : Signature V4/V1.1 gérée selon les besoins de l'endpoint.
 */

export function getMeSombClient() {
  const applicationKey = process.env.MESOMB_APPLICATION_KEY?.trim();
  const accessKey = process.env.MESOMB_ACCESS_KEY?.trim();
  const secretKey = process.env.MESOMB_SECRET_KEY?.trim();

  if (!applicationKey || !accessKey || !secretKey) {
    throw new Error("CONFIG_MISSING: Les variables MeSomb sont absentes.");
  }

  return new PaymentOperation({
    applicationKey,
    accessKey,
    secretKey,
  });
}

/**
 * Récupère le solde réel du compte marchand MeSomb.
 * Cette méthode utilise une requête signée manuellement car le SDK 
 * peut ne pas exposer cette fonctionnalité sur l'objet PaymentOperation.
 */
export async function getMeSombAccountBalance() {
  const applicationKey = process.env.MESOMB_APPLICATION_KEY?.trim();
  const accessKey = process.env.MESOMB_ACCESS_KEY?.trim();
  const secretKey = process.env.MESOMB_SECRET_KEY?.trim();

  if (!applicationKey || !accessKey || !secretKey) {
    throw new Error("Configuration MeSomb incomplète.");
  }

  const nonce = randomBytes(16).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000);
  const method = 'GET';
  const endpoint = '/api/v1.1/payment/account/';
  
  // Format de signature MeSomb V1.1 pour les requêtes GET
  const signString = `${method}\n${endpoint}\n${timestamp}\n${nonce}`;
  const signature = createHmac('sha1', secretKey).update(signString).digest('hex');

  const url = `https://mesomb.com${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-MeSomb-Application': applicationKey,
        'Authorization': `MeSomb ${accessKey}:${signature}:${nonce}:${timestamp}`,
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MeSomb API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error("[MeSomb Account Fetch Error]", error.message);
    throw error;
  }
}

/**
 * Récupère le statut réel d'une transaction auprès de MeSomb.
 */
export async function getMeSombTransactionStatus(transactionId: string) {
    try {
        const client = getMeSombClient();
        // Utilisation de getStatus qui est la méthode officielle du SDK
        const response = await (client as any).getStatus(transactionId);
        return response.transaction || (response as any).data;
    } catch (e) {
        console.error(`[MeSomb Status Check Fail] ID: ${transactionId}`, e);
        return null;
    }
}

/**
 * Génère un nonce sécurisé pour les transactions.
 */
export function generateNonce() {
    return randomBytes(16).toString('hex');
}
