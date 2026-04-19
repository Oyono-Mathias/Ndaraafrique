import { PaymentOperation } from '@hachther/mesomb';

/**
 * @fileOverview Client MeSomb utilisant le SDK officiel pour garantir une signature HMAC-SHA1 parfaite.
 */

const settings = {
  applicationKey: process.env.MESOMB_APPLICATION_KEY?.trim(),
  accessKey: process.env.MESOMB_ACCESS_KEY?.trim(),
  secretKey: process.env.MESOMB_SECRET_KEY?.trim(),
};

/**
 * Initialise une opération de paiement MeSomb.
 */
export function getMeSombClient() {
  if (!settings.applicationKey || !settings.accessKey || !settings.secretKey) {
    throw new Error("CONFIG_INCOMPLETE: Vérifiez les clés MeSomb sur Vercel.");
  }

  return new PaymentOperation({
    applicationKey: settings.applicationKey,
    accessKey: settings.accessKey,
    secretKey: settings.secretKey,
  });
}

/**
 * Utilitaire pour vérifier le statut d'une transaction via le SDK.
 */
export async function getMeSombTransactionStatus(transactionId: string) {
    const client = getMeSombClient();
    const response = await client.getTransactionStatus(transactionId);
    // ✅ Correction : On retourne l'objet transaction directement
    return (response as any).transaction; 
}
