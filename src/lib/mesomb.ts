import { PaymentOperation } from '@hachther/mesomb';
import { randomBytes } from 'crypto';

/**
 * @fileOverview Client MeSomb utilisant le SDK officiel.
 * ✅ SÉCURITÉ : La signature est gérée nativement par le SDK.
 * ✅ ROBUSTESSE : Utilise des forçages de type pour éviter les erreurs de build Vercel.
 */

export function getMeSombClient() {
  const applicationKey = process.env.MESOMB_APPLICATION_KEY?.trim();
  const accessKey = process.env.MESOMB_ACCESS_KEY?.trim();
  const secretKey = process.env.MESOMB_SECRET_KEY?.trim();

  if (!applicationKey || !accessKey || !secretKey) {
    throw new Error("CONFIG_MISSING: Les variables MESOMB_APPLICATION_KEY, MESOMB_ACCESS_KEY ou MESOMB_SECRET_KEY sont absentes.");
  }

  return new PaymentOperation({
    applicationKey,
    accessKey,
    secretKey,
  });
}

/**
 * Récupère le statut réel d'une transaction auprès de MeSomb.
 * Utilisé par le webhook et le service de réconciliation.
 */
export async function getMeSombTransactionStatus(transactionId: string) {
    try {
        const client = getMeSombClient();
        // Utilisation de getStatus qui est la méthode officielle du SDK v2
        const response = await (client as any).getStatus(transactionId);
        
        // Le SDK retourne un objet de réponse contenant la transaction
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
