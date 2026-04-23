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
 * ✅ OPTIMISATION : Utilisation de la signature V1.1 compacte (Recommandée pour Account).
 */
export async function getMeSombAccountBalance() {
  const applicationKey = process.env.MESOMB_APPLICATION_KEY?.trim();
  const accessKey = process.env.MESOMB_ACCESS_KEY?.trim();
  const secretKey = process.env.MESOMB_SECRET_KEY?.trim();

  if (!applicationKey || !accessKey || !secretKey) {
    throw new Error("Configuration MeSomb incomplète (Clés manquantes).");
  }

  const nonce = randomBytes(16).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const method = 'GET';
  const endpoint = '/v1.1/payment/account/';
  
  // Format de signature MeSomb V1.1 (Compact)
  // Note: Certaines versions de l'API préfèrent la concaténation sans \n pour cet endpoint
  const signString = method + endpoint + timestamp + nonce;
  const signature = createHmac('sha1', secretKey).update(signString).digest('hex');

  const url = `https://api.mesomb.com${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-MeSomb-Application': applicationKey,
        'Authorization': `MeSomb ${accessKey}:${signature}:${nonce}:${timestamp}`,
        'Cache-Control': 'no-cache',
        'Accept': 'application/json'
      },
      // Timeout court pour éviter de bloquer le thread Next.js
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let cleanError = "Erreur MeSomb";
      
      try {
          const errJson = JSON.parse(errorText);
          cleanError = errJson.message || errJson.detail || `Erreur ${response.status}`;
      } catch (e) {
          cleanError = errorText.includes('<!DOCTYPE html>') 
            ? "Service MeSomb Indisponible (404/500)" 
            : errorText.substring(0, 100);
      }
      
      throw new Error(cleanError);
    }

    return await response.json();
  } catch (error: any) {
    console.error("[MeSomb Account Fetch Error]", error.message);
    // On propage l'erreur pour qu'elle soit capturée par l'UI
    if (error.name === 'TimeoutError') throw new Error("Délai de connexion dépassé (MeSomb ne répond pas).");
    throw error;
  }
}

/**
 * Récupère le statut réel d'une transaction auprès de MeSomb.
 */
export async function getMeSombTransactionStatus(transactionId: string) {
    try {
        const client = getMeSombClient();
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
