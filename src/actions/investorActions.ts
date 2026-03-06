'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendAdminNotification } from './notificationActions';

/**
 * Enregistre un nouvel intérêt d'investissement et notifie l'admin.
 */
export async function submitInvestorLead(formData: { 
    fullName: string; 
    email: string; 
    organization?: string; 
    message?: string; 
}) {
    try {
        const db = getAdminDb();
        const leadRef = db.collection('investor_leads').doc();
        await leadRef.set({
            id: leadRef.id,
            ...formData,
            status: 'new',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });

        // Notifier les administrateurs immédiatement
        await sendAdminNotification({
            title: '🤝 Nouveau Partenaire Potentiel',
            body: `${formData.fullName} (${formData.organization || 'Individuel'}) souhaite recevoir le dossier investisseur.`,
            link: '/admin/investisseurs',
            type: 'general'
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error saving investor lead:", error);
        return { success: false, error: "Une erreur est survenue lors de l'envoi de votre demande." };
    }
}

/**
 * Met à jour le statut d'un prospect (ex: de 'new' à 'contacted').
 */
export async function updateInvestorLeadStatus(leadId: string, status: string) {
    try {
        const db = getAdminDb();
        await db.collection('investor_leads').doc(leadId).update({
            status,
            updatedAt: FieldValue.serverTimestamp()
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
