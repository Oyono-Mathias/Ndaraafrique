import { PaymentOperation } from '@hachther/mesomb';

/**
 * @fileOverview Client MeSomb standardisé utilisant le SDK officiel v2.0.1.
 * ✅ SÉCURITÉ : Utilise les classes natives pour la signature V4.
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
 * Récupère le statut de l'application (inclut le solde du compte).
 * Utilise la méthode officielle .getStatus() du SDK.
 */
export async function getMeSombAccountBalance() {
  const client = getMeSombClient();
  // La méthode getStatus() renvoie l'objet Application contenant les soldes
  const response = await client.getStatus();
  return response;
}

/**
 * Récupère le statut d'une transaction spécifique par son ID.
 */
export async function getMeSombTransactionStatus(transactionId: string) {
  try {
    const client = getMeSombClient();
    const transactions = await client.getTransactions([transactionId]);
    if (transactions && transactions.length > 0) {
      return transactions[0];
    }
    return null;
  } catch (e) {
    console.error(`[MeSomb Status Check Fail] ID: ${transactionId}`, e);
    return null;
  }
}

export function generateNonce() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
