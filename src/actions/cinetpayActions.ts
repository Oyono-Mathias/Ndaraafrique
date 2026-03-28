'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * @fileOverview Actions pour l'intégration réelle de CinetPay.
 */

const API_KEY = process.env.CINETPAY_API_KEY;
const SITE_ID = process.env.CINETPAY_SITE_ID;

export async function initiateCinetPayDeposit({
  amount,
  userId,
  userEmail,
  userName,
  returnUrl
}: {
  amount: number;
  userId: string;
  userEmail: string;
  userName: string;
  returnUrl: string;
}) {
  if (!API_KEY || !SITE_ID) {
    console.error("[CinetPay] Configuration manquante.");
    return { success: false, error: "Le service de paiement n'est pas configuré sur ce serveur." };
  }

  const db = getAdminDb();
  const transactionId = `NDARA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  try {
    // 1. Création de la transaction en attente dans Firestore
    await db.collection('transactions').doc(transactionId).set({
      id: transactionId,
      userId,
      amount,
      currency: 'XOF',
      type: 'deposit',
      status: 'pending',
      provider: 'cinetpay',
      description: 'Recharge Portefeuille Ndara Afrique',
      createdAt: FieldValue.serverTimestamp()
    });

    // 2. Requête vers l'API CinetPay
    const payload = {
      apikey: API_KEY,
      site_id: SITE_ID,
      transaction_id: transactionId,
      amount: amount,
      currency: "XOF",
      alternative_currency: "",
      description: "Recharge Ndara Afrique",
      customer_id: userId,
      customer_name: userName,
      customer_surname: "Ndara",
      customer_email: userEmail,
      customer_phone_number: "",
      customer_address: "Afrique",
      customer_city: "Bangui",
      customer_country: "CF",
      customer_state: "CF",
      customer_zip_code: "0000",
      notify_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://ndara-afrique.web.app'}/api/webhooks/cinetpay`,
      return_url: returnUrl,
      channels: "ALL",
      metadata: userId,
      lang: "fr"
    };

    const response = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.code === '201') {
      return { success: true, paymentUrl: result.data.payment_url };
    } else {
      console.error("[CinetPay API Error]", result);
      return { success: false, error: result.message || "Erreur lors de la génération du lien de paiement." };
    }

  } catch (error: any) {
    console.error("[CinetPay Fatal]", error.message);
    return { success: false, error: "Impossible de contacter la passerelle de paiement." };
  }
}
