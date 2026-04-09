'use server';

/**
 * @fileOverview Met à jour les réglages globaux de la plateforme.
 * ✅ RÉSOLU : Typage sécurisé pour éviter l'erreur 'possibly undefined' sur currentData.
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
 * Met à jour les réglages globaux dans Firestore
 */
export async function updateGlobalSettings({
  settings,
  adminId,
  section
}: UpdateSettingsParams): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminDb();
    const settingsRef = db.collection('settings').doc('global');
    
    // 1. Récupérer l'état actuel
    const currentSnap = await settingsRef.get();
    
    // ✅ CORRECTION : On force le type 'any' et on garantit un objet vide
    const currentData = (currentSnap.exists ? currentSnap.data() : {}) as any;

    // 2. Préparation de la mise à jour
    const updatePayload = section ? { [section]: settings[section] } : settings;

    // 3. Exécution de la mise à jour
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
      details: `Mise à jour de la configuration : ${section || 'Toutes les sections'}.`,
      diff: {
          // ✅ CORRECTION : Utilisation de l'optional chaining ?. pour sécuriser l'accès
          previous: section ? (currentData?.[section] || {}) : currentData,
          next: section ? (settings?.[section] || {}) : settings
      },
      timestamp: FieldValue.serverTimestamp(),
    });

    // 5. Revalidation du cache
    revalidatePath('/admin/settings');
    revalidatePath('/[locale]/admin/settings', 'page');

    return { success: true };

  } catch (error: any) {
    console.error("Erreur critique lors de la mise à jour des réglages:", error);
    return { 
      success: false, 
      error: "Impossible de déployer les réglages. Vérifiez les permissions Firestore." 
    };
  }
}
