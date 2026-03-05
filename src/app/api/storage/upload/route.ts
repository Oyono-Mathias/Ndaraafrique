import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';

/**
 * @fileOverview Route API pour téléverser n'importe quel fichier vers Bunny Storage Zone.
 * Utilisé pour les avatars (JPG/PNG), les PDF de cours et les ressources.
 */

const STORAGE_ZONE_NAME = process.env.BUNNY_STORAGE_ZONE_NAME || "ndara-afrique-storage";
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

    // Sécurisation : Vérifier que l'utilisateur existe
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "Utilisateur non autorisé." }, { status: 403 });
    }

    // Nettoyage du nom de fichier pour éviter les erreurs d'URL
    const safeFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const bunnyPath = `${folder}/${userId}/${safeFileName}`;
    
    // URL Bunny Storage : https://storage.bunnycdn.com/{storageZoneName}/{path}
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
      const errorText = await response.text();
      console.error("BUNNY_STORAGE_UPLOAD_ERROR:", response.status, errorText);
      return NextResponse.json({ error: "Échec du transfert vers Bunny Storage." }, { status: response.status });
    }

    // URL Publique via la Pull Zone
    const publicUrl = `${PULL_ZONE_URL}/${bunnyPath}`;

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      fileName: safeFileName 
    });

  } catch (error: any) {
    console.error("API_STORAGE_FATAL:", error.message);
    return NextResponse.json({ error: "Une erreur interne est survenue." }, { status: 500 });
  }
}
