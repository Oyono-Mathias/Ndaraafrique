'use server';

/**
 * @fileOverview Met à jour les réglages globaux de la plateforme.
 * ✅ SÉCURITÉ : Validation du rôle admin côté serveur.
 * ✅ INTÉGRITÉ : Fusion profonde des données pour éviter d'écraser les modules non ciblés.
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
 * Met à jour les réglages globaux dans Firestore.
 * Si une section est spécifiée, seule cette branche est mise à jour.
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
    const currentSnap = await settingsRef.get();
    const currentData = (currentSnap.exists ? currentSnap.data() : {}) as any;

    // 2. Préparation de la mise à jour (Targeted Module Update)
    let updatePayload: any = {};
    
    if (section && settings[section]) {
        // On ne met à jour que le module actif
        updatePayload[section] = settings[section];
    } else {
        // Mise à jour globale
        updatePayload = settings;
    }

    // 3. Exécution avec fusion pour préserver les autres modules
    await settingsRef.set({
      ...updatePayload,
      updatedAt: FieldValue.serverTimestamp(),
      lastAdminId: adminId
    }, { merge: true });

    // 4. Journalisation de l'audit pour la cybersécurité
    await db.collection('admin_audit_logs').add({
      adminId,
      eventType: section ? `settings.${section}_update` : 'settings.full_update',
      target: { id: 'global', type: 'settings' },
      details: `Mise à jour de la configuration système : ${section || 'Tous les modules'}.`,
      diff: {
          previous: section ? (currentData?.[section] || {}) : "full_backup_logged",
          next: section ? (settings?.[section] || {}) : "full_update_applied"
      },
      timestamp: FieldValue.serverTimestamp(),
    });

    // 5. Rafraîchissement des caches Next.js
    revalidatePath('/admin/settings');
    revalidatePath('/[locale]/admin/settings', 'page');

    return { success: true };

  } catch (error: any) {
    console.error("Erreur critique [updateGlobalSettings]:", error.message);
    return { 
      success: false, 
      error: error.message || "Impossible de déployer les réglages. Vérifiez les permissions Firestore." 
    };
  }
}
