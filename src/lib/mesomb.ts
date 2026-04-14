import crypto from 'crypto';

/**
 * @fileOverview Client API MeSomb avec Signature HMAC SHA1 Officielle.
 * 🔒 SÉCURITÉ : Génère une signature unique pour chaque requête.
 */

export async function fetchMeSomb(endpoint: string, method: string = "POST", body: any = {}) {
  const ACCESS_KEY = process.env.MESOMB_ACCESS_KEY;
  const SECRET_KEY = process.env.MESOMB_SECRET_KEY;
  const APP_KEY = process.env.MESOMB_APPLICATION_KEY;

  if (!ACCESS_KEY || !SECRET_KEY || !APP_KEY) {
    throw new Error("Configuration MeSomb incomplète. Vérifiez les variables ACCESS, SECRET et APPLICATION sur Vercel.");
  }

  const cleanEndpoint = endpoint.replace(/^\/+/, "");
  // URL de production officielle
  const url = `https://mesomb.com/en/api/v1.1/${cleanEndpoint}`;

  const nonce = Math.random().toString(36).substring(2, 15);
  const date = new Date().toISOString();
  const bodyString = method === "GET" ? "" : JSON.stringify(body);

  // 🔐 CONSTRUCTION DE LA SIGNATURE (Protocole MeSomb)
  // Format : Method + "\n" + URL + "\n" + Date + "\n" + Nonce + "\n" + Body
  const message = `${method}\n${url}\n${date}\n${nonce}\n${bodyString}`;
  
  const signature = crypto
    .createHmac("sha1", SECRET_KEY)
    .update(message)
    .digest("hex");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-MeSomb-Application": APP_KEY,
    "X-MeSomb-Date": date,
    "X-MeSomb-Nonce": nonce,
    "Authorization": `Signature ${ACCESS_KEY}:${signature}`,
  };

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: method === "GET" ? undefined : bodyString,
      cache: 'no-store'
    });

    const text = await response.text();

    // Protection contre les réponses HTML (erreurs serveurs MeSomb ou blocages)
    if (!text.trim().startsWith("{") && !text.trim().startsWith("[")) {
      console.error("[MeSomb Error] Réponse non-JSON reçue (HTML possible).");
      throw new Error("Le serveur MeSomb a renvoyé une réponse invalide. Vérifiez vos clés.");
    }

    const data = JSON.parse(text);

    if (!response.ok) {
      console.error("[MeSomb API Rejection]", data);
      throw new Error(data?.detail || data?.message || `Erreur MeSomb (${response.status})`);
    }

    return data;
  } catch (error: any) {
    console.error("[MeSomb Fatal Error]", error.message);
    throw error;
  }
}
