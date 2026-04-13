
import crypto from "crypto";

/**
 * @fileOverview Client MeSomb avec SIGNATURE OFFICIELLE (HMAC SHA1).
 * 🔒 Sécurisé : Exécution uniquement côté serveur.
 * 🛡️ Anti-Rejeu : Utilisation de Nonce et Timestamp.
 */

const ACCESS_KEY = process.env.MESOMB_ACCESS_KEY;
const SECRET_KEY = process.env.MESOMB_SECRET_KEY;
const APP_KEY = process.env.MESOMB_APPLICATION_KEY;

export async function fetchMeSomb(endpoint: string, method = "POST", body: any = {}) {
  // Logs de diagnostic serveur
  if (!ACCESS_KEY || !SECRET_KEY || !APP_KEY) {
    console.error("[MeSomb] CONFIG ERROR: Missing ACCESS_KEY, SECRET_KEY or APPLICATION_KEY.");
    throw new Error("Configuration MeSomb incomplète sur le serveur.");
  }

  const cleanEndpoint = endpoint.replace(/^\/+/, "");
  const url = `https://mesomb.hachther.com/api/v1.1/${cleanEndpoint}`;

  const nonce = Math.random().toString(36).substring(2, 15);
  const date = new Date().toISOString();
  const bodyString = method !== "GET" ? JSON.stringify(body) : "";

  // 🔐 CONSTRUCTION DE LA SIGNATURE OFFICIELLE MeSomb
  // Format requis : METHOD\nURL\nDATE\nNONCE\nBODY
  const message = `${method}\n${url}\n${date}\n${nonce}\n${bodyString}`;

  const signature = crypto
    .createHmac("sha1", SECRET_KEY)
    .update(message)
    .digest("hex");

  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-MeSomb-Date": date,
    "X-MeSomb-Nonce": nonce,
    "X-MeSomb-Application": APP_KEY,
    "Authorization": `Signature ${ACCESS_KEY}:${signature}`,
  };

  console.log(`[MeSomb Request] ${method} ${url}`);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: method !== "GET" ? bodyString : undefined,
      cache: "no-store",
    });

    // Gestion des réponses non-JSON (erreurs serveurs MeSomb)
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("[MeSomb ERROR] HTML/Text Response:", text.substring(0, 200));
        throw new Error(`Réponse invalide du serveur MeSomb (Status ${response.status})`);
    }

    const data = await response.json();

    if (!response.ok) {
      console.error("[MeSomb API ERROR]", data);
      throw new Error(data?.detail || data?.message || `Erreur MeSomb (${response.status})`);
    }

    console.log("[MeSomb SUCCESS]");
    return data;
  } catch (error: any) {
    console.error("[MeSomb FATAL]", error.message);
    throw error;
  }
}
