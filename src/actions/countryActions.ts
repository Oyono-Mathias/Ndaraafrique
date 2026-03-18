
'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Country } from '@/lib/types';

/**
 * @fileOverview Actions serveur pour la gestion dynamique des pays.
 */

export async function addCountryAction(country: Omit<Country, 'id'>) {
    try {
        const db = getAdminDb();
        const ref = db.collection('countries').doc();
        await ref.set({
            ...country,
            id: ref.id,
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
        await db.collection('countries').doc(id).update(country);
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
