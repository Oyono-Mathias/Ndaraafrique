// src/lib/mesomb.ts
import crypto from "crypto";

const APP_KEY = process.env.MESOMB_APPLICATION_KEY!;
const ACCESS_KEY = process.env.MESOMB_ACCESS_KEY!;
const SECRET_KEY = process.env.MESOMB_SECRET_KEY!;

if (!APP_KEY || !ACCESS_KEY || !SECRET_KEY) {
  throw new Error("Clés MeSomb manquantes dans les variables d'environnement");
}

/**
 * ✅ Client MeSomb corrigé (signature officielle propre)
 */
export async function fetchMeSomb(
  endpoint: string,
  method: string = "POST",
  body: any = {}
) {
  const cleanEndpoint = endpoint.replace(/^\/+/, "");
  const url = `https://mesomb.hachther.com/api/v1.1/${cleanEndpoint}`;

  const date = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).substring(2, 15);
  const bodyString = method === "GET" ? "" : JSON.stringify(body);

  // ✅ MESSAGE CORRECT
  const message = `${method}\n${url}\n${date}\n${nonce}\n${bodyString}`;

  // ✅ SIGNATURE CORRECTE
  const signature = crypto
    .createHmac("sha1", SECRET_KEY)
    .update(message)
    .digest("hex");

  // ✅ HEADERS CORRECTS
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-MeSomb-Date": date,
    "X-MeSomb-Nonce": nonce,
    "X-MeSomb-Application": APP_KEY,
    "Authorization": `Signature ${ACCESS_KEY}:${signature}`,
  };

  console.log("[MeSomb DEBUG]", {
    method,
    url,
    date,
    nonce,
    hasKeys: !!ACCESS_KEY && !!SECRET_KEY && !!APP_KEY,
  });

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: method !== "GET" ? bodyString : undefined,
    });

    const text = await response.text();

    if (!text.startsWith("{") && !text.startsWith("[")) {
      console.error("[MeSomb] Réponse non-JSON :", text.substring(0, 300));
      throw new Error("Réponse invalide du serveur MeSomb");
    }

    const data = JSON.parse(text);

    if (!response.ok) {
      console.error("[MeSomb API Error]", data);
      throw new Error(data?.message || data?.detail || "Erreur MeSomb");
    }

    console.log("[MeSomb Success]");
    return data;
  } catch (error: any) {
    console.error("[MeSomb Fatal]", error.message);
    throw new Error("Impossible de joindre les serveurs MeSomb");
  }
}