import { getAdminDb } from '@/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type { Course, NdaraUser, Enrollment, RecommendedCourseItem } from '@/lib/types';

/**
 * @fileOverview Service de recommandation Ndara Afrique.
 * Analyse les intérêts des utilisateurs et calcule les scores des formations.
 */

/**
 * Calcule le score d'un cours pour un utilisateur donné selon la formule CEO.
 * score = (rating * 0.4) + (studentsCount * 0.2) + (similarityToUserInterest * 0.2) + (recentPopularity * 0.2)
 */
function calculateCourseScore(
    course: Course, 
    preferredCategories: string[],
    maxStudents: number
): number {
    const ratingWeight = 0.4;
    const popularityWeight = 0.2;
    const similarityWeight = 0.2;
    const freshnessWeight = 0.2;

    // 1. Rating (Normalisé 0-5)
    const ratingScore = (course.rating || 0) * ratingWeight;

    // 2. Students Count (Normalisé par rapport au maximum du catalogue)
    const popularityScore = maxStudents > 0 
        ? ((course.participantsCount || 0) / maxStudents) * 5 * popularityWeight 
        : 0;

    // 3. Similarity to User Interest (1 si catégorie match, sinon 0)
    const isPreferredCategory = preferredCategories.includes(course.category);
    const similarityScore = (isPreferredCategory ? 5 : 0) * similarityWeight;

    // 4. Recent Popularity (Proxy via la date de création : cours de moins de 30 jours)
    const isNew = course.createdAt 
        ? (Date.now() - (course.createdAt as any).toDate().getTime()) < 30 * 86400000 
        : false;
    const freshnessScore = (isNew ? 5 : 0) * freshnessWeight;

    // Retourne un score final sur une base 100 (optionnel, ici on garde la base pondérée)
    return (ratingScore + popularityScore + similarityScore + freshnessScore) * 20;
}

/**
 * Génère les recommandations pour un utilisateur spécifique.
 */
export async function generateUserRecommendations(userId: string) {
    const db = getAdminDb();

    // 1. Récupérer les données utilisateur et ses inscriptions
    const [userDoc, enrollmentsSnap, allCoursesSnap] = await Promise.all([
        db.collection('users').doc(userId).get(),
        db.collection('enrollments').where('studentId', '==', userId).get(),
        db.collection('courses').where('status', '==', 'Published').get()
    ]);

    if (!userDoc.exists) return null;
    const userData = userDoc.data() as NdaraUser;
    const enrolledCourseIds = enrollmentsSnap.docs.map(d => d.data().courseId);

    // 2. Détecter les catégories préférées
    const enrolledCategories = enrollmentsSnap.docs.map(d => d.data().category).filter(Boolean);
    const preferredCategories = [...new Set([
        ...enrolledCategories,
        userData.careerGoals?.interestDomain
    ])].filter(Boolean) as string[];

    // 3. Préparer les cours pour le scoring (exclure ceux déjà possédés)
    const allCourses = allCoursesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
    const candidateCourses = allCourses.filter(c => !enrolledCourseIds.includes(c.id));
    
    const maxStudents = Math.max(...allCourses.map(c => c.participantsCount || 0), 1);

    // 4. Calculer les scores et trier
    const recommendations: RecommendedCourseItem[] = candidateCourses
        .map(course => ({
            courseId: course.id,
            title: course.title,
            coverImage: course.imageUrl || '',
            instructorId: course.instructorId,
            price: course.price,
            score: calculateCourseScore(course, preferredCategories, maxStudents)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

    // 5. Sauvegarder dans Firestore
    await db.collection('recommended_courses').doc(userId).set({
        userId,
        courses: recommendations,
        updatedAt: FieldValue.serverTimestamp()
    });

    return recommendations;
}

/**
 * Tâche globale de mise à jour pour TOUS les utilisateurs actifs.
 */
export async function updateAllRecommendations() {
    const db = getAdminDb();
    const activeUsersSnap = await db.collection('users')
        .where('status', '==', 'active')
        .limit(100) // Limitation pour le prototype
        .get();

    const tasks = activeUsersSnap.docs.map(doc => generateUserRecommendations(doc.id));
    await Promise.all(tasks);
    
    return activeUsersSnap.size;
}
