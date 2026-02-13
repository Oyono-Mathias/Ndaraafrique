'use server';

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
    const batch = db.batch();
    
    const settingsRef = db.collection('settings').doc('global');
    batch.set(settingsRef, settings, { merge: true });

    const auditLogRef = db.collection('admin_audit_logs').doc();
    batch.set(auditLogRef, {
      adminId,
      eventType: 'settings.update',
      target: { id: 'global', type: 'settings' },
      details: `Global settings were updated by admin ${adminId}.`,
      timestamp: FieldValue.serverTimestamp(),
    });

    await batch.commit();
    return { success: true };

  } catch (error: any) {
    console.error("Error updating global settings:", error);
    return { success: false, error: "Une erreur est survenue lors de la sauvegarde : " + (error.message || "Base de données non connectée") };
  }
}
