import { PaymentOperation } from '@hachther/mesomb';

const applicationKey = process.env.MESOMB_APPLICATION_KEY!;
const accessKey = process.env.MESOMB_ACCESS_KEY!;
const secretKey = process.env.MESOMB_SECRET_KEY!;

if (!applicationKey || !accessKey || !secretKey) {
  throw new Error("Variables d'environnement MeSomb manquantes");
}

export const mesombClient = new PaymentOperation(applicationKey, accessKey, secretKey);

/**
 * Récupère les informations de l'application (inclut souvent le solde)
 */
export async function getMesombStatus() {
  try {
    const status = await mesombClient.getStatus();
    return {
      success: true,
      data: status,
      balance: status?.balance || status?.account_balance || status?.wallet?.balance || 0,
      currency: 'XOF',
    };
  } catch (error: any) {
    console.error("[MeSomb Status Error]", error);
    return {
      success: false,
      error: error.message || "Impossible de récupérer les infos MeSomb",
    };
  }
}

/**
 * Exemple pour lancer une transaction (collect)
 */
export async function makeCollect(params: {
  amount: number;
  service: 'MTN' | 'ORANGE';
  payer: string;           // numéro avec +237
  nonce?: string;
  trxID?: string;
}) {
  try {
    const response = await mesombClient.makeCollect({
      amount: params.amount,
      service: params.service,
      payer: params.payer,
      nonce: params.nonce || Date.now().toString(),
      trxID: params.trxID,
    });

    return { success: true, data: response };
  } catch (error: any) {
    console.error("[MeSomb Collect Error]", error);
    return { success: false, error: error.message };
  }
}