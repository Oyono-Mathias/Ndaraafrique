
'use server';

import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function updateRolePermissions({
  roleId,
  permissions,
  adminId
}: {
  roleId: string,
  permissions: { [key: string]: boolean },
  adminId: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const batch = adminDb.batch();
    
    // 1. Update the role document
    const roleRef = adminDb.collection('roles').doc(roleId);
    batch.update(roleRef, { permissions });

    // 2. Log the action to the audit log
    const auditLogRef = adminDb.collection('admin_audit_logs').doc();
    batch.set(auditLogRef, {
      adminId,
      eventType: 'role.permissions.update',
      target: { id: roleId, type: 'role' },
      details: `Permissions for role '${roleId}' were updated by admin ${adminId}.`,
      timestamp: FieldValue.serverTimestamp(),
    });

    await batch.commit();
    return { success: true };

  } catch (error: any) {
    console.error("Error updating role permissions:", error);
    return { success: false, error: "Une erreur est survenue." };
  }
}
