import { S3Client } from "@aws-sdk/client-s3";

/**
 * @fileOverview Client S3-compatible pour Cloudflare R2.
 * Piloté par les variables d'environnement de production Ndara.
 * ✅ OPTIMISÉ : Support de l'endpoint direct et du path style.
 */

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_ENDPOINT = process.env.R2_ENDPOINT; // https://[ACCOUNT_ID].r2.cloudflarestorage.com

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "ndara-storage";
export const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || ""; // Optionnel : pour les fichiers publics via domaine personnalisé

export const r2Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT || "",
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || "",
    secretAccessKey: R2_SECRET_ACCESS_KEY || "",
  },
  // Recommandé pour R2 pour éviter les erreurs de résolution DNS de bucket
  forcePathStyle: true,
});
