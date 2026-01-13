
'use server';

import { adminDb } from '@/firebase/admin';
import { sendAdminNotification } from './notificationActions';
import { detectFraud } from '@/ai/flows/detect-fraud-flow';
import { Timestamp } from 'firebase-admin/firestore';

// This is a placeholder for the real Moneroo SDK.
class Moneroo {
    private publicKey: string | undefined;
    private secretKey: string | undefined;

    constructor(publicKey?: string, secretKey?: string) {
        this.publicKey = publicKey;
        this.secretKey = secretKey;
    }

    async verify(transactionId: string): Promise<{ status: string; data?: any; message?: string }> {
        if (!this.secretKey || this.secretKey === "YOUR_MONEROO_SECRET_KEY_HERE") {
             return { status: 'error', message: 'Moneroo secret key is not configured.' };
        }
        return {
            status: 'success',
            data: { status: 'successful', id: transactionId, customer: { email: 'test@example.com' } },
        };
    }

    get payments() { return { verify: this.verify.bind(this) }; }
}


export async function verifyMonerooTransaction(transactionId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const publicKey = process.env.NEXT_PUBLIC_MONEROO_PUBLIC_KEY;
    const secretKey = process.env.MONEROO_SECRET_KEY;

    if (!secretKey || secretKey === "YOUR_MONEROO_SECRET_KEY_HERE") {
        console.error("Moneroo secret key is not configured.");
        return { success: false, error: 'Configuration serveur incomplète. Clé secrète manquante.' };
    }

    try {
        const moneroo = new Moneroo(publicKey, secretKey);
        const response = await moneroo.payments.verify(transactionId);
        
        if (response?.status === 'success' && response.data?.status === 'successful') {
            
            // --- AI FRAUD DETECTION ---
            const userId = response.data.metadata?.userId;
            const courseId = response.data.metadata?.courseId;

            if (userId && courseId) {
                const [userDoc, courseDoc, paymentHistory] = await Promise.all([
                    adminDb.collection('users').doc(userId).get(),
                    adminDb.collection('courses').doc(courseId).get(),
                    adminDb.collection('payments').where('userId', '==', userId).limit(1).get()
                ]);

                if (userDoc.exists) {
                    const userData = userDoc.data()!;
                    const accountAgeInSeconds = Math.floor((Timestamp.now().seconds - (userData.createdAt as Timestamp).seconds));
                    
                    const fraudCheckPayload = {
                        transactionId: response.data.id,
                        amount: response.data.amount,
                        courseTitle: courseDoc.data()?.title || 'Unknown Course',
                        user: {
                            id: userId,
                            accountAgeInSeconds: accountAgeInSeconds,
                            isFirstTransaction: paymentHistory.empty,
                            emailDomain: userData.email.split('@')[1] || '',
                        }
                    };

                    // Call the AI flow without awaiting it to avoid blocking the user
                    detectFraud(fraudCheckPayload).then(async (fraudResult) => {
                        if (fraudResult.isSuspicious) {
                            await adminDb.collection('payments').doc(response.data.id).set({
                                fraudReview: {
                                    isSuspicious: true,
                                    riskScore: fraudResult.riskScore,
                                    reason: fraudResult.reason,
                                    checkedAt: Timestamp.now()
                                }
                            }, { merge: true });

                            await sendAdminNotification({
                                title: `⚠️ Alerte Fraude (Score: ${fraudResult.riskScore})`,
                                body: `Transaction suspecte de ${formatCurrency(response.data.amount)} par ${userData.email}. Raison: ${fraudResult.reason}`,
                                link: `/admin/payments?search=${response.data.id}`,
                                type: 'financialAnomalies'
                            });
                        }
                    }).catch(e => console.error("AI Fraud Detection Flow failed:", e));
                }
            }
            // --- END AI FRAUD DETECTION ---

            return { success: true, data: response.data };
        } else {
            await sendAdminNotification({
                title: '⚠️ Anomalie de Paiement Détectée',
                body: `Échec de la vérification Moneroo pour la transaction ID: ${transactionId}. Statut: ${response.data?.status || 'inconnu'}.`,
                link: '/admin/payments',
                type: 'financialAnomalies'
            });
            return { success: false, error: response?.message || `Paiement non finalisé. Statut : ${response.data?.status}` };
        }

    } catch (error: any) {
        console.error("Error verifying Moneroo transaction:", error);
         await sendAdminNotification({
            title: '🔥 Erreur Critique de Paiement',
            body: `Le service de vérification Moneroo a échoué. Cause: ${error.message}`,
            link: '/admin/settings',
            type: 'financialAnomalies'
        });
        return { success: false, error: error.message || 'Erreur de vérification du paiement.' };
    }
}

function formatCurrency(amount: number) {
  return `${(amount || 0).toLocaleString('fr-FR')} XOF`;
}
