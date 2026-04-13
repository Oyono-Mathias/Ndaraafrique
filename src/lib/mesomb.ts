// src/lib/mesomb.ts
export async function fetchMeSomb(endpoint: string, method: string = "POST", body: any = {}) {
  const APP_KEY = process.env.MESOMB_APPLICATION_KEY;
  const API_KEY = process.env.MESOMB_SECRET_KEY; // Utilise ta Clé Secrète ici

  if (!APP_KEY || !API_KEY) {
    throw new Error("Clés MeSomb (APP_KEY ou API_KEY) manquantes");
  }

  const cleanEndpoint = endpoint.replace(/^\/+/, "");
  // ✅ URL Officielle
  const url = `https://mesomb.com/en/api/v1.1/${cleanEndpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-MeSomb-Application": APP_KEY,
    // ✅ Format Token : beaucoup plus simple et moins sujet aux erreurs
    "Authorization": `Token ${API_KEY}`, 
  };

  const bodyString = method === "GET" ? undefined : JSON.stringify(body);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: bodyString,
    });

    const text = await response.text();

    // Vérification si la réponse est du JSON
    if (!text.trim().startsWith("{") && !text.trim().startsWith("[")) {
      console.error("[MeSomb] Réponse non-JSON reçue :", text.substring(0, 200));
      throw new Error("Le serveur MeSomb a renvoyé une page d'erreur (HTML).");
    }

    const data = JSON.parse(text);

    if (!response.ok) {
      throw new Error(data?.message || `Erreur MeSomb: ${response.status}`);
    }

    return data;
  } catch (error: any) {
    console.error("[MeSomb Error]", error.message);
    throw error;
  }
}
