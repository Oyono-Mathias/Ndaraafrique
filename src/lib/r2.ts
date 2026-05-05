import { S3Client } from "@aws-sdk/client-s3";

/**
 * @fileOverview Client S3-compatible pour Cloudflare R2.
 * Piloté par les variables d'environnement pour une flexibilité maximale.
 */

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "ndara-storage";
export const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || "";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || "",
    secretAccessKey: R2_SECRET_ACCESS_KEY || "",
  },
});
