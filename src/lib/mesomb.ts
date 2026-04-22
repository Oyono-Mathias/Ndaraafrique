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
 * ✅ FIX : Utilisation du sous-domaine api.mesomb.com pour éviter le 404 (WordPress).
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
  // L'endpoint pour la signature commence par /v1.1/... si on utilise api.mesomb.com
  const endpoint = '/v1.1/payment/account/';
  
  // Format de signature MeSomb V1.1
  const signString = `${method}\n${endpoint}\n${timestamp}\n${nonce}`;
  const signature = createHmac('sha1', secretKey).update(signString).digest('hex');

  const url = `https://api.mesomb.com${endpoint}`;
  
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
      // On ne renvoie que les 200 premiers caractères pour éviter de saturer l'UI
      const cleanError = errorText.includes('<!DOCTYPE html>') 
        ? "Endpoint introuvable (404). Vérifiez la configuration du compte."
        : errorText.substring(0, 200);
      throw new Error(cleanError);
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
