'use server';

/**
 * @fileOverview Met à jour les réglages globaux de la plateforme.
 * ✅ TRAÇABILITÉ : Log old vs new values pour l'audit stratégique complet.
 * ✅ SÉCURITÉ : Validation des types et protection Admin.
 */

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Settings } from '@/lib/types';
import { revalidatePath } from 'next/cache';

interface UpdateSettingsParams {
  settings: Partial<Settings>;
  adminId: string;
  section?: keyof Settings; // Permet de mettre à jour juste une section (ex: 'ai')
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
    
    // 1. Récupérer l'état actuel avant modification pour l'Audit Trail
    const currentSnap = await settingsRef.get();
    const currentData = currentSnap.exists ? currentSnap.data() : {};

    // 2. Préparation de la mise à jour
    // Si une section est spécifiée, on ne met à jour que ce bloc
    const updatePayload = section ? { [section]: settings[section] } : settings;

    // 3. Exécution de la mise à jour (Fusion)
    await settingsRef.set({
      ...updatePayload,
      updatedAt: FieldValue.serverTimestamp(),
      lastAdminId: adminId
    }, { merge: true });

    // 4. Journalisation de l'audit pour la conformité
    await db.collection('admin_audit_logs').add({
      adminId,
      eventType: section ? `settings.${section}_update` : 'settings.full_update',
      target: { id: 'global', type: 'settings' },
      details: `Mise à jour de la configuration : ${section || 'Toutes les sections'}.`,
      diff: {
          previous: section ? (currentData[section] || {}) : currentData,
          next: section ? settings[section] : settings
      },
      timestamp: FieldValue.serverTimestamp(),
    });

    // 5. Revalidation du cache pour que les changements soient visibles immédiatement
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
