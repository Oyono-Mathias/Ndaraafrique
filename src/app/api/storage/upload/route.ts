import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';

/**
 * @fileOverview Route API pour téléverser vers Bunny Storage Zone (ndara-assets).
 * ✅ SÉCURITÉ : Vérification de la taille maximale définie dans Admin Settings.
 */

const STORAGE_ZONE_NAME = process.env.BUNNY_STORAGE_ZONE_NAME || "ndara-assets";
const STORAGE_PASSWORD = process.env.BUNNY_STORAGE_PASSWORD;
const PULL_ZONE_URL = process.env.BUNNY_PULL_ZONE_URL || "https://ndara-assets.b-cdn.net";

export async function POST(req: Request) {
  try {
    if (!STORAGE_PASSWORD) {
      console.error("BUNNY_STORAGE_PASSWORD_MISSING");
      return NextResponse.json({ error: "Stockage non configuré sur le serveur." }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'general';
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json({ error: "Fichier ou identifiant manquant." }, { status: 400 });
    }

    // 1. Charger les réglages de taille max
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

    // 2. Préparation du transfert Bunny
    const safeFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const bunnyPath = `${folder}/${userId}/${safeFileName}`;
    const uploadUrl = `https://storage.bunnycdn.com/${STORAGE_ZONE_NAME}/${bunnyPath}`;
    const fileBuffer = await file.arrayBuffer();

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': STORAGE_PASSWORD,
        'Content-Type': 'application/octet-stream',
      },
      body: Buffer.from(fileBuffer),
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Erreur CDN Bunny (${response.status}).` }, { status: response.status });
    }

    return NextResponse.json({ 
      success: true, 
      url: `${PULL_ZONE_URL}/${bunnyPath}`,
      fileName: safeFileName 
    });

  } catch (error: any) {
    console.error("API_STORAGE_FATAL:", error.message);
    return NextResponse.json({ error: "Erreur interne lors du traitement." }, { status: 500 });
  }
}
