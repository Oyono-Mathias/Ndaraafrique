
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
      console.error("CRITICAL: BUNNY_API_KEY is missing or too short in environment variables.");
      return NextResponse.json({ error: "Configuration serveur incomplète (BUNNY_API_KEY manquante ou invalide)" }, { status: 500 });
    }

    if (!BUNNY_LIBRARY_ID) {
      console.error("CRITICAL: BUNNY_LIBRARY_ID is missing in environment variables.");
      return NextResponse.json({ error: "Configuration serveur incomplète (BUNNY_LIBRARY_ID manquant)" }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const instructorId = formData.get('instructorId') as string;

    if (!file || !instructorId) {
      return NextResponse.json({ error: "Fichier ou ID instructeur manquant" }, { status: 400 });
    }

    // 2. Sécurité Ndara : Vérifier le rôle via Admin DB
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(instructorId).get();
    const userData = userDoc.data();

    if (!userDoc.exists || (userData?.role !== 'instructor' && userData?.role !== 'admin')) {
      return NextResponse.json({ error: "Accès refusé : Seuls les formateurs autorisés peuvent uploader." }, { status: 403 });
    }

    // 3. Étape 1 chez Bunny : Créer l'entrée vidéo (POST)
    // On utilise l'Account API Key dans le header 'AccessKey'
    const createUrl = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`;
    
    console.log(`Attempting to create video record in library ${BUNNY_LIBRARY_ID}...`);
    
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
      const status = createRes.status;
      if (status === 401) {
          throw new Error("L'API Bunny a rejeté votre clé (401 Unauthorized). Vérifiez votre Account API Key dans Vercel.");
      }
      const errorData = await createRes.json().catch(() => ({}));
      throw new Error(`Erreur Bunny Creation (Status ${status}): ${errorData.message || createRes.statusText}`);
    }

    const { guid } = await createRes.json();
    console.log(`Video record created successfully. GUID: ${guid}`);

    // 4. Étape 2 chez Bunny : Téléverser le binaire (PUT)
    const uploadUrl = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${guid}`;
    const fileBuffer = await file.arrayBuffer();

    console.log(`Uploading binary data to Bunny for GUID: ${guid}...`);

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'application/octet-stream',
      },
      body: Buffer.from(fileBuffer),
    });

    if (!uploadRes.ok) {
      throw new Error(`Échec du transfert binaire vers Bunny (Status ${uploadRes.status})`);
    }

    console.log("Upload to Bunny Stream completed successfully.");

    return NextResponse.json({ success: true, videoId: guid });

  } catch (error: any) {
    console.error("SECURE_UPLOAD_ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
