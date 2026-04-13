// src/lib/mesomb.ts

/**
 * Fonction universelle pour MeSomb (Recharge + Solde)
 */
export async function fetchMeSomb(endpoint: string, method: string = "POST", body: any = {}) {
  const APP_KEY = process.env.MESOMB_APPLICATION_KEY;
  const API_KEY = process.env.MESOMB_SECRET_KEY; // Ta clé secrète (1bf...)

  if (!APP_KEY || !API_KEY) {
    throw new Error("Configuration MeSomb incomplète dans les variables d'environnement.");
  }

  const cleanEndpoint = endpoint.replace(/^\/+/, "");
  // URL Officielle et stable
  const url = `https://mesomb.com/en/api/v1.1/${cleanEndpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-MeSomb-Application": APP_KEY,
    "Authorization": `Token ${API_KEY}`, // Format Token : simple et robuste
  };

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: method === "GET" ? undefined : JSON.stringify(body),
    });

    const text = await response.text();

    // Si on reçoit du HTML, MeSomb nous a bloqués
    if (!text.trim().startsWith("{") && !text.trim().startsWith("[")) {
      console.error("[MeSomb Error] Réponse HTML reçue. Vérifiez vos clés sur Vercel.");
      throw new Error("Le serveur MeSomb a rejeté l'authentification.");
    }

    const data = JSON.parse(text);

    if (!response.ok) {
      throw new Error(data?.message || `Erreur MeSomb (${response.status})`);
    }

    return data;
  } catch (error: any) {
    console.error("[MeSomb Fatal]", error.message);
    throw error;
  }
}
