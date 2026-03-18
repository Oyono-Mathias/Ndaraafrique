
'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Country, PaymentMethod } from '@/lib/types';

/**
 * @fileOverview Actions serveur pour la gestion dynamique des pays et moyens de paiement.
 */

export async function addCountryAction(country: Omit<Country, 'id'>) {
    try {
        const db = getAdminDb();
        const ref = db.collection('countries').doc();
        await ref.set({
            ...country,
            id: ref.id,
            paymentMethods: country.paymentMethods || [],
            createdAt: FieldValue.serverTimestamp()
        });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateCountryAction(id: string, country: Partial<Country>) {
    try {
        const db = getAdminDb();
        await db.collection('countries').doc(id).update({
            ...country,
            updatedAt: FieldValue.serverTimestamp()
        });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateCountryPaymentMethods(id: string, methods: PaymentMethod[], adminId: string) {
    try {
        const db = getAdminDb();
        await db.collection('countries').doc(id).update({
            paymentMethods: methods,
            updatedAt: FieldValue.serverTimestamp()
        });

        // Journalisation
        await db.collection('admin_audit_logs').add({
            adminId,
            eventType: 'country.update',
            target: { id, type: 'country' },
            details: `Mise à jour des moyens de paiement pour le pays ${id}.`,
            timestamp: FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function toggleCountryStatusAction(id: string, active: boolean) {
    try {
        const db = getAdminDb();
        await db.collection('countries').doc(id).update({ active });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteCountryAction(id: string) {
    try {
        const db = getAdminDb();
        await db.collection('countries').doc(id).delete();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
