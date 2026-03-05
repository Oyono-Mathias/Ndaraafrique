
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';

/**
 * @fileOverview Route API sécurisée pour le téléversement de vidéos vers Bunny Stream.
 * Cette fonction agit comme un proxy pour protéger la clé API Bunny.
 */

const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;

export async function POST(req: Request) {
  try {
    // 1. Vérification de la configuration
    if (!BUNNY_API_KEY || !BUNNY_LIBRARY_ID) {
      return NextResponse.json({ error: "Configuration serveur incomplète (BUNNY_API_KEY ou LIBRARY_ID manquant)" }, { status: 500 });
    }

    // 2. Récupération du fichier
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const instructorId = formData.get('instructorId') as string;

    if (!file || !instructorId) {
      return NextResponse.json({ error: "Fichier ou ID instructeur manquant" }, { status: 400 });
    }

    // 3. Sécurité : Vérifier si l'utilisateur est instructeur (via Admin DB)
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(instructorId).get();
    const userData = userDoc.data();

    if (!userDoc.exists || (userData?.role !== 'instructor' && userData?.role !== 'admin')) {
      return NextResponse.json({ error: "Accès refusé : Autorisation insuffisante" }, { status: 403 });
    }

    // 4. ÉTAPE A : Créer l'entrée vidéo chez Bunny
    const createUrl = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`;
    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({ title: file.name }),
    });

    if (!createRes.ok) {
      const errorData = await createRes.json();
      return NextResponse.json({ error: `Erreur création Bunny: ${errorData.message || createRes.statusText}` }, { status: createRes.status });
    }

    const { guid } = await createRes.json();

    // 5. ÉTAPE B : Téléverser le fichier binaire vers Bunny
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
      return NextResponse.json({ error: "Échec du transfert vers Bunny" }, { status: uploadRes.status });
    }

    // 6. Retourner le GUID (videoId)
    return NextResponse.json({ success: true, videoId: guid });

  } catch (error: any) {
    console.error("API Upload Error:", error);
    return NextResponse.json({ error: "Erreur interne du serveur", details: error.message }, { status: 500 });
  }
}
