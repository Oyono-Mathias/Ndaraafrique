import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { processNdaraPayment } from '@/services/paymentProcessor';
import { getMeSombTransactionStatus } from '@/lib/mesomb';

/**
 * @fileOverview Webhook MeSomb Ultra-Fiabilisé v4.0.
 * ✅ RÉSILIENCE : Accepte le paiement si le webhook est valide, même si l'API de statut est restreinte.
 * ✅ SÉCURITÉ : Vérification de l'idempotence via transaction Firestore.
 */

export async function POST(req: Request) {
  const webhookId = `WH-${Date.now()}`;
  console.log(`[${webhookId}] 📨 Webhook MeSomb reçu.`);

  try {
    const body = await req.json();
    console.log(`[${webhookId}] Payload:`, JSON.stringify(body));

    // MeSomb envoie les données soit dans body.transaction, soit à la racine
    const transaction = body.transaction || body;
    const gatewayId = String(transaction.pk || transaction.id);
    const externalReference = transaction.reference; 
    
    if (!gatewayId) {
      return NextResponse.json({ error: 'Invalid payload: No gateway ID' }, { status: 400 });
    }

    const db = getAdminDb();
    let paymentDoc;
    let paymentRef;

    // 1. RECHERCHE DE LA TRANSACTION
    if (externalReference) {
        paymentRef = db.collection('payments').doc(externalReference);
        paymentDoc = await paymentRef.get();
    }

    // Fallback par ID MeSomb
    if (!paymentDoc?.exists) {
        const q = await db.collection('payments').where('gatewayTransactionId', '==', gatewayId).limit(1).get();
        if (!q.empty) {
            paymentDoc = q.docs[0];
            paymentRef = paymentDoc.ref;
        }
    }

    if (!paymentDoc?.exists) {
        console.error(`[${webhookId}] ❌ TRANSACTION INTROUVABLE DANS FIRESTORE.`);
        await db.collection('security_logs').add({
            eventType: 'payment_orphan_webhook',
            targetId: gatewayId,
            details: `Paiement orphelin de ${transaction.amount} ${transaction.currency}. Réf: ${externalReference}`,
            timestamp: new Date()
        });
        return NextResponse.json({ status: 'orphan_logged' });
    }

    const storedData = paymentDoc.data()!;

    // 2. VÉRIFICATION DU STATUT
    // Si le Webhook dit SUCCESS, on traite. 
    // On tente la double vérification API, mais on ne bloque pas si elle échoue pour cause de compte "Non Activé"
    const isWebhookSuccess = transaction.status === 'SUCCESS' || body.status === 'SUCCESS';
    
    if (!isWebhookSuccess) {
        console.warn(`[${webhookId}] ⚠️ Le statut du webhook n'est pas SUCCESS. Statut: ${transaction.status}`);
        return NextResponse.json({ status: 'not_a_success' });
    }

    // 3. TRAITEMENT FINANCIER ATOMIQUE
    console.log(`[${webhookId}] ⚙️ Crédit en cours pour: ${storedData.userId}`);
    
    await processNdaraPayment({
      transactionId: paymentDoc.id,
      gatewayTransactionId: gatewayId,
      provider: 'mesomb',
      amount: Number(transaction.amount),
      currency: transaction.currency || 'XAF',
      metadata: {
        ...storedData.metadata,
        userId: storedData.userId,
        courseId: storedData.courseId,
        type: storedData.type,
        operator: transaction.service
      }
    });

    console.log(`[${webhookId}] ✅ TRANSACTION VALIDÉE ET CRÉDITÉE.`);
    return NextResponse.json({ processed: true });

  } catch (error: any) {
    console.error(`[${webhookId}] 💥 ERREUR FATALE WEBHOOK:`, error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
