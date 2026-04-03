'use server';

/**
 * @fileOverview Met à jour les réglages globaux de la plateforme.
 * ✅ TRAÇABILITÉ : Log old vs new values pour l'audit stratégique.
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
    
    // 1. Récupérer l'état actuel avant modification
    const currentSnap = await settingsRef.get();
    const currentSettings = currentSnap.exists ? currentSnap.data() : {};

    // 2. Mise à jour (Fusion)
    await settingsRef.set(settings, { merge: true });

    // 3. Journalisation détaillée de l'audit
    await db.collection('admin_audit_logs').add({
      adminId,
      eventType: 'settings.update',
      target: { id: 'global', type: 'settings' },
      details: `Modification de la configuration infrastructure par l'administrateur.`,
      oldValue: currentSettings,
      newValue: settings,
      timestamp: FieldValue.serverTimestamp(),
    });

    return { success: true };

  } catch (error: any) {
    console.error("Error updating settings:", error);
    return { success: false, error: "Une erreur est survenue lors de la sauvegarde." };
  }
}
