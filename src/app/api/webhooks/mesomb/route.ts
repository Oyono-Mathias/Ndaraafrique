import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { processNdaraPayment } from '@/services/paymentProcessor';
import { getMeSombTransactionStatus } from '@/lib/mesomb';

/**
 * @fileOverview Webhook MeSomb fiabilisé pour Ndara Afrique.
 * ✅ UNIFICATION : Cherche la transaction par ID direct.
 * ✅ LOGS : Visibilité complète dans la console Vercel.
 */

export async function POST(req: Request) {
  const webhookId = `WH-${Date.now()}`;
  console.log(`[${webhookId}] 📨 Webhook MeSomb reçu.`);

  try {
    const body = await req.json();
    console.log(`[${webhookId}] Payload:`, JSON.stringify(body));

    const transaction = body.transaction || body;
    const gatewayId = String(transaction.pk || transaction.id);
    
    if (!gatewayId) {
      console.error(`[${webhookId}] ❌ ID de transaction manquant dans le payload.`);
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // 1. VÉRIFICATION DE SÉCURITÉ VIA SDK
    console.log(`[${webhookId}] 🔍 Vérification statut MeSomb pour: ${gatewayId}`);
    const officialTxn = await getMeSombTransactionStatus(gatewayId);

    if (officialTxn.status !== 'SUCCESS') {
        console.warn(`[${webhookId}] ⚠️ Transaction non réussie chez MeSomb (Statut: ${officialTxn.status}). Abandon.`);
        return NextResponse.json({ status: 'ignored', reason: officialTxn.status });
    }

    // 2. RÉCUPÉRATION DU DOCUMENT PAIEMENT
    const db = getAdminDb();
    const paymentRef = db.collection('payments').doc(gatewayId);
    const paymentDoc = await paymentRef.get();
    
    if (!paymentDoc.exists) {
        console.error(`[${webhookId}] ❌ Document paiement introuvable dans Firestore pour l'ID: ${gatewayId}`);
        // Log de secours si l'initiation a foiré mais que l'argent est pris
        await db.collection('security_logs').add({
            eventType: 'payment_orphan_webhook',
            targetId: gatewayId,
            details: `Webhook reçu pour une transaction inconnue de ${officialTxn.amount} XAF`,
            timestamp: new Date()
        });
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const storedData = paymentDoc.data();
    console.log(`[${webhookId}] ✅ Transaction identifiée pour l'utilisateur: ${storedData?.userId}`);

    // 3. TRAITEMENT FINANCIER (Crédit wallet / Inscription cours)
    console.log(`[${webhookId}] ⚙️ Lancement du processNdaraPayment...`);
    
    await processNdaraPayment({
      transactionId: gatewayId,
      gatewayTransactionId: gatewayId,
      provider: 'mesomb',
      amount: Number(officialTxn.amount),
      currency: officialTxn.currency || 'XAF',
      metadata: {
        ...storedData?.metadata,
        userId: storedData?.userId,
        courseId: storedData?.courseId || 'WALLET_TOPUP',
        type: storedData?.type || 'wallet_topup',
        operator: officialTxn.service
      }
    });

    console.log(`[${webhookId}] 🏆 Transaction ${gatewayId} finalisée avec succès.`);
    return NextResponse.json({ processed: true, transactionId: gatewayId });

  } catch (error: any) {
    console.error(`[${webhookId}] 💥 ERREUR FATALE WEBHOOK:`, error.message);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }
}
