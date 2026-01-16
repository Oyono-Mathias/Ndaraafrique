
'use server';

import { adminDb } from '@/firebase/admin';
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
    const batch = adminDb.batch();
    
    // 1. Update the settings document
    const settingsRef = adminDb.collection('settings').doc('global');
    batch.set(settingsRef, settings, { merge: true });

    // 2. Log the action to the audit log
    const auditLogRef = adminDb.collection('admin_audit_logs').doc();
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
    return { success: false, error: "Une erreur est survenue lors de la sauvegarde des paramètres." };
  }
}
