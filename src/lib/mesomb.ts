// src/lib/mesomb.ts
import { PaymentOperation, RandomGenerator } from '@hachther/mesomb';

/**
 * Configuration MeSomb - Utilisation du SDK officiel
 * Exécution côté serveur uniquement
 */

const applicationKey = process.env.MESOMB_APPLICATION_KEY!;
const accessKey = process.env.MESOMB_ACCESS_KEY!;
const secretKey = process.env.MESOMB_SECRET_KEY!;

if (!applicationKey || !accessKey || !secretKey) {
  throw new Error(
    'Variables d\'environnement MeSomb manquantes. Vérifiez : ' +
    'MESOMB_APPLICATION_KEY, MESOMB_ACCESS_KEY, MESOMB_SECRET_KEY'
  );
}

// Client MeSomb centralisé
const mesombClient = new PaymentOperation(applicationKey, accessKey, secretKey);

/**
 * Récupère le statut de l'application (inclut généralement le solde du compte marchand)
 * → Utilisé dans l'écran Administration
 */
export async function getMesombStatus() {
  try {
    const status = await mesombClient.getStatus();

    console.log('[MeSomb Status Success]', status); // ← Important pour debug

    return {
      success: true,
      balance: status?.balance ?? 
               status?.account_balance ?? 
               status?.wallet?.balance ?? 
               0,
      currency: 'XOF',
      lastUpdated: new Date().toISOString(),
      rawData: status, // pour debug
    };
  } catch (error: any) {
    console.error('[MeSomb Status Error]', error);
    return {
      success: false,
      error: error.message || "Impossible de récupérer le solde MeSomb",
      details: error?.message,
    };
  }
}

/**
 * Lance une transaction de collecte (Mobile Money)
 * → Utilisé dans ton écran de paiement (bouton "LANCER LA TRANSACTION")
 */
export async function makeMesombCollect(params: {
  amount: number;
  service: 'MTN' | 'ORANGE';
  payer: string;           // Numéro avec indicatif, ex: "237653706443"
  nonce?: string;
  trxID?: string;          // Ton ID de transaction interne (recommandé)
}) {
  try {
    const response = await mesombClient.makeCollect({
      amount: params.amount,
      service: params.service,
      payer: params.payer,
      nonce: params.nonce || RandomGenerator.nonce(),
      trxID: params.trxID || `trx_${Date.now()}`,
    });

    console.log('[MeSomb Collect Success]', response);

    return {
      success: true,
      data: response,
    };
  } catch (error: any) {
    console.error('[MeSomb Collect Error]', error);
    return {
      success: false,
      error: error.message || "Échec de la transaction",
    };
  }
}

// Export optionnel du client brut si besoin ailleurs
export { mesombClient };