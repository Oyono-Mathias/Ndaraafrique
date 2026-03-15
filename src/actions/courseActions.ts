'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { Course, NdaraUser, Settings } from '@/lib/types';

/**
 * Assigner ou changer l'instructeur d'un cours (Action Admin).
 * Permet à Mathias de donner le contrôle pédagogique d'un cours à un expert.
 */
export async function assignInstructorToCourseAction({
    courseId,
    newInstructorId,
    adminId
}: {
    courseId: string;
    newInstructorId: string;
    adminId: string;
}) {
    try {
        const db = getAdminDb();
        const batch = db.batch();
        const courseRef = db.collection('courses').doc(courseId);
        const courseDoc = await courseRef.get();

        if (!courseDoc.exists) return { success: false, error: 'Cours introuvable.' };
        
        const oldInstructorId = courseDoc.data()?.instructorId;

        // Mise à jour de l'instructeur (Pédagogie)
        batch.update(courseRef, {
            instructorId: newInstructorId,
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Journalisation dans l'audit stratégique
        batch.set(db.collection('admin_audit_logs').doc(), {
            adminId,
            eventType: 'course.moderation',
            target: { id: courseId, type: 'course' },
            details: `Le cours "${courseDoc.data()?.title}" a été réattribué pédagogiquement. Nouvel instructeur: ${newInstructorId} (Ancien: ${oldInstructorId})`,
            timestamp: FieldValue.serverTimestamp(),
        });

        await batch.commit();
        return { success: true };
    } catch (e: any) {
        console.error("ASSIGN_INSTRUCTOR_ERROR:", e);
        return { success: false, error: e.message };
    }
}

/**
 * Activer ou désactiver les droits de revente pour un cours (Action du propriétaire).
 * Vérifie maintenant le prix plancher configuré en admin.
 */
export async function toggleResaleRightsAction({
    courseId,
    price,
    available,
    userId
}: {
    courseId: string;
    price: number;
    available: boolean;
    userId: string;
}) {
    try {
        const db = getAdminDb();
        const courseRef = db.collection('courses').doc(courseId);
        const courseDoc = await courseRef.get();

        if (!courseDoc.exists) return { success: false, error: 'Cours introuvable.' };
        const data = courseDoc.data() as Course;

        // ✅ SÉCURISATION : Vérification des nouveaux rôles (Owner)
        const currentOwner = data.ownerId || data.instructorId; 
        const isAdmin = userId === 'SYSTEM' || (await db.collection('users').doc(userId).get()).data()?.role === 'admin';
        
        if (currentOwner !== userId && !isAdmin) {
            return { success: false, error: 'Seul le propriétaire de la licence peut modifier les droits.' };
        }

        // Vérification du prix minimum si en vente
        if (available) {
            const settingsSnap = await db.collection('settings').doc('global').get();
            const settings = settingsSnap.data() as Settings;
            const minPrice = settings.platform?.market?.minimumLicensePrice || 10000;
            if (price < minPrice) {
                return { success: false, error: `Le prix minimum de revente est de ${minPrice.toLocaleString()} XOF.` };
            }
        }

        await courseRef.update({
            resaleRightsAvailable: available,
            resaleRightsPrice: price,
            // Migration paresseuse des rôles si absents
            creatorId: data.creatorId || data.instructorId,
            ownerId: currentOwner,
            updatedAt: FieldValue.serverTimestamp(),
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Finaliser l'achat des droits de revente (Transaction atomique).
 * ✅ RÉSOLU : Utilisation de runTransaction pour éviter les race conditions.
 */
export async function purchaseResaleRightsAction({
    courseId,
    buyerId,
    transactionId
}: {
    courseId: string;
    buyerId: string;
    transactionId: string;
}): Promise<{ success: boolean; error?: string }> {
    const db = getAdminDb();
    
    try {
        await db.runTransaction(async (transaction) => {
            const courseRef = db.collection('courses').doc(courseId);
            const courseDoc = await transaction.get(courseRef);
            
            if (!courseDoc.exists) throw new Error("Cours introuvable.");
            
            const courseData = courseDoc.data() as Course;
            if (!courseData.resaleRightsAvailable) throw new Error("Cette licence n'est plus disponible.");

            const previousOwner = courseData.ownerId || courseData.instructorId;
            const price = courseData.resaleRightsPrice || 0;

            // 1. Transfert de propriété financier (Owner)
            transaction.update(courseRef, {
                ownerId: buyerId,
                instructorId: buyerId, // On aligne la pédagogie par défaut à l'achat
                resaleRightsAvailable: false,
                buyoutStatus: 'none',
                rightsChain: FieldValue.arrayUnion(previousOwner),
                updatedAt: FieldValue.serverTimestamp(),
            });

            // 2. Création de l'historique de licence
            const historyRef = courseRef.collection('license_history').doc();
            transaction.set(historyRef, {
                fromOwnerId: previousOwner,
                toOwnerId: buyerId,
                price: price,
                transactionId: transactionId,
                timestamp: FieldValue.serverTimestamp()
            });

            // 3. Créditer l'ancien propriétaire (si ce n'est pas Ndara)
            if (previousOwner !== 'NDARA_OFFICIAL') {
                const payoutRef = db.collection('payouts').doc();
                transaction.set(payoutRef, {
                    instructorId: previousOwner,
                    amount: price,
                    status: 'valide',
                    method: 'Vente Licence Secondaire',
                    date: FieldValue.serverTimestamp()
                });
            }
        });

        return { success: true };
    } catch (e: any) {
        console.error("TRANSACTION_FAILED:", e.message);
        return { success: false, error: e.message };
    }
}

/**
 * Soumettre une demande de rachat de cours par la plateforme.
 */
export async function requestCourseBuyoutAction({
  courseId,
  instructorId,
  requestedPrice,
}: {
  courseId: string;
  instructorId: string;
  requestedPrice: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminDb();
    
    // 0. Vérification de l'activation globale
    const settingsSnap = await db.collection('settings').doc('global').get();
    const settingsData = settingsSnap.data() as Settings;
    if (settingsData?.platform?.allowCourseBuyout === false) {
        return { success: false, error: 'Le programme de rachat est actuellement suspendu.' };
    }

    const courseRef = db.collection('courses').doc(courseId);
    const courseDoc = await courseRef.get();
    if (!courseDoc.exists) return { success: false, error: 'Cours introuvable.' };
    
    const courseData = courseDoc.data() as Course;
    const currentOwner = courseData.ownerId || courseData.instructorId;

    if (currentOwner !== instructorId) return { success: false, error: 'Seul le propriétaire peut vendre ce cours.' };
    if (courseData.status !== 'Published') return { success: false, error: 'Seule une formation publiée peut être rachetée.' };

    await courseRef.update({
      buyoutStatus: 'requested',
      buyoutPrice: requestedPrice,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Approuver le rachat d'un cours (Action Admin).
 */
export async function approveCourseBuyoutAction({
  courseId,
  adminId,
}: {
  courseId: string;
  adminId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminDb();
    const courseRef = db.collection('courses').doc(courseId);
    const courseDoc = await courseRef.get();

    if (!courseDoc.exists) return { success: false, error: 'Cours introuvable.' };
    const data = courseDoc.data();
    
    const originalOwner = data?.ownerId || data?.instructorId;

    await courseRef.update({
      buyoutStatus: 'approved',
      isPlatformOwned: true,
      ownerId: 'NDARA_OFFICIAL',
      instructorId: 'NDARA_OFFICIAL',
      status: 'Published',
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Enregistrer le gain pour l'ancien propriétaire
    await db.collection('payouts').add({
        instructorId: originalOwner,
        amount: data?.buyoutPrice || 0,
        status: 'valide',
        method: 'Vente Directe Plateau',
        date: FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Sanctionner un formateur pour violation des règles de rachat.
 */
export async function sanctionInstructorForBuyoutViolation({
    userId,
    adminId,
    reason
}: {
    userId: string;
    adminId: string;
    reason: string;
}) {
    try {
        const db = getAdminDb();
        const userRef = db.collection('users').doc(userId);
        
        await userRef.update({
            'buyoutSanctions.isSanctioned': true,
            'buyoutSanctions.reason': reason,
            'buyoutSanctions.date': FieldValue.serverTimestamp(),
            status: 'suspended'
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function submitCourseForReviewAction({
  courseId,
  instructorId,
}: {
  courseId: string;
  instructorId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminDb();
    const courseRef = db.collection('courses').doc(courseId);
    const courseDoc = await courseRef.get();

    if (!courseDoc.exists) return { success: false, error: 'Cours introuvable.' };
    
    // On vérifie le créateur ou l'instructeur actuel
    const canSubmit = courseDoc.data()?.creatorId === instructorId || courseDoc.data()?.instructorId === instructorId;
    if (!canSubmit) {
      return { success: false, error: 'Vous n\'êtes pas autorisé à modifier ce cours.' };
    }

    await courseRef.update({
      status: 'Pending Review',
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateCourseStatusByAdmin({
  courseId,
  status,
  adminId,
}: {
  courseId: string;
  status: Course['status'];
  adminId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminDb();
    const courseRef = db.collection('courses').doc(courseId);
    await courseRef.update({ status });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteCourseByAdmin({
  courseId,
  adminId,
}: {
  courseId: string;
  adminId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminDb();
    const courseRef = db.collection('courses').doc(courseId);
    await courseRef.delete();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'Une erreur est survenue lors de la suppression.' };
  }
}