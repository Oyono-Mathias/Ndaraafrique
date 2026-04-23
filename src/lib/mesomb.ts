import { PaymentOperation } from '@hachther/mesomb';
import { createHmac, randomBytes } from 'crypto';

/**
 * @fileOverview Client MeSomb utilisant le SDK officiel et des appels API signés.
 * ✅ SÉCURITÉ : Signature V4/V1.1 gérée selon les besoins de l'endpoint.
 * ✅ OPTIMISATION : User-Agent et headers de compatibilité ajoutés.
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
 * ✅ FIABILITÉ : Utilisation d'un User-Agent et d'une signature V1.1 robuste.
 */
export async function getMeSombAccountBalance() {
  const applicationKey = process.env.MESOMB_APPLICATION_KEY?.trim();
  const accessKey = process.env.MESOMB_ACCESS_KEY?.trim();
  const secretKey = process.env.MESOMB_SECRET_KEY?.trim();

  if (!applicationKey || !accessKey || !secretKey) {
    throw new Error("Configuration MeSomb incomplète.");
  }

  // Utilisation d'un nonce simple et efficace
  const nonce = randomBytes(8).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const method = 'GET';
  const endpoint = '/v1.1/payment/account/';
  
  // Signature V1.1 : Concaténation pure sans délimiteur
  const signString = method + endpoint + timestamp + nonce;
  const signature = createHmac('sha1', secretKey).update(signString).digest('hex');

  const url = `https://api.mesomb.com${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-MeSomb-Application': applicationKey,
        'Authorization': `MeSomb ${accessKey}:${signature}:${nonce}:${timestamp}`,
        'Accept': 'application/json',
        'User-Agent': 'NdaraAfrique/2.5 (Vercel; Serverless)',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      let cleanError = `Erreur ${response.status}`;
      
      try {
          const errJson = JSON.parse(errorText);
          cleanError = errJson.message || errJson.detail || cleanError;
      } catch (e) {
          // Si MeSomb renvoie du HTML, on n'affiche que le début
          cleanError = errorText.substring(0, 50);
      }
      
      throw new Error(cleanError);
    }

    return await response.json();
  } catch (error: any) {
    console.error("[MeSomb API Critical]", error.message);
    // On remonte l'erreur exacte pour le dashboard
    throw new Error(error.message || "FETCH_FAILED");
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
