// src/lib/mesomb.ts
import crypto from "crypto";

const APP_KEY = process.env.MESOMB_APPLICATION_KEY!;
const ACCESS_KEY = process.env.MESOMB_ACCESS_KEY!;
const SECRET_KEY = process.env.MESOMB_SECRET_KEY!;

if (!APP_KEY || !ACCESS_KEY || !SECRET_KEY) {
  throw new Error("Clés MeSomb manquantes dans les variables d'environnement");
}

/**
 * Fonction manuelle pour appeler l'API MeSomb
 */
export async function fetchMeSomb(endpoint: string, method: string = "POST", body: any = {}) {
  const cleanEndpoint = endpoint.replace(/^\/+/, "");
  const url = `https://mesomb.hachther.com/api/v1.1/${cleanEndpoint}`;

  const date = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).substring(2, 15);
  const bodyString = method === "GET" ? "" : JSON.stringify(body);

  // Construction du message pour la signature
  const message = `\( {method}\n \){url}\n\( {date}\n \){nonce}\n${bodyString}`;

  const signature = crypto
    .createHmac("sha1", SECRET_KEY)
    .update(message)
    .digest("hex");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-MeSomb-Date": date,
    "X-MeSomb-Nonce": nonce,
    "X-MeSomb-Application": APP_KEY,
    "Authorization": `Signature \( {ACCESS_KEY}: \){signature}`,
  };

  console.log(`[MeSomb Request] ${method} ${url}`);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: method !== "GET" ? bodyString : undefined,
    });

    const text = await response.text();

    // Si ce n'est pas du JSON → erreur classique (HTML)
    if (!text.startsWith('{') && !text.startsWith('[')) {
      console.error("[MeSomb] Réponse non-JSON reçue :", text.substring(0, 400));
      throw new Error("Le serveur de paiement a renvoyé un format invalide (HTML).");
    }

    const data = JSON.parse(text);

    if (!response.ok) {
      console.error("[MeSomb API Error]", data);
      throw new Error(data?.message || data?.detail || "Erreur lors de l'appel MeSomb");
    }

    console.log("[MeSomb Success]");
    return data;
  } catch (error: any) {
    console.error("[MeSomb Error]", error.message);
    throw error;
  }
}