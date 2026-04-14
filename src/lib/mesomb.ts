import crypto from "crypto";

/**
 * @fileOverview Client API MeSomb avec SIGNATURE HMAC SHA1 OFFICIELLE.
 * 🔒 SÉCURITÉ : Ce code s'exécute uniquement côté serveur.
 */

const ACCESS_KEY = process.env.MESOMB_ACCESS_KEY;
const SECRET_KEY = process.env.MESOMB_SECRET_KEY;
const APP_KEY = process.env.MESOMB_APPLICATION_KEY;

export async function fetchMeSomb(endpoint: string, method = "POST", body: any = {}) {
  if (!ACCESS_KEY || !SECRET_KEY || !APP_KEY) {
    console.error("[MeSomb] CONFIG ERROR: Clés manquantes dans l'environnement.");
    throw new Error("Configuration MeSomb incomplète.");
  }

  // URL de production officielle
  const url = `https://mesomb.com/en/api/v1.1/${endpoint.replace(/^\/+/, "")}`;

  const nonce = Math.random().toString(36).substring(2);
  const date = new Date().toISOString();
  const bodyString = method === "GET" ? "" : JSON.stringify(body);

  // 🔐 CONSTRUCTION DE LA SIGNATURE (Protocole MeSomb)
  // Format : Method + "\n" + URL + "\n" + Date + "\n" + Nonce + "\n" + Body
  const message = `${method}\n${url}\n${date}\n${nonce}\n${bodyString}`;

  const signature = crypto
    .createHmac("sha1", SECRET_KEY)
    .update(message)
    .digest("hex");

  const headers = {
    "Content-Type": "application/json",
    "X-MeSomb-Date": date,
    "X-MeSomb-Nonce": nonce,
    "X-MeSomb-Application": APP_KEY,
    "Authorization": `Signature ${ACCESS_KEY}:${signature}`,
  };

  console.log(`[MeSomb] ${method} -> ${url}`);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: method !== "GET" ? bodyString : undefined,
      cache: "no-store",
    });

    const text = await response.text();
    
    if (!text.trim().startsWith("{") && !text.trim().startsWith("[")) {
      console.error("[MeSomb Error] Réponse non-JSON reçue.");
      throw new Error("Le serveur MeSomb a renvoyé une réponse invalide.");
    }

    const data = JSON.parse(text);

    if (!response.ok) {
      console.error("[MeSomb API Error]", data);
      throw new Error(data?.detail || data?.message || `Erreur MeSomb (${response.status})`);
    }

    return data;
  } catch (error: any) {
    console.error("[MeSomb Fatal]", error.message);
    throw error;
  }
}
