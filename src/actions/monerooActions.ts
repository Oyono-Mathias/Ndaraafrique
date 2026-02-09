'use server';

import { getAdminDb } from '@/firebase/admin';
import { sendAdminNotification } from './notificationActions';
import { detectFraud } from '@/ai/flows/detect-fraud-flow';
import { Timestamp } from 'firebase-admin/firestore';
import type { DetectFraudInput } from '@/ai/flows/detect-fraud-flow';

class Moneroo {
    private publicKey: string | undefined;
    private secretKey: string | undefined;

    constructor(publicKey?: string, secretKey?: string) {
        this.publicKey = publicKey;
        this.secretKey = secretKey;
    }

    async verify(transactionId: string): Promise<{ status: string; data?: any; message?: string }> {
        if (!this.secretKey || this.secretKey === "YOUR_MONEROO_SECRET_KEY_HERE") {
             console.warn("Moneroo secret key is not configured.");
             return {
                status: 'error',
                message: 'Moneroo secret key not configured on the server.',
             };
        }
        
        const url = `https://api.moneroo.io/v1/payments/${transactionId}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${this.secretKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(errorBody.message || `Moneroo API error: ${response.statusText}`);
        }
        
        return response.json();
    }

    get payments() { return { verify: this.verify.bind(this) }; }
}


export async function verifyMonerooTransaction(transactionId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const publicKey = process.env.NEXT_PUBLIC_MONEROO_PUBLIC_KEY;
    const secretKey = process.env.MONEROO_SECRET_KEY;

    try {
        const db = getAdminDb();
        const moneroo = new Moneroo(publicKey, secretKey);
        const response = await moneroo.payments.verify(transactionId);
        
        if (response?.status === 'success' && response.data?.status === 'successful') {
            
            const userId = response.data.metadata?.userId;
            const courseId = response.data.metadata?.courseId;

            if (!userId || !courseId) {
                console.error("Moneroo transaction is missing metadata.", response.data.metadata);
                return { success: false, error: 'Transaction metadata is incomplete.' };
            }

            const [userDoc, courseDoc, paymentHistory] = await Promise.all([
                db.collection('users').doc(userId).get(),
                db.collection('courses').doc(courseId).get(),
                db.collection('payments').where('userId', '==', userId).limit(1).get()
            ]);

            if (!userDoc.exists || !courseDoc.exists) {
                return { success: false, error: 'User or course not found.' };
            }

            const userData = userDoc.data()!;
            const courseData = courseDoc.data()!;
            
            const paymentRef = db.collection('payments').doc(response.data.id);
            const paymentPayload = {
                userId: userId,
                instructorId: courseData.instructorId,
                courseId: courseId,
                courseTitle: courseData.title,
                amount: response.data.amount,
                currency: response.data.currency_code,
                date: Timestamp.now(),
                status: 'Completed',
            };
            
            await paymentRef.set(paymentPayload);

            const accountAgeInSeconds = Math.floor((Timestamp.now().seconds - (userData.createdAt as Timestamp).seconds));
            const fraudCheckPayload: DetectFraudInput = {
                transactionId: response.data.id,
                amount: response.data.amount,
                courseTitle: courseData.title || 'Cours inconnu',
                user: {
                    id: userId,
                    accountAgeInSeconds: accountAgeInSeconds,
                    isFirstTransaction: paymentHistory.empty,
                    emailDomain: userData.email.split('@')[1] || '',
                }
            };
            
            detectFraud(fraudCheckPayload).then(async (fraudResult) => {
                await paymentRef.set({
                    fraudReview: {
                        isSuspicious: fraudResult.isSuspicious,
                        riskScore: fraudResult.riskScore,
                        reason: fraudResult.reason,
                        checkedAt: Timestamp.now(),
                        reviewed: false
                    }
                }, { merge: true });

                if (fraudResult.isSuspicious) {
                     await sendAdminNotification({
                        title: `⚠️ Alerte Fraude (Score: ${fraudResult.riskScore})`,
                        body: `Transaction suspecte de ${response.data.amount} XOF par ${userData.email}.`,
                        link: `/admin/payments?search=${response.data.id}`,
                        type: 'financialAnomalies'
                    });
                }
            }).catch(e => console.error("AI Fraud Detection failed:", e));

            return { success: true, data: response.data };
        } else {
            return { success: false, error: response?.message || `Paiement non finalisé.` };
        }

    } catch (error: any) {
        console.error("Error verifying Moneroo transaction:", error);
        return { success: false, error: error.message || 'Erreur de vérification.' };
    }
}
