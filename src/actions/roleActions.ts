
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
  try { if (!adminDb) {
              throw new Error("Firebase Admin SDK non initialisé");
                  }

   const batch = adminDb.batch(); // Maintenant TypeScript sait que ce n'est pas null
                      // ... suite du code

    
    // 1. Update the role document
    const roleRef = adminDb.collection('roles').doc(roleId);
    batch.update(roleRef, { permissions });

    // 2. Log the action to the audit log
    const auditLogRef = adminDb.collection('admin_audit_logs').doc();
    batch.set(auditLogRef, {
      adminId,
      eventType: 'role.permissions.update',
      target: { id: roleId, type: 'role' },
      details: `Permissions pour le rôle '${roleId}' ont été mises à jour.`,
      timestamp: FieldValue.serverTimestamp(),
    });

    await batch.commit();
    return { success: true };

  } catch (error: any) {
    console.error("Error updating role permissions:", error);
    return { success: false, error: "Une erreur est survenue." };
  }
}
