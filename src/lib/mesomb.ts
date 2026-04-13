// src/lib/mesomb.ts
import { PaymentOperation, RandomGenerator } from '@hachther/mesomb';

const applicationKey = process.env.MESOMB_APPLICATION_KEY!;
const accessKey = process.env.MESOMB_ACCESS_KEY!;
const secretKey = process.env.MESOMB_SECRET_KEY!;

if (!applicationKey || !accessKey || !secretKey) {
  throw new Error("Clés MeSomb manquantes dans .env");
}

const client = new PaymentOperation(applicationKey, accessKey, secretKey);

export async function getMesombStatus() {
  try {
    const status = await client.getStatus();
    console.log("[MeSomb Status]", status);   // ← regarde ça dans la console !

    return {
      success: true,
      balance: status?.balance ?? status?.account_balance ?? 0,
      currency: "XOF",
      raw: status,
    };
  } catch (error: any) {
    console.error("[MeSomb Status Error]", error);
    return { success: false, error: error.message };
  }
}

export async function makeMesombCollect(params: {
  amount: number;
  service: "MTN" | "ORANGE";
  payer: string;           // ex: "237653706443"
  trxID?: string;
}) {
  try {
    const response = await client.makeCollect({
      amount: params.amount,
      service: params.service,
      payer: params.payer,
      nonce: RandomGenerator.nonce(),
      trxID: params.trxID || `ndara_${Date.now()}`,
    });

    return { success: true, data: response };
  } catch (error: any) {
    console.error("[MeSomb Collect Error]", error);
    return { success: false, error: error.message };
  }
}