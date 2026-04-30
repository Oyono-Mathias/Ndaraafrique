'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { auditCourseQuality } from '@/ai/flows/audit-course-quality';
import type { Course, Settings } from '@/lib/types';

/**
 * 🛡️ Helper interne de sécurité Admin
 */
async function verifyAdminOrThrow(adminId: string) {
    if (!adminId) throw new Error("UNAUTHORIZED");
    const db = getAdminDb();
    const adminDoc = await db.collection('users').doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
        throw new Error("UNAUTHORIZED: Droits d'administrateur requis.");
    }
}

/**
 * 🤖 Soumettre un cours pour revue avec Audit IA Mathias OBLIGATOIRE et BLOQUANT.
 */
export async function submitCourseForReviewAction({
  courseId,
  instructorId,
}: {
  courseId: string;
  instructorId: string;
}) {
  try {
    const db = getAdminDb();
    const courseRef = db.collection('courses').doc(courseId);
    const courseSnap = await courseRef.get();

    if (!courseSnap.exists) return { success: false, error: 'error.course_not_found' };
    const courseData = courseSnap.data() as Course;
    
    if (courseData.instructorId !== instructorId) {
      return { success: false, error: 'error.not_authorized' };
    }

    // 1. Récupérer la structure du cours pour l'audit (Sections + Leçons)
    const sectionsSnap = await courseRef.collection('sections').get();
    const sections = await Promise.all(sectionsSnap.docs.map(async (s) => {
        const lecturesSnap = await s.ref.collection('lectures').get();
        return `${s.data().title} (${lecturesSnap.size} leçons)`;
    }));
    const contentSummary = sections.join(', ') || "Aucun module créé";

    // 2. Lancer l'Audit Qualité Mathias (BARRIÈRE IA)
    const audit = await auditCourseQuality({
        title: courseData.title,
        description: courseData.description,
        category: courseData.category,
        contentSummary
    });

    // 🛑 RÈGLE D'OR : On bloque la soumission si le score est inférieur à 80
    if (!audit.isValid || audit.score < 80) {
        // On enregistre quand même les issues pour que le formateur puisse les voir
        await courseRef.update({
            lastAiAuditScore: audit.score,
            moderationFeedback: `[Audit Mathias IA] : ${audit.mentorComment}`,
            updatedAt: FieldValue.serverTimestamp(),
        });

        return { 
            success: false, 
            error: "QUALITÉ INSUFFISANTE", 
            score: audit.score,
            issues: audit.issues,
            comment: audit.mentorComment
        };
    }

    // 3. Mise à jour vers 'Pending Review' si validé par Mathias
    await courseRef.update({
      status: 'Pending Review',
      isAiVerified: true,
      lastAiAuditScore: audit.score,
      moderationFeedback: FieldValue.delete(), // On nettoie les anciens feedbacks
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true, score: audit.score };
  } catch (error: any) {
    console.error("Submit Review Error:", error);
    return { success: false, error: 'error.generic' };
  }
}

/**
 * Assigner ou changer l'instructeur d'un cours (Action Admin).
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
        await verifyAdminOrThrow(adminId);
        
        const db = getAdminDb();
        const batch = db.batch();
        const courseRef = db.collection('courses').doc(courseId);
        const courseDoc = await courseRef.get();

        if (!courseDoc.exists) return { success: false, error: 'error.course_not_found' };
        
        batch.update(courseRef, {
            instructorId: newInstructorId,
            updatedAt: FieldValue.serverTimestamp(),
        });

        batch.set(db.collection('admin_audit_logs').doc(), {
            adminId,
            eventType: 'course.moderation',
            target: { id: courseId, type: 'course' },
            details: `Le cours "${courseDoc.data()?.title}" a été réattribué à l'expert ${newInstructorId}.`,
            timestamp: FieldValue.serverTimestamp(),
        });

        await batch.commit();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'error.generic' };
    }
}

/**
 * Activer ou désactiver les droits de revente pour un cours.
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
        const settingsSnap = await db.collection('settings').doc('global').get();
        const settings = (settingsSnap.exists ? settingsSnap.data() : {}) as Settings;

        if (available && settings.marketplace?.enableMarketplace === false) {
            return { success: false, error: 'Le marché secondaire est actuellement désactivé.' };
        }

        const courseRef = db.collection('courses').doc(courseId);
        const courseDoc = await courseRef.get();

        if (!courseDoc.exists) return { success: false, error: 'error.course_not_found' };
        
        const data = courseDoc.data() as any;
        const currentOwner = data.ownerId || data.instructorId; 
        
        const userDoc = await db.collection('users').doc(userId).get();
        const isAdmin = userDoc.data()?.role === 'admin';
        
        if (currentOwner !== userId && !isAdmin) {
            return { success: false, error: 'error.not_authorized' };
        }

        if (available) {
            const minPrice = settings.marketplace?.minimumResalePrice || 10000;
            if (price < minPrice) {
                return { success: false, error: `Le prix de revente minimum est de ${minPrice.toLocaleString()} XOF.` };
            }
        }

        await courseRef.update({
            resaleRightsAvailable: available,
            resaleRightsPrice: price,
            updatedAt: FieldValue.serverTimestamp(),
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: 'error.generic' };
    }
}

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
            const settingsRef = db.collection('settings').doc('global');
            const courseRef = db.collection('courses').doc(courseId);
            
            const [settingsSnap, courseDoc] = await Promise.all([
                transaction.get(settingsRef),
                transaction.get(courseRef)
            ]);
            
            if (!courseDoc.exists) throw new Error("error.course_not_found");
            
            const settings = (settingsSnap.exists ? settingsSnap.data() : {}) as Settings;
            const courseData = courseDoc.data() as any;
            
            if (!courseData.resaleRightsAvailable) throw new Error("error.license_not_available");

            const previousOwner = courseData.ownerId || courseData.instructorId;
            const price = courseData.resaleRightsPrice || 0;

            const commissionRate = settings.marketplace?.resaleCommissionPercent || 20;
            const platformRevenue = (price * commissionRate) / 100;
            const instructorRevenue = price - platformRevenue;

            transaction.update(courseRef, {
                ownerId: buyerId,
                instructorId: buyerId,
                resaleRightsAvailable: false,
                buyoutStatus: 'none',
                rightsChain: FieldValue.arrayUnion(previousOwner),
                updatedAt: FieldValue.serverTimestamp(),
            });

            const historyRef = courseRef.collection('license_history').doc();
            transaction.set(historyRef, {
                fromOwnerId: previousOwner,
                toOwnerId: buyerId,
                price: price,
                commission: platformRevenue,
                netToSeller: instructorRevenue,
                transactionId: transactionId,
                timestamp: FieldValue.serverTimestamp()
            });

            if (previousOwner !== 'NDARA_OFFICIAL') {
                transaction.update(db.collection('users').doc(previousOwner), {
                    balance: FieldValue.increment(instructorRevenue)
                });
            }
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'error.generic' };
    }
}

export async function requestCourseBuyoutAction({
  courseId,
  instructorId,
  requestedPrice,
}: {
  courseId: string;
  instructorId: string;
  requestedPrice: number;
}) {
  try {
    const db = getAdminDb();
    const settingsSnap = await db.collection('settings').doc('global').get();
    const settings = (settingsSnap.exists ? settingsSnap.data() : {}) as Settings;

    if (settings.marketplace?.allowCourseBuyout === false) {
        return { success: false, error: 'Le programme de rachat Ndara est suspendu.' };
    }

    const courseRef = db.collection('courses').doc(courseId);
    const courseDoc = await courseRef.get();
    if (!courseDoc.exists) return { success: false, error: 'error.course_not_found' };
    
    const courseData = courseDoc.data() as any;
    if (courseData.instructorId !== instructorId) return { success: false, error: 'error.not_authorized' };

    await courseRef.update({
      buyoutStatus: 'requested',
      buyoutPrice: requestedPrice,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'error.generic' };
  }
}

export async function approveCourseBuyoutAction({
  courseId,
  adminId,
}: {
  courseId: string;
  adminId: string;
}) {
  try {
    verifyAdminOrThrow(adminId);
    const db = getAdminDb();
    const courseRef = db.collection('courses').doc(courseId);
    const courseDoc = await courseRef.get();

    if (!courseDoc.exists) return { success: false, error: 'error.course_not_found' };
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

    await db.collection('users').doc(originalOwner).update({
        balance: FieldValue.increment(data?.buyoutPrice || 0)
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'error.generic' };
  }
}

/**
 * Sanctionner un instructeur suite à une violation des conditions de rachat.
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
        await verifyAdminOrThrow(adminId);
        const db = getAdminDb();
        
        await db.collection('users').doc(userId).update({
            buyoutSanctions: {
                isSanctioned: true,
                reason,
                date: FieldValue.serverTimestamp()
            },
            updatedAt: FieldValue.serverTimestamp()
        });

        await db.collection('admin_audit_logs').add({
            adminId,
            eventType: 'user.sanction.buyout',
            target: { id: userId, type: 'user' },
            details: `Sanction rachat appliquée. Raison: ${reason}`,
            timestamp: FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
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
}) {
  try {
    verifyAdminOrThrow(adminId);
    const db = getAdminDb();
    const courseRef = db.collection('courses').doc(courseId);
    await courseRef.update({ status });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'error.generic' };
  }
}

export async function deleteCourseByAdmin({
  courseId,
  adminId,
}: {
  courseId: string;
  adminId: string;
}) {
  try {
    verifyAdminOrThrow(adminId);
    const db = getAdminDb();
    const courseRef = db.collection('courses').doc(courseId);
    await courseRef.delete();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'error.generic' };
  }
}
