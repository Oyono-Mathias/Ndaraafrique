
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
  // Logs de diagnostic (Server-side only)
  console.log("MeSomb Config Check:", {
    hasAccess: !!ACCESS_KEY,
    hasSecret: !!SECRET_KEY,
    hasApp: !!APP_KEY
  });

  if (!ACCESS_KEY || !SECRET_KEY || !APP_KEY) {
    console.error("[MeSomb] CONFIG ERROR: Missing keys in environment.");
    throw new Error("Le service de paiement n'est pas configuré sur ce serveur.");
  }

  // Nettoyage de l'endpoint
  const cleanEndpoint = endpoint.replace(/^\/+/, "");
  const url = `https://mesomb.hachther.com/api/v1.1/${cleanEndpoint}`;

  // Génération des éléments de sécurité
  const nonce = Math.random().toString(36).substring(2, 15);
  const date = new Date().toISOString();
  const bodyString = method !== "GET" ? JSON.stringify(body) : "";

  // 🔐 CONSTRUCTION DE LA SIGNATURE OFFICIELLE
  // Format: METHOD\nURL\nDATE\nNONCE\nBODY
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

    const contentType = response.headers.get("content-type");
    let data;

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.error("[MeSomb ERROR] Non-JSON Response:", text.substring(0, 200));
      throw new Error(`Réponse inattendue du serveur (Status ${response.status})`);
    }

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
