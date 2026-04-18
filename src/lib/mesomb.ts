/**
 * @fileOverview Client API MeSomb centralisé - Version Token Auth (Reset).
 * 🔒 SÉCURITÉ : Ce code s'exécute uniquement côté serveur.
 */

export async function fetchMeSomb(endpoint: string, options: RequestInit = {}) {
  const apiKey = process.env.MESOMB_API_KEY;
  const appKey = process.env.MESOMB_APP_KEY;

  console.log("MESOMB CONFIG:", {
    apiKey: !!apiKey,
    appKey: !!appKey
  });

  if (!apiKey || !appKey) {
    console.error("[MeSomb] Erreur : Clés API manquantes.");
    throw new Error("Configuration MeSomb incomplète.");
  }

  const cleanEndpoint = endpoint.replace(/^\/+/, "");
  // Utilisation de l'URL hachther.com comme recommandé pour la stabilité
  const url = `https://mesomb.hachther.com/api/v1.1/${cleanEndpoint}`;

  const headers = {
    ...(options.headers || {}),
    'Authorization': `Token ${apiKey}`,
    'X-MeSomb-Application': appKey,
    'Content-Type': 'application/json',
  };

  console.log(`[MeSomb Request] ${options.method || 'GET'} -> ${url}`);
  if (options.body) console.log("REQUEST BODY:", options.body);

  try {
    const response = await fetch(url, { 
      ...options, 
      headers,
      cache: 'no-store'
    });

    const text = await response.text();
    
    // Détection si la réponse est un JSON valide
    if (!text.trim().startsWith("{") && !text.trim().startsWith("[")) {
      console.error("[MeSomb Error] Réponse non-JSON reçue.");
      throw new Error("Le serveur MeSomb a renvoyé une réponse invalide.");
    }

    const data = JSON.parse(text);

    if (!response.ok) {
      console.error("MESOMB API ERROR:", data);
      throw new Error(data?.detail || data?.message || `Erreur MeSomb (${response.status})`);
    }

    console.log("MESOMB RESPONSE SUCCESS:", data);
    return data;
  } catch (error: any) {
    console.error("MESOMB FATAL ERROR:", error.message);
    throw error;
  }
}
