import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';

/**
 * @fileOverview Route API sécurisée pour le téléversement de vidéos vers Bunny Stream.
 * Agit comme un proxy serveur pour protéger la clé API Bunny.
 */

const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;

export async function POST(req: Request) {
  try {
    // 1. Vérification de la configuration serveur
    if (!BUNNY_API_KEY || BUNNY_API_KEY.length < 10) {
      return NextResponse.json({ error: "Configuration serveur incomplète (BUNNY_API_KEY manquante)" }, { status: 500 });
    }

    if (!BUNNY_LIBRARY_ID) {
      return NextResponse.json({ error: "Configuration serveur incomplète (BUNNY_LIBRARY_ID manquant)" }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const instructorId = formData.get('instructorId') as string;

    if (!file || !instructorId) {
      return NextResponse.json({ error: "Fichier ou ID instructeur manquant" }, { status: 400 });
    }

    // 2. Sécurité : Vérifier le rôle via Admin DB
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(instructorId).get();
    const userData = userDoc.data();

    if (!userDoc.exists || (userData?.role !== 'instructor' && userData?.role !== 'admin')) {
      return NextResponse.json({ error: "Accès refusé : Autorisation formateur requise." }, { status: 403 });
    }

    // 3. Étape 1 chez Bunny : Créer l'entrée vidéo (POST)
    const createUrl = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`;
    
    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({ title: file.name || "Nouvelle Vidéo Ndara" }),
    });

    if (!createRes.ok) {
      const errorData = await createRes.json().catch(() => ({}));
      throw new Error(errorData.message || "Impossible de créer l'entrée vidéo chez Bunny.");
    }

    const { guid } = await createRes.json();

    // 4. Étape 2 chez Bunny : Téléverser le binaire (PUT)
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
      throw new Error("Le transfert du fichier vers Bunny a échoué.");
    }

    return NextResponse.json({ success: true, videoId: guid });

  } catch (error: any) {
    console.error("SECURE_UPLOAD_ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
