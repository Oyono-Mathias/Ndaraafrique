import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import * as admin from 'firebase-admin';

/**
 * @fileOverview Route API pour téléverser vers une architecture hybride.
 * ✅ FIREBASE : Pour les avatars et documents personnels (Sécurité).
 * ✅ BUNNY : Pour les contenus de cours et ressources (Performance).
 */

const STORAGE_ZONE_NAME = process.env.BUNNY_STORAGE_ZONE_NAME || "ndara-assets";
const STORAGE_PASSWORD = process.env.BUNNY_STORAGE_PASSWORD;
const PULL_ZONE_URL = process.env.BUNNY_PULL_ZONE_URL || "https://ndara-assets.b-cdn.net";

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
        console.log(`[Storage] Redirection vers Firebase Storage pour dossier: ${folder}`);
        const bucket = admin.storage().bucket();
        const firebasePath = `${folder}/${userId}/${safeFileName}`;
        const firebaseFile = bucket.file(firebasePath);

        await firebaseFile.save(fileBuffer, {
            metadata: {
                contentType: file.type,
                owner: userId
            }
        });

        // Rendre le fichier accessible publiquement (ou utiliser des Signed URLs selon besoin)
        await firebaseFile.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${firebasePath}`;

        return NextResponse.json({ 
            success: true, 
            url: publicUrl,
            provider: 'firebase'
        });
    }

    // ⚡ FALLBACK / DEFAULT : Bunny CDN pour le reste
    if (!STORAGE_PASSWORD) {
        return NextResponse.json({ error: "Stockage Bunny non configuré." }, { status: 500 });
    }

    const bunnyPath = `${folder}/${userId}/${safeFileName}`;
    const uploadUrl = `https://storage.bunnycdn.com/${STORAGE_ZONE_NAME}/${bunnyPath}`;

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': STORAGE_PASSWORD,
        'Content-Type': 'application/octet-stream',
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Erreur CDN Bunny (${response.status}).` }, { status: response.status });
    }

    return NextResponse.json({ 
      success: true, 
      url: `${PULL_ZONE_URL}/${bunnyPath}`,
      fileName: safeFileName,
      provider: 'bunny'
    });

  } catch (error: any) {
    console.error("API_STORAGE_FATAL:", error.message);
    return NextResponse.json({ error: "Erreur interne lors du traitement." }, { status: 500 });
  }
}
