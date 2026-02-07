'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * @fileOverview Actions serveur pour la gestion fine des permissions par rôle.
 */

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
    const db = getAdminDb();
    const batch = db.batch();

    // 1. Préparation de la mise à jour granulaire (dot notation)
    // On évite d'écraser tout l'objet 'permissions'
    const updateData: { [key: string]: any } = {};
    Object.entries(permissions).forEach(([key, value]) => {
        updateData[`permissions.${key}`] = value;
    });

    const roleRef = db.collection('roles').doc(roleId);
    batch.update(roleRef, updateData);

    // 2. Journalisation dans l'audit admin
    const auditLogRef = db.collection('admin_audit_logs').doc();
    const permissionKeys = Object.keys(permissions).join(', ');
    
    batch.set(auditLogRef, {
      adminId,
      eventType: 'role.permissions.update',
      target: { id: roleId, type: 'role' },
      details: `Permissions [${permissionKeys}] pour le rôle '${roleId}' mises à jour.`,
      timestamp: FieldValue.serverTimestamp(),
    });

    await batch.commit();
    return { success: true };

  } catch (error: any) {
    console.error("Error updating role permissions:", error);
    return { success: false, error: error.message || "Une erreur est survenue lors de la mise à jour." };
  }
}
