import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { creditUserWallet } from '@/services/walletService';

/**
 * @fileOverview Webhook pour CinetPay.
 * Traite les notifications de paiement et crédite les wallets.
 */

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const transactionId = formData.get('cpm_trans_id') as string;
    const siteId = formData.get('cpm_site_id') as string;

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID missing' }, { status: 400 });
    }

    const API_KEY = process.env.CINETPAY_API_KEY;
    const SITE_ID = process.env.CINETPAY_SITE_ID;

    // 1. Sécurité : Vérifier le site ID
    if (siteId !== SITE_ID) {
        return NextResponse.json({ error: 'Invalid Site ID' }, { status: 403 });
    }

    // 2. Vérification du statut réel auprès de CinetPay (Poll pour sécurité)
    const verifyPayload = {
        apikey: API_KEY,
        site_id: SITE_ID,
        transaction_id: transactionId
    };

    const verifyRes = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyPayload)
    });

    const result = await verifyRes.json();

    if (result.code === '00' && result.message === 'SUCCES') {
        const db = getAdminDb();
        const txnDoc = await db.collection('transactions').doc(transactionId).get();

        if (txnDoc.exists && txnDoc.data()?.status === 'pending') {
            const data = txnDoc.data();
            
            // 3. Créditer le wallet de manière atomique
            await creditUserWallet(
                data?.userId, 
                Number(data?.amount), 
                transactionId, 
                'Dépôt Mobile Money réussi'
            );

            console.log(`✅ Webhook: Transaction ${transactionId} traitée et créditée.`);
            return NextResponse.json({ status: 'ACCEPTED' });
        } else {
            console.log(`⚠️ Webhook: Transaction ${transactionId} déjà traitée ou inexistante.`);
            return NextResponse.json({ status: 'ALREADY_PROCESSED' });
        }
    }

    return NextResponse.json({ status: 'NOT_SUCCESSFUL' });

  } catch (error: any) {
    console.error('❌ Webhook CinetPay Error:', error.message);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
