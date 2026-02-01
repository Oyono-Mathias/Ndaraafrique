
'use server';

import { adminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

interface ResolveSecurityItemParams {
  itemId: string;
  itemType: 'suspicious_payment' | 'failed_payment' | 'suspicious_login';
  adminId: string;
}

export async function resolveSecurityItem(params: ResolveSecurityItemParams): Promise<{ success: boolean; error?: string }> {
  const { itemId, itemType, adminId } = params;

  if (!adminDb) { throw new Error("Firebase Admin SDK non initialisé");
}
  try {
    const batch = adminDb.batch();
    let targetRef;
    let updateData;
    let targetEntity = '';

    if (itemType === 'suspicious_payment') {
      targetRef = adminDb.collection('payments').doc(itemId);
      updateData = { 'fraudReview.reviewed': true };
      targetEntity = `Paiement ${itemId}`;
    } else if (itemType === 'suspicious_login') {
      targetRef = adminDb.collection('security_logs').doc(itemId);
      updateData = { status: 'resolved' };
      targetEntity = `Alerte de connexion ${itemId}`;
    } else if (itemType === 'failed_payment') {
        targetRef = adminDb.collection('payments').doc(itemId);
        // Maybe in future we add a 'reviewed' field for failed payments too. For now, no update is needed.
        // We just log that it was acknowledged.
        targetEntity = `Échec de paiement ${itemId}`;
    } else {
      return { success: false, error: 'Type d\'alerte invalide.' };
    }

    if (targetRef && updateData) {
      batch.update(targetRef, updateData);
    }
    
    // Log the resolution action to both security_logs and admin_audit_logs
    const securityLogRef = adminDb.collection('security_logs').doc();
    batch.set(securityLogRef, {
      eventType: 'alert_resolved',
      userId: adminId,
      targetId: itemId,
      details: `L'administrateur ${adminId} a marqué l'alerte '${targetEntity}' comme résolue.`,
      timestamp: FieldValue.serverTimestamp(),
      status: 'resolved' // The log of a resolution is by definition resolved
    });
    
    const auditLogRef = adminDb.collection('admin_audit_logs').doc();
    batch.set(auditLogRef, {
      adminId: adminId,
      eventType: 'security.resolve',
      target: { id: itemId, type: itemType as 'payment' | 'security_log' },
      details: `Admin ${adminId} resolved security item '${targetEntity}'.`,
      timestamp: FieldValue.serverTimestamp(),
    });


    await batch.commit();

    return { success: true };
  } catch (error: any) {
    console.error("Error resolving security item:", error);
    return { success: false, error: "Une erreur est survenue lors de la résolution de l'alerte." };
  }
}
