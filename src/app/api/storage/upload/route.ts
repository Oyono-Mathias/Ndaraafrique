import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import * as admin from 'firebase-admin';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_DOMAIN } from "@/lib/r2";

/**
 * @fileOverview Route API pour téléverser vers une architecture hybride.
 * ✅ FIREBASE : Pour les avatars et documents personnels (Sécurité).
 * ✅ CLOUDFLARE R2 : Pour les contenus lourds et assets (Performance & Pas de frais d'egress).
 */

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'general';
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json({ error: "Fichier ou identifiant manquant." }, { status: 400 });
    }

    const db = getAdminDb();
    const [userDoc, settingsSnap] = await Promise.all([
        db.collection('users').doc(userId).get(),
        db.collection('settings').doc('global').get()
    ]);

    if (!userDoc.exists) {
      return NextResponse.json({ error: "Utilisateur non authentifié." }, { status: 403 });
    }

    const settings = settingsSnap.data();
    const maxMb = settings?.storage?.maxFileSizeMb || 50;
    const maxBytes = maxMb * 1024 * 1024;

    if (file.size > maxBytes) {
        return NextResponse.json({ 
            error: `Le fichier est trop lourd. Limite autorisée : ${maxMb} MB.` 
        }, { status: 413 });
    }

    const safeFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // 🛡️ LOGIQUE HYBRIDE : Firebase pour les avatars et documents ID
    const useFirebase = folder === 'avatars' || folder === 'identity';

    if (useFirebase) {
        const bucket = admin.storage().bucket();
        const firebasePath = `${folder}/${userId}/${safeFileName}`;
        const firebaseFile = bucket.file(firebasePath);

        await firebaseFile.save(fileBuffer, {
            metadata: {
                contentType: file.type,
                owner: userId
            }
        });

        await firebaseFile.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${firebasePath}`;

        return NextResponse.json({ 
            success: true, 
            url: publicUrl,
            provider: 'firebase'
        });
    }

    // ⚡ NOUVEAU : Cloudflare R2 pour les contenus lourds (Courses, Lectures, Assets)
    const r2Path = `${folder}/${userId}/${safeFileName}`;
    
    try {
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: r2Path,
            Body: fileBuffer,
            ContentType: file.type,
        });

        await r2Client.send(command);

        // URL publique via domaine personnalisé R2 (si configuré)
        const publicUrl = R2_PUBLIC_DOMAIN 
            ? `https://${R2_PUBLIC_DOMAIN}/${r2Path}`
            : `https://${R2_BUCKET_NAME}.r2.cloudflarestorage.com/${r2Path}`;

        return NextResponse.json({ 
            success: true, 
            url: publicUrl,
            fileName: safeFileName,
            provider: 'r2'
        });
    } catch (r2Error: any) {
        console.error("R2_UPLOAD_ERROR:", r2Error.message);
        return NextResponse.json({ error: "Échec du téléversement vers Cloudflare R2." }, { status: 500 });
    }

  } catch (error: any) {
    console.error("API_STORAGE_FATAL:", error.message);
    return NextResponse.json({ error: "Erreur interne lors du traitement." }, { status: 500 });
  }
}
