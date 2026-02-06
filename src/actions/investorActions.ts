'use server';

import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendAdminNotification } from './notificationActions';

export async function submitInvestorLead(formData: { 
    fullName: string; 
    email: string; 
    organization?: string; 
    message?: string; 
}) {
    if (!adminDb) return { success: false, error: "Service indisponible" };

    try {
        const leadRef = adminDb.collection('investor_leads').doc();
        await leadRef.set({
            ...formData,
            status: 'new',
            createdAt: FieldValue.serverTimestamp()
        });

        // Notifier les administrateurs
        await sendAdminNotification({
            title: '🤝 Nouveau Partenaire Potentiel',
            body: `${formData.fullName} (${formData.organization || 'Individuel'}) souhaite recevoir le dossier investisseur.`,
            link: '/admin/settings', // On pourra créer une page dédiée plus tard
            type: 'general'
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error saving investor lead:", error);
        return { success: false, error: "Une erreur est survenue lors de l'envoi de votre demande." };
    }
}
