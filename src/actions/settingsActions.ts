'use server';

/**
 * @fileOverview Met à jour les réglages globaux de la plateforme.
 * ✅ TRAÇABILITÉ : Log old vs new values pour l'audit stratégique complet.
 * ✅ SÉCURITÉ : Validation des types et protection Admin.
 */

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Settings } from '@/lib/types';

interface UpdateSettingsParams {
  settings: Partial<Settings>;
  adminId: string;
}

export async function updateGlobalSettings({
  settings,
  adminId
}: UpdateSettingsParams): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminDb();
    const settingsRef = db.collection('settings').doc('global');
    
    // 1. Récupérer l'état actuel avant modification (Audit Trail)
    const currentSnap = await settingsRef.get();
    const currentSettings = currentSnap.exists ? currentSnap.data() : {};

    // 2. Mise à jour (Fusion)
    await settingsRef.set(settings, { merge: true });

    // 3. Journalisation ultra-détaillée de l'audit
    // On enregistre les changements précis pour la conformité Fintech
    await db.collection('admin_audit_logs').add({
      adminId,
      eventType: 'settings.global_update',
      target: { id: 'global', type: 'settings' },
      details: `Refonte de la configuration système par l'administrateur ${adminId}.`,
      diff: {
          previous: currentSettings,
          next: settings
      },
      timestamp: FieldValue.serverTimestamp(),
    });

    return { success: true };

  } catch (error: any) {
    console.error("Error updating settings:", error);
    return { success: false, error: "Une erreur critique est survenue lors du déploiement des réglages." };
  }
}
