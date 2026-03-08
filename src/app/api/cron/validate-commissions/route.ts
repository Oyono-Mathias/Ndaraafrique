import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

/**
 * @fileOverview Cron Job pour la validation automatique des commissions Ndara.
 * Libère les fonds gelés (14j) s'ils n'ont pas été annulés.
 */

export async function GET(req: Request) {
  // Vérification de la clé secrète (Configurable dans Vercel/Firebase)
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const now = new Date();

    // 1. Trouver les transactions 'pending' dont la date de déblocage est passée
    const q = db.collection('affiliate_transactions')
        .where('status', '==', 'pending')
        .where('unlockDate', '<=', Timestamp.fromDate(now))
        .limit(50); // Traitement par lots pour la stabilité

    const snapshot = await q.get();
    
    if (snapshot.empty) {
        return NextResponse.json({ success: true, count: 0, message: "Aucune commission à débloquer." });
    }

    let processedCount = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const affiliateId = data.affiliateId;
        const commission = data.commissionAmount;

        const batch = db.batch();

        // Passer la transaction en 'approved'
        batch.update(doc.ref, { status: 'approved' });

        // Transférer du solde 'pending' vers le solde 'available' (affiliateBalance)
        const userRef = db.collection('users').doc(affiliateId);
        batch.update(userRef, {
            pendingAffiliateBalance: FieldValue.increment(-commission),
            affiliateBalance: FieldValue.increment(commission)
        });

        await batch.commit();
        processedCount++;
    }

    return NextResponse.json({ 
        success: true, 
        count: processedCount, 
        message: `${processedCount} commissions ont été libérées.` 
    });

  } catch (error: any) {
    console.error("CRON_COMMISSION_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
