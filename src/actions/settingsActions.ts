'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Settings } from '@/lib/types';

interface UpdateSettingsParams {
  settings: Partial<Settings>;
  adminId: string;
  targetDoc?: string; // Permet de cibler settings/general, settings/platform, etc.
}

export async function updateGlobalSettings({
  settings,
  adminId,
  targetDoc = 'global'
}: UpdateSettingsParams): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminDb();
    const batch = db.batch();
    
    // Mise à jour du document cible (ex: settings/general)
    const settingsRef = db.collection('settings').doc(targetDoc);
    batch.set(settingsRef, settings, { merge: true });

    // Conserver aussi une copie dans 'global' pour la compatibilité descendante du reste de l'app
    if (targetDoc !== 'global') {
        const globalRef = db.collection('settings').doc('global');
        batch.set(globalRef, settings, { merge: true });
    }

    const auditLogRef = db.collection('admin_audit_logs').doc();
    batch.set(auditLogRef, {
      adminId,
      eventType: 'settings.update',
      target: { id: targetDoc, type: 'settings' },
      details: `Settings for '${targetDoc}' were updated by admin ${adminId}.`,
      timestamp: FieldValue.serverTimestamp(),
    });

    await batch.commit();
    return { success: true };

  } catch (error: any) {
    console.error("Error updating settings:", error);
    return { success: false, error: "Une erreur est survenue lors de la sauvegarde : " + (error.message || "Base de données non connectée") };
  }
}
