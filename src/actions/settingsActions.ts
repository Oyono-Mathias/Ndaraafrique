'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Settings } from '@/lib/types';

interface UpdateSettingsParams {
  settings: Partial<Settings>;
  adminId: string;
}

/**
 * @fileOverview Met à jour les réglages globaux de la plateforme.
 * Les réglages sont organisés en sections (general, commercial, platform, etc.)
 */
export async function updateGlobalSettings({
  settings,
  adminId
}: UpdateSettingsParams): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminDb();
    const batch = db.batch();
    
    const settingsRef = db.collection('settings').doc('global');
    
    // On fusionne les réglages existants avec les nouveaux
    batch.set(settingsRef, settings, { merge: true });

    // Journalisation de l'audit stratégique
    const auditLogRef = db.collection('admin_audit_logs').doc();
    batch.set(auditLogRef, {
      adminId,
      eventType: 'settings.update',
      target: { id: 'global', type: 'settings' },
      details: `La configuration globale du système a été modifiée par l'administrateur.`,
      timestamp: FieldValue.serverTimestamp(),
    });

    await batch.commit();
    return { success: true };

  } catch (error: any) {
    console.error("Error updating settings:", error);
    return { success: false, error: "Une erreur est survenue lors de la sauvegarde : " + (error.message || "Erreur base de données") };
  }
}
