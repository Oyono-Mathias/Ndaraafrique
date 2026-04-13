import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { processNdaraPayment } from '@/services/paymentProcessor';

/**
 * @fileOverview Webhook MeSomb sécurisé.
 * ✅ BACK-CHECK : Double vérification systématique via API MeSomb.
 * ✅ AUTH : Utilisation du format Basic applicationKey:accessKey:secretKey.
 */

export async function POST(req: Request) {
  const requestId = `WH-MS-${Date.now()}`;
  console.log(`[${requestId}] 📨 Webhook MeSomb reçu.`);

  try {
    const APP_KEY = process.env.MESOMB_APPLICATION_KEY?.trim();
    const ACCESS_KEY = process.env.MESOMB_ACCESS_KEY?.trim();
    const SECRET_KEY = process.env.MESOMB_SECRET_KEY?.trim();

    if (!APP_KEY || !ACCESS_KEY || !SECRET_KEY) {
        console.error(`[${requestId}] ❌ Config serveur manquante pour validation.`);
        return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    const body = await req.json();
    
    // Extraction des métadonnées sécurisées
    const txnData = body.transaction || body;
    const extra = txnData.metadata || txnData.extra || body.extra;
    
    const internalRef = extra?.internalReference;
    const securityToken = extra?.securityToken;

    if (!internalRef || !securityToken) {
        console.error(`[${requestId}] ❌ Payload incomplet (références manquantes).`);
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const db = getAdminDb();
    const paymentDoc = await db.collection('payments').doc(internalRef).get();
    
    if (!paymentDoc.exists) {
        console.error(`[${requestId}] ❌ Transaction ${internalRef} inconnue dans Firestore.`);
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const storedData = paymentDoc.data();

    // 1. Validation du Jeton de sécurité (Anti-Spoofing)
    if (storedData?.security?.nonce !== securityToken) {
        console.error(`[${requestId}] 🚨 ALERTE SÉCURITÉ : Tentative de spoofing Webhook.`);
        await db.collection('security_logs').add({
            eventType: 'webhook_security_breach',
            userId: storedData?.userId,
            details: `Nonce mismatch détecté pour ${internalRef}.`,
            timestamp: new Date()
        });
        return NextResponse.json({ error: 'Security breach' }, { status: 403 });
    }

    // 2. DOUBLE-VÉRIFICATION API (Le "Back-check" indispensable)
    const credentials = `${APP_KEY}:${ACCESS_KEY}:${SECRET_KEY}`;
    const encodedAuth = Buffer.from(credentials).toString('base64');
    const gatewayId = txnData.pk || txnData.id || txnData.guid;
    
    console.log(`[${requestId}] 🔍 Lancement du back-check pour ${gatewayId}...`);

    const verifyRes = await fetch(`https://mesomb.hachther.com/api/v1.1/payment/status/?id=${gatewayId}`, {
        headers: {
            'Authorization': `Basic ${encodedAuth}`,
        },
        cache: 'no-store'
    });

    if (!verifyRes.ok) {
        console.error(`[${requestId}] ❌ Échec de la vérification API MeSomb. Status: ${verifyRes.status}`);
        return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
    }

    const officialTxn = await verifyRes.json();

    if (officialTxn.status !== 'SUCCESS') {
        console.log(`[${requestId}] ℹ️ Transaction non aboutie chez MeSomb : ${officialTxn.status}`);
        await db.collection('payments').doc(internalRef).update({
            status: 'failed',
            error: `MeSomb Status: ${officialTxn.status}`,
            updatedAt: new Date()
        });
        return NextResponse.json({ status: 'ignored', reason: officialTxn.status });
    }

    // 3. DÉCLENCHEMENT DU PROCESSEUR FINANCIER (Crédit/Inscription)
    await processNdaraPayment({
      transactionId: internalRef,
      gatewayTransactionId: String(gatewayId),
      provider: 'mesomb',
      amount: Number(officialTxn.amount),
      currency: officialTxn.currency || 'XAF',
      metadata: {
        userId: storedData?.userId,
        courseId: storedData?.courseId,
        type: storedData?.type || 'course_purchase',
      }
    });

    console.log(`[${requestId}] ✅ Succès total. Wallet crédité.`);
    return NextResponse.json({ processed: true });

  } catch (error: any) {
    console.error(`[${requestId}] ❌ ERREUR WEBHOOK CRITIQUE:`, error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}