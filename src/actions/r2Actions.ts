'use server';

/**
 * @fileOverview Actions serveur pour la gestion sécurisée de Cloudflare R2.
 * Permet de générer des URLs signées pour les contenus privés.
 */

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";
import { getAdminDb } from "@/firebase/admin";

/**
 * Génère une URL signée pour accéder à un contenu privé sur R2 (ex: Vidéo de cours).
 * Vérifie l'éligibilité de l'utilisateur (achat effectué).
 */
export async function getPrivateR2Url(key: string, userId: string, courseId?: string) {
  try {
    const db = getAdminDb();

    // 1. Vérification des droits d'accès si un courseId est fourni
    if (courseId) {
      const enrollmentSnap = await db.collection('enrollments').doc(`${userId}_${courseId}`).get();
      if (!enrollmentSnap.exists || enrollmentSnap.data()?.status !== 'active') {
        throw new Error("UNAUTHORIZED: Accès au cours non validé.");
      }
    }

    // 2. Génération de l'URL signée (valide 1 heure)
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(r2Client, command, { expiresIn: 3600 });

    return { success: true, url };
  } catch (error: any) {
    console.error("[R2_SIGNED_URL_ERROR]:", error.message);
    return { success: false, error: error.message };
  }
}
