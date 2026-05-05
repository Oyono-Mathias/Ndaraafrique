import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { processNdaraPayment } from '@/services/paymentProcessor';
import { getMeSombClient } from '@/lib/mesomb';

/**
 * @fileOverview Webhook MeSomb Ultra-Fiabilisé v6.0 (Standard CTO Fintech).
 * ✅ INDÉPENDANCE : Ne dépend plus de l'activation du compte pour l'API Polling.
 * ✅ SÉCURITÉ : Vérification de la provision RÉELLE via un appel SDK explicite.
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
        const snap = await db.collection('payments')
            .where('gatewayTransactionId', '==', gatewayId)
            .limit(1)
            .get();
            
        if (!snap.empty) {
            paymentDoc = snap.docs[0];
        }
    }

    if (!paymentDoc) {
        console.error(`[${webhookId}] ❌ TRANSACTION INTROUVABLE DANS FIRESTORE.`);
        return NextResponse.json({ status: 'orphan_payment' });
    }

    const storedData = paymentDoc.data()!;

    // 🛡️ 3. VÉRIFICATION DE PROVISION RÉELLE (POLLING SDK)
    // On ne croit pas seulement au corps du webhook (facilement falsifiable), 
    // on interroge MeSomb directement via le SDK.
    const client = getMeSombClient();
    const tsxList = await client.getTransactions([gatewayId]);
    
    if (!tsxList || tsxList.length === 0) {
        console.error(`[${webhookId}] ❌ Transaction inconnue sur les serveurs MeSomb.`);
        return NextResponse.json({ status: 'verify_fail' });
    }

    const realTsx = tsxList[0] as any;
    
    if (realTsx.status !== 'SUCCESS') {
        console.warn(`[${webhookId}] ⚠️ Provision non confirmée chez MeSomb (Status: ${realTsx.status}). Blocage.`);
        await paymentDoc.ref.update({ status: 'failed', 'metadata.reason': 'Verify fail: not successful' });
        return NextResponse.json({ status: 'not_confirmed' });
    }

    // ⚙️ 4. DÉCLENCHEMENT DU TRAITEMENT FINANCIER ATOMIQUE
    console.log(`[${webhookId}] ✅ Provision confirmée. Crédit pour: ${storedData.userId}`);
    
    const result = await processNdaraPayment({
      transactionId: paymentDoc.id,
      gatewayTransactionId: gatewayId,
      provider: realTsx.service?.toLowerCase() || 'mesomb',
      amount: Number(realTsx.amount),
      currency: realTsx.currency || 'XAF',
      metadata: {
        ...storedData.metadata,
        userId: storedData.userId,
        courseId: storedData.courseId,
        type: storedData.type,
        operator: realTsx.service
      }
    });

    if (result.success) {
        return NextResponse.json({ processed: true });
    } else {
        throw new Error("Échec du processeur financier atomique.");
    }

  } catch (error: any) {
    console.error(`[${webhookId}] 💥 ERREUR FATALE WEBHOOK:`, error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
