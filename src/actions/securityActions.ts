'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

interface ResolveSecurityItemParams {
  itemId: string;
  itemType: 'suspicious_payment' | 'failed_payment' | 'suspicious_login';
  adminId: string;
}

export async function resolveSecurityItem(params: ResolveSecurityItemParams): Promise<{ success: boolean; error?: string }> {
  const { itemId, itemType, adminId } = params;

  try {
    const db = getAdminDb();
    const batch = db.batch();
    let targetRef;
    let updateData;
    let targetEntity = '';

    if (itemType === 'suspicious_payment') {
      targetRef = db.collection('payments').doc(itemId);
      updateData = { 'fraudReview.reviewed': true };
      targetEntity = `Paiement ${itemId}`;
    } else if (itemType === 'suspicious_login') {
      targetRef = db.collection('security_logs').doc(itemId);
      updateData = { status: 'resolved' };
      targetEntity = `Alerte de connexion ${itemId}`;
    } else if (itemType === 'failed_payment') {
        targetRef = db.collection('payments').doc(itemId);
        targetEntity = `Échec de paiement ${itemId}`;
    } else {
      return { success: false, error: 'Type d\'alerte invalide.' };
    }

    if (targetRef && updateData) {
      batch.update(targetRef, updateData);
    }
    
    const securityLogRef = db.collection('security_logs').doc();
    batch.set(securityLogRef, {
      eventType: 'alert_resolved',
      userId: adminId,
      targetId: itemId,
      details: `L'administrateur ${adminId} a marqué l'alerte '${targetEntity}' comme résolue.`,
      timestamp: FieldValue.serverTimestamp(),
      status: 'resolved'
    });
    
    const auditLogRef = db.collection('admin_audit_logs').doc();
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
