
import crypto from "crypto";

/**
 * @fileOverview Client MeSomb avec SIGNATURE HMAC SHA1 OFFICIELLE.
 * 🔒 SÉCURITÉ : Exécution uniquement côté serveur (Server-side only).
 * 🛡️ PROTOCOLE : Conforme aux exigences de production MeSomb.
 */

const ACCESS_KEY = process.env.MESOMB_ACCESS_KEY;
const SECRET_KEY = process.env.MESOMB_SECRET_KEY;
const APP_KEY = process.env.MESOMB_APPLICATION_KEY;

/**
 * Client API centralisé pour MeSomb utilisant la signature cryptographique.
 */
export async function fetchMeSomb(endpoint: string, method = "POST", body: any = {}) {
  // 1. Validation de la configuration
  if (!ACCESS_KEY || !SECRET_KEY || !APP_KEY) {
    console.error("[MeSomb] CRITICAL CONFIG ERROR: Missing keys in environment.");
    throw new Error("Le service de paiement n'est pas configuré sur ce serveur.");
  }

  const cleanEndpoint = endpoint.replace(/^\/+/, "");
  const url = `https://mesomb.hachther.com/api/v1.1/${cleanEndpoint}`;

  // 2. Préparation des éléments de signature
  const nonce = Math.random().toString(36).substring(2, 15);
  const date = new Date().toISOString();
  
  // Le corps doit être vide pour les requêtes GET lors de la signature
  const bodyString = method === "GET" ? "" : JSON.stringify(body);

  // 3. Construction du message de signature (Ordre strict : METHOD\nURL\nDATE\nNONCE\nBODY)
  const message = `${method}\n${url}\n${date}\n${nonce}\n${bodyString}`;

  // 4. Génération de la signature HMAC SHA1
  const signature = crypto
    .createHmac("sha1", SECRET_KEY)
    .update(message)
    .digest("hex");

  // 5. En-têtes de sécurité officiels
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

    // Protection contre les réponses HTML (erreurs 404/500 du serveur distant)
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        const errorText = await response.text();
        console.error("[MeSomb ERROR] Received non-JSON response:", errorText.substring(0, 300));
        throw new Error("Réponse invalide du serveur de paiement (Format incorrect).");
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
