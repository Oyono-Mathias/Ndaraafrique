import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';

/**
 * @fileOverview Route API sécurisée pour le téléversement de vidéos vers Bunny Stream.
 * Utilise les identifiants spécifiques fournis (Library: 607753).
 */

const BUNNY_API_KEY = process.env.BUNNY_API_KEY || "bbdd6d9f-1b73-4228-9ba800bde9d1-942a-475f";
const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID || "607753";

export async function POST(req: Request) {
  try {
    if (!BUNNY_API_KEY || !BUNNY_LIBRARY_ID) {
      console.error("CRITICAL_BUNNY_CONFIG_MISSING");
      return NextResponse.json({ error: "Configuration Bunny manquante sur le serveur." }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const instructorId = formData.get('instructorId') as string;

    if (!file || !instructorId) {
      return NextResponse.json({ error: "Données de fichier ou d'instructeur manquantes." }, { status: 400 });
    }

    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(instructorId).get();
    const userData = userDoc.data();

    if (!userDoc.exists || (userData?.role !== 'instructor' && userData?.role !== 'admin')) {
      return NextResponse.json({ error: "Accès refusé : Autorisation formateur requise." }, { status: 403 });
    }

    // 1. Créer l'entrée vidéo chez Bunny
    const createUrl = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`;
    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({ title: file.name || "Vidéo Ndara" }),
    });

    if (!createRes.ok) {
      const errorBody = await createRes.text();
      console.error("BUNNY_API_CREATE_ERROR:", {
        status: createRes.status,
        body: errorBody,
        libraryId: BUNNY_LIBRARY_ID
      });
      return NextResponse.json({ error: `Erreur Bunny (Statut ${createRes.status})`, details: errorBody }, { status: createRes.status });
    }

    const { guid } = await createRes.json();

    // 2. Téléverser le fichier binaire via PUT
    const uploadUrl = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${guid}`;
    const fileBuffer = await file.arrayBuffer();

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'application/octet-stream',
      },
      body: Buffer.from(fileBuffer),
    });

    if (!uploadRes.ok) {
      const errorBody = await uploadRes.text();
      console.error("BUNNY_API_UPLOAD_ERROR:", {
        status: uploadRes.status,
        videoId: guid
      });
      return NextResponse.json({ error: "Échec du transfert vers les serveurs de Bunny Stream." }, { status: uploadRes.status });
    }

    return NextResponse.json({ success: true, videoId: guid });

  } catch (error: any) {
    console.error("SERVER_VIDEO_UPLOAD_FATAL:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
