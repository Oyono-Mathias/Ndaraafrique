'use server';

/**
 * @fileOverview Met à jour les réglages globaux de la plateforme.
 * ✅ SÉCURITÉ : Validation du rôle admin côté serveur.
 * ✅ INTÉGRITÉ : Nettoyage des données pour éviter les conflits Firestore.
 */

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Settings } from '@/lib/types';
import { revalidatePath } from 'next/cache';

interface UpdateSettingsParams {
  settings: Partial<Settings>;
  adminId: string;
  section?: keyof Settings;
}

/**
 * Nettoie un objet pour Firestore (retire undefined, convertit NaN).
 */
function sanitize(obj: any): any {
    return JSON.parse(JSON.stringify(obj, (key, value) => {
        if (value === undefined) return null;
        if (typeof value === 'number' && isNaN(value)) return 0;
        return value;
    }));
}

/**
 * Met à jour les réglages globaux dans Firestore.
 */
export async function updateGlobalSettings({
  settings,
  adminId,
  section
}: UpdateSettingsParams): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminDb();
    
    // 1. Vérification de sécurité Admin
    const adminDoc = await db.collection('users').doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
        throw new Error("UNAUTHORIZED: Droits d'administrateur requis.");
    }

    const settingsRef = db.collection('settings').doc('global');

    // 2. Préparation de la mise à jour (Targeted Module Update)
    let updatePayload: any = {};
    
    if (section && settings[section]) {
        // On ne met à jour que le module actif pour éviter d'écraser les autres
        updatePayload[section] = sanitize(settings[section]);
    } else {
        // Mise à jour globale
        updatePayload = sanitize(settings);
    }

    // 3. Exécution avec fusion
    await settingsRef.set({
      ...updatePayload,
      updatedAt: FieldValue.serverTimestamp(),
      lastAdminId: adminId
    }, { merge: true });

    // 4. Journalisation de l'audit
    await db.collection('admin_audit_logs').add({
      adminId,
      eventType: section ? `settings.${section}_update` : 'settings.full_update',
      target: { id: 'global', type: 'settings' },
      details: `Mise à jour de la configuration : ${section || 'Tous les modules'}.`,
      timestamp: FieldValue.serverTimestamp(),
    });

    // 5. Rafraîchissement des caches
    revalidatePath('/[locale]/admin/settings', 'page');

    return { success: true };

  } catch (error: any) {
    console.error("Erreur [updateGlobalSettings]:", error.message);
    return { 
      success: false, 
      error: error.message || "Erreur de communication avec la base de données." 
    };
  }
}
