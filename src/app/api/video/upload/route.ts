
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';

/**
 * @fileOverview Route API sécurisée pour le téléversement de vidéos vers Bunny Stream.
 * Agit comme un tunnel serveur pour protéger la clé API Bunny.
 * Diagnostic renforcé pour tracer les erreurs API.
 */

const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;

export async function POST(req: Request) {
  try {
    // 1. Vérification de la configuration serveur
    if (!BUNNY_API_KEY || BUNNY_API_KEY.length < 10) {
      console.error("BUNNY_CONFIG_ERROR: Missing or invalid BUNNY_API_KEY");
      return NextResponse.json({ error: "Clé API Bunny manquante sur le serveur." }, { status: 500 });
    }

    if (!BUNNY_LIBRARY_ID) {
      console.error("BUNNY_CONFIG_ERROR: Missing BUNNY_LIBRARY_ID");
      return NextResponse.json({ error: "ID de bibliothèque Bunny manquant." }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const instructorId = formData.get('instructorId') as string;

    if (!file || !instructorId) {
      return NextResponse.json({ error: "Données manquantes (Fichier ou ID)." }, { status: 400 });
    }

    // 2. Sécurité : Vérifier le rôle de l'utilisateur
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(instructorId).get();
    const userData = userDoc.data();

    if (!userDoc.exists || (userData?.role !== 'instructor' && userData?.role !== 'admin')) {
      return NextResponse.json({ error: "Accès refusé : Droits de formateur requis." }, { status: 403 });
    }

    // 3. Étape 1 : Créer l'entrée vidéo chez Bunny
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
      console.error("BUNNY_API_CREATE_FAILURE:", {
        status: createRes.status,
        body: errorBody,
        libraryId: BUNNY_LIBRARY_ID,
        endpoint: createUrl
      });
      return NextResponse.json({ 
        error: `Erreur Bunny (Statut ${createRes.status})`,
        details: errorBody
      }, { status: createRes.status });
    }

    const { guid } = await createRes.json();

    // 4. Étape 2 : Téléverser le binaire vers Bunny (via PUT)
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
      console.error("BUNNY_API_UPLOAD_FAILURE:", {
        status: uploadRes.status,
        body: errorBody,
        libraryId: BUNNY_LIBRARY_ID,
        videoId: guid,
        endpoint: uploadUrl
      });
      return NextResponse.json({ 
        error: "Échec du transfert vers le serveur de streaming.",
        details: errorBody
      }, { status: uploadRes.status });
    }

    return NextResponse.json({ success: true, videoId: guid });

  } catch (error: any) {
    console.error("SECURE_UPLOAD_CRITICAL_ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
