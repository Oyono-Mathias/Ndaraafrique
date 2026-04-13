
/**
 * @fileOverview Client API MeSomb Centralisé pour Ndara Afrique.
 * ✅ AUTHENTIFICATION : Token Auth standard.
 * ✅ SÉCURITÉ : Server-side only.
 */

const API_KEY = process.env.MESOMB_API_KEY;
const APP_KEY = process.env.MESOMB_APP_KEY;

export async function fetchMeSomb(endpoint: string, options: RequestInit = {}) {
  if (!API_KEY || !APP_KEY) {
    console.error("[MeSomb] CONFIG_ERROR: Missing API_KEY or APP_KEY in environment.");
    throw new Error("Le service de paiement n'est pas configuré correctement sur le serveur.");
  }

  // S'assurer que l'endpoint commence correctement
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  const url = `https://mesomb.hachther.com/api/v1.1/${cleanEndpoint}`;
  
  const headers = {
    'Authorization': `Token ${API_KEY.trim()}`,
    'X-MeSomb-Application': APP_KEY.trim(),
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  console.log(`[MeSomb Request] ${options.method || 'GET'} ${url}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      cache: 'no-store',
    });

    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.error(`[MeSomb Error] Réponse non-JSON reçue:`, text.substring(0, 200));
      throw new Error(`Réponse inattendue de la passerelle (Status ${response.status})`);
    }

    if (!response.ok) {
      console.error(`[MeSomb API Error] Status ${response.status}:`, data);
      throw new Error(data.detail || data.message || `Erreur MeSomb (${response.status})`);
    }

    console.log(`[MeSomb Response] Success`);
    return data;
  } catch (error: any) {
    console.error(`[MeSomb Fatal]`, error.message);
    throw error;
  }
}
