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

/**
 * Initialise les rôles par défaut dans la collection 'roles'
 */
export async function initializeDefaultRoles(adminId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminDb();
    const batch = db.batch();

    const roles = {
      admin: {
        name: 'admin',
        permissions: {
          'admin.access': true,
          'admin.courses.manage': true,
          'admin.reviews.manage': true,
          'admin.settings.manage': true,
          'admin.users.list': true,
          'admin.users.read': true,
          'admin.users.manage': true,
          'admin.instructors.review': true,
          'admin.moderation.courses': true,
          'admin.payments.list': true,
          'admin.payouts.manage': true,
          'admin.marketing.manage': true,
          'admin.support.manage': true,
          'admin.security.read': true,
          'admin.logs.read': true,
          'admin.roles.manage': true,
        }
      },
      instructor: {
        name: 'instructor',
        permissions: {
          'admin.access': false,
          'admin.courses.manage': false,
        }
      },
      student: {
        name: 'student',
        permissions: {
          'admin.access': false,
        }
      }
    };

    Object.entries(roles).forEach(([id, data]) => {
      const ref = db.collection('roles').doc(id);
      batch.set(ref, data);
    });

    const auditLogRef = db.collection('admin_audit_logs').doc();
    batch.set(auditLogRef, {
      adminId,
      eventType: 'role.permissions.update',
      target: { id: 'all', type: 'role' },
      details: `Initialisation des rôles par défaut par l'admin ${adminId}.`,
      timestamp: FieldValue.serverTimestamp(),
    });

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("Error initializing roles:", error);
    
    // Rendre l'erreur plus explicite pour l'utilisateur
    let userFriendlyError = error.message;
    if (error.message.includes('refresh access token')) {
        userFriendlyError = "Erreur d'authentification serveur. La clé de compte de service Firebase est invalide ou a expiré. Veuillez vérifier vos variables d'environnement.";
    }
    
    return { success: false, error: userFriendlyError };
  }
}
