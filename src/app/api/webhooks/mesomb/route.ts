import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { processNdaraPayment } from '@/services/paymentProcessor';
import { getMeSombTransactionStatus } from '@/lib/mesomb';

/**
 * @fileOverview Webhook MeSomb Ultra-Fiabilisé.
 * ✅ LOOKUP PAR RÉFÉRENCE : Ne dépend plus de l'ID interne fluctuant.
 * ✅ IDEMPOTENCE : Protection contre les doubles crédits.
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
    // On récupère NOTRE référence que nous avons passée à l'initiation
    const externalReference = transaction.reference; 
    
    if (!gatewayId) {
      return NextResponse.json({ error: 'Invalid payload: No gateway ID' }, { status: 400 });
    }

    const db = getAdminDb();
    let paymentDoc;
    let paymentRef;

    // 1. RECHERCHE INTELLIGENTE DU PAIEMENT
    if (externalReference) {
        console.log(`[${webhookId}] 🔍 Recherche par référence Ndara: ${externalReference}`);
        paymentRef = db.collection('payments').doc(externalReference);
        paymentDoc = await paymentRef.get();
    }

    // Fallback par ID MeSomb si la référence est absente du webhook
    if (!paymentDoc?.exists) {
        console.log(`[${webhookId}] ⚠️ Référence non trouvée, recherche par Gateway ID: ${gatewayId}`);
        const q = await db.collection('payments').where('gatewayTransactionId', '==', gatewayId).limit(1).get();
        if (!q.empty) {
            paymentDoc = q.docs[0];
            paymentRef = paymentDoc.ref;
        }
    }

    if (!paymentDoc?.exists) {
        console.error(`[${webhookId}] ❌ TRANSACTION INTROUVABLE. Audit requis.`);
        await db.collection('security_logs').add({
            eventType: 'payment_orphan_webhook',
            targetId: gatewayId,
            details: `Paiement orphelin de ${transaction.amount} ${transaction.currency}. Réf: ${externalReference}`,
            timestamp: new Date()
        });
        // On répond 200 pour que MeSomb arrête de renvoyer le webhook, mais on logge l'alerte
        return NextResponse.json({ status: 'orphan_logged' });
    }

    const storedData = paymentDoc.data()!;

    // 2. VÉRIFICATION DOUBLE SÉCURITÉ
    // On appelle MeSomb pour confirmer que le statut est bien SUCCESS (Anti-fraude)
    const officialTxn = await getMeSombTransactionStatus(gatewayId);
    if (!officialTxn || (officialTxn as any).status !== 'SUCCESS') {
        console.warn(`[${webhookId}] ⚠️ Statut officiel non-SUCCESS chez MeSomb. Abandon.`);
        return NextResponse.json({ status: 'not_success_official' });
    }

    // 3. TRAITEMENT FINANCIER ATOMIQUE
    console.log(`[${webhookId}] ⚙️ Traitement pour l'utilisateur: ${storedData.userId}`);
    
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

    console.log(`[${webhookId}] 🏆 Transaction finalisée.`);
    return NextResponse.json({ processed: true });

  } catch (error: any) {
    console.error(`[${webhookId}] 💥 ERREUR FATALE:`, error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
