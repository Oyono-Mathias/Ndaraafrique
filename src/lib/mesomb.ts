import crypto from "crypto";

/**
 * @fileOverview Client MeSomb centralisé avec SIGNATURE HMAC SHA1.
 * 🔒 Sécurité : Exécution côté serveur uniquement.
 * 🛡️ Protocole : Signature KEY:HASH conforme aux exigences de production.
 */

export async function fetchMeSomb(endpoint: string, method = "POST", body: any = {}) {
  const ACCESS_KEY = process.env.MESOMB_ACCESS_KEY;
  const SECRET_KEY = process.env.MESOMB_SECRET_KEY;
  const APP_KEY = process.env.MESOMB_APPLICATION_KEY;

  if (!ACCESS_KEY || !SECRET_KEY || !APP_KEY) {
    console.error("[MeSomb] CRITICAL: Missing environment variables.");
    throw new Error("Configuration MeSomb incomplète sur le serveur. Vérifiez vos variables d'environnement.");
  }

  // Normalisation de l'URL
  const cleanEndpoint = endpoint.replace(/^\/+/, "");
  const url = `https://mesomb.hachther.com/api/v1.1/${cleanEndpoint}`;

  // MeSomb attend souvent le timestamp en secondes (integer) pour la signature
  const nonce = Math.random().toString(36).substring(2, 15);
  const date = Math.floor(Date.now() / 1000).toString(); 
  
  const bodyString = method === "GET" ? "" : JSON.stringify(body);

  // 🔐 CONSTRUCTION DU MESSAGE DE SIGNATURE
  // Protocole : METHOD + "\n" + URL + "\n" + DATE + "\n" + NONCE + "\n" + BODY
  const message = `${method}\n${url}\n${date}\n${nonce}\n${bodyString}`;

  // Génération du hachage HMAC SHA1
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

    // Vérifier si la réponse est du JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        const errorText = await response.text();
        console.error("[MeSomb Error] Non-JSON response:", errorText.substring(0, 200));
        throw new Error("Le serveur de paiement a renvoyé un format invalide (HTML).");
    }

    const data = await response.json();

    if (!response.ok) {
      console.error("[MeSomb API Error]", data);
      throw new Error(data?.detail || data?.message || "L'autorisation MeSomb a été refusée.");
    }

    console.log("[MeSomb Success]");
    return data;
  } catch (error: any) {
    console.error("[MeSomb Fatal]", error.message);
    throw error;
  }
}
