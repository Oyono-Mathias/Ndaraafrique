import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { processNdaraPayment } from '@/services/paymentProcessor';

/**
 * @fileOverview Webhook MeSomb Sécurisé (Standard Fintech).
 * 🚫 NE JAMAIS FAIRE CONFIANCE AU BODY.
 * ✅ STRATÉGIE : Double-Check systématique via l'API officielle de MeSomb.
 */

export async function POST(req: Request) {
  const SECRET_KEY = process.env.MESOMB_SECRET_KEY?.trim();
  const APP_KEY = process.env.MESOMB_APP_KEY?.trim();

  try {
    const body = await req.json();
    console.log(`[Webhook MeSomb] Notification reçue pour ID: ${body.transaction?.pk || 'inconnu'}`);

    // 1. Extraction de la référence interne (seule info qu'on accepte du body)
    const txnData = body.transaction || body;
    const metadata = txnData.metadata || txnData.extra || body.extra;
    const internalRef = metadata?.internalReference;

    if (!internalRef) {
        console.error("🚨 Webhook rejeté : Référence interne manquante.");
        return NextResponse.json({ error: 'Missing internal reference' }, { status: 400 });
    }

    // 2. DOUBLE-VÉRIFICATION (The Golden Rule)
    // On appelle directement MeSomb pour vérifier l'état réel de cette transaction
    const verifyRes = await fetch(`https://mesomb.hachther.com/api/v1.1/payment/status/?id=${txnData.pk || txnData.id}`, {
        headers: {
            'Authorization': `Bearer ${SECRET_KEY}`,
            'X-MeSomb-Application': APP_KEY,
        }
    });

    if (!verifyRes.ok) {
        console.error("❌ Échec de la double-vérification auprès de MeSomb.");
        return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
    }

    const officialTxn = await verifyRes.json();

    // 3. Validation du statut officiel
    if (officialTxn.status !== 'SUCCESS') {
        console.warn(`[Webhook] Transaction ${internalRef} non complétée (Statut: ${officialTxn.status})`);
        return NextResponse.json({ status: 'not_completed' });
    }

    // 4. Comparaison avec nos données enregistrées (Anti-Manipulation de montant)
    const db = getAdminDb();
    const paymentDoc = await db.collection('payments').doc(internalRef).get();

    if (!paymentDoc.exists) {
        console.error(`🚨 ALERTE SÉCURITÉ : Tentative de validation d'une transaction inexistante : ${internalRef}`);
        return NextResponse.json({ error: 'Fraud attempt detected' }, { status: 403 });
    }

    const expectedData = paymentDoc.data();

    // Vérification du montant (Crucial pour éviter les spoofing de montant réduit)
    if (Number(officialTxn.amount) < Number(expectedData?.amount)) {
        console.error(`🚨 ALERTE FRAUDE : Mismatch de montant sur ${internalRef}. Reçu: ${officialTxn.amount}, Attendu: ${expectedData?.amount}`);
        await db.collection('security_logs').add({
            eventType: 'payment_amount_mismatch',
            details: `Transaction ${internalRef} : Montant MeSomb (${officialTxn.amount}) inférieur au montant attendu (${expectedData?.amount})`,
            timestamp: new Date(),
            userId: expectedData?.userId
        });
        return NextResponse.json({ error: 'Amount mismatch' }, { status: 403 });
    }

    // 5. Tout est OK -> On lance le processeur atomique
    // processNdaraPayment gère l'idempotence et le crédit du wallet
    await processNdaraPayment({
      transactionId: internalRef,
      gatewayTransactionId: String(officialTxn.pk || officialTxn.id),
      provider: 'mesomb',
      amount: Number(officialTxn.amount),
      currency: officialTxn.currency,
      metadata: {
        userId: expectedData?.userId,
        courseId: expectedData?.courseId,
        type: expectedData?.type
      }
    });

    return NextResponse.json({ processed: true });

  } catch (error: any) {
    console.error('❌ Erreur critique Webhook MeSomb:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
