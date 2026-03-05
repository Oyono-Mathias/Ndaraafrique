import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';

/**
 * @fileOverview Route API sécurisée pour le téléversement de vidéos vers Bunny Stream.
 * Utilise la Account API Key pour créer l'entrée vidéo de manière invisible.
 */

const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;

export async function POST(req: Request) {
  try {
    if (!BUNNY_API_KEY || !BUNNY_LIBRARY_ID) {
      console.error("CONFIG_MISSING: API Key ou Library ID manquant dans les variables Vercel.");
      return NextResponse.json({ error: "Configuration serveur incomplète." }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const instructorId = formData.get('instructorId') as string;
    const title = formData.get('title') as string || file.name;

    if (!file || !instructorId) {
      return NextResponse.json({ error: "Fichier ou identifiant manquant." }, { status: 400 });
    }

    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(instructorId).get();
    const userData = userDoc.data();

    if (!userDoc.exists || (userData?.role !== 'instructor' && userData?.role !== 'admin')) {
      return NextResponse.json({ error: "Action réservée aux formateurs Ndara." }, { status: 403 });
    }

    // 1. Création de l'entrée vidéo chez Bunny
    const createUrl = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`;
    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({ title }),
    });

    if (!createRes.ok) {
      const errorBody = await createRes.text();
      console.error("BUNNY_CREATE_ERROR:", response.status, errorBody);
      return NextResponse.json({ error: `Erreur Bunny Stream (Status ${createRes.status})` }, { status: createRes.status });
    }

    const { guid } = await createRes.json();

    // 2. Transfert du binaire vers le serveur Bunny
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
      return NextResponse.json({ error: "Échec du transfert vers les serveurs Bunny Stream." }, { status: uploadRes.status });
    }

    return NextResponse.json({ success: true, videoId: guid });

  } catch (error: any) {
    console.error("UPLOAD_PROXY_FATAL:", error.message);
    return NextResponse.json({ error: "Une erreur interne est survenue lors du téléversement." }, { status: 500 });
  }
}
