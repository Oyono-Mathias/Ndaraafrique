
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';

/**
 * @fileOverview Route API pour streamer une vidéo de Google Drive vers Bunny Stream.
 * Pipeline direct sans stockage local.
 */

const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;

export async function POST(req: Request) {
  try {
    if (!BUNNY_API_KEY || !BUNNY_LIBRARY_ID) {
      return NextResponse.json({ error: "Configuration Bunny manquante." }, { status: 500 });
    }

    const { fileId, accessToken, instructorId, title } = await req.json();

    if (!fileId || !accessToken || !instructorId) {
      return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
    }

    // 1. Vérification des droits de l'instructeur
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(instructorId).get();
    if (!userDoc.exists || (userDoc.data()?.role !== 'instructor' && userDoc.data()?.role !== 'admin')) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    // 2. Création de l'entrée vidéo chez Bunny
    const createUrl = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`;
    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({ title: title || "Import Google Drive" }),
    });

    if (!createRes.ok) {
      const errorMsg = await createRes.text();
      throw new Error(`Bunny Create Error: ${errorMsg}`);
    }

    const { guid } = await createRes.json();

    // 3. Récupération du flux depuis Google Drive
    const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!driveRes.ok || !driveRes.body) {
      throw new Error("Impossible de lire le fichier sur Google Drive.");
    }

    // 4. Transfert (Streaming) vers Bunny
    const uploadUrl = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${guid}`;
    
    // On utilise fetch avec le body driveRes.body pour un piping direct
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'application/octet-stream',
      },
      body: driveRes.body,
      // @ts-ignore - duplex est requis pour le streaming body en Node
      duplex: 'half',
    });

    if (!uploadRes.ok) {
      const errorMsg = await uploadRes.text();
      throw new Error(`Bunny Upload Error: ${errorMsg}`);
    }

    return NextResponse.json({ success: true, videoId: guid });

  } catch (error: any) {
    console.error("DRIVE_IMPORT_FATAL:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
