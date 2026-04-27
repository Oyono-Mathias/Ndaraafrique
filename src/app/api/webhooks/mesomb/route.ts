import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { processNdaraPayment } from '@/services/paymentProcessor';

/**
 * @fileOverview Webhook MeSomb Ultra-Fiabilisé v5.0 (Standard CTO Fintech).
 * ✅ INDÉPENDANCE : Ne dépend plus de l'activation du compte pour l'API Polling.
 * ✅ SÉCURITÉ : Vérification de l'idempotence et logging des orphelins.
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
    let paymentDoc = null;

    // 1. RECHERCHE DE LA TRANSACTION PAR RÉFÉRENCE (La plus fiable)
    if (externalReference) {
        const docRef = db.collection('payments').doc(externalReference);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            paymentDoc = docSnap;
        }
    }

    // 2. FALLBACK : RECHERCHE PAR ID PASSERELLE
    if (!paymentDoc) {
        const q = await db.collection('payments').where('gatewayTransactionId', '==', gatewayId).limit(1).get();
        if (!q.empty) {
            paymentDoc = q.docs[0];
        }
    }

    // 3. GESTION DES ORPHELINS (Paiement reçu mais inconnu de Ndara)
    if (!paymentDoc) {
        console.error(`[${webhookId}] ❌ TRANSACTION INTROUVABLE. CRÉATION LOG SÉCURITÉ.`);
        await db.collection('security_logs').add({
            eventType: 'payment_orphan_webhook',
            targetId: gatewayId,
            details: `Argent reçu (${transaction.amount} ${transaction.currency}) mais aucune référence Ndara trouvée. Réf: ${externalReference}`,
            timestamp: new Date(),
            status: 'open'
        });
        return NextResponse.json({ status: 'orphan_logged' });
    }

    const storedData = paymentDoc.data()!;

    // 4. VÉRIFICATION DU STATUT DANS LE WEBHOOK
    // On fait confiance au succès envoyé par MeSomb (l'argent est déjà chez vous).
    const isWebhookSuccess = transaction.status === 'SUCCESS' || body.status === 'SUCCESS';
    
    if (!isWebhookSuccess) {
        console.warn(`[${webhookId}] ⚠️ Le statut du webhook n'est pas SUCCESS. Transaction échouée.`);
        await paymentDoc.ref.update({ status: 'failed', updatedAt: new Date() });
        return NextResponse.json({ status: 'not_a_success' });
    }

    // 5. TRAITEMENT FINANCIER ATOMIQUE (CRÉDIT WALLET)
    console.log(`[${webhookId}] ⚙️ Déclenchement crédit pour: ${storedData.userId}`);
    
    const result = await processNdaraPayment({
      transactionId: paymentDoc.id,
      gatewayTransactionId: gatewayId,
      provider: transaction.service?.toLowerCase() || 'mesomb',
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

    if (result.success) {
        console.log(`[${webhookId}] ✅ TRANSACTION VALIDÉE ET CRÉDITÉE.`);
        return NextResponse.json({ processed: true });
    } else {
        throw new Error("Échec du traitement financier interne.");
    }

  } catch (error: any) {
    console.error(`[${webhookId}] 💥 ERREUR FATALE WEBHOOK:`, error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
