import { createHash, createHmac, randomBytes } from 'crypto';

/**
 * @fileOverview Client MeSomb avec implémentation manuelle de la Signature V4.
 * ✅ CONFORMITÉ : Task 1 à 4 de la documentation officielle MeSomb.
 * ✅ ROBUSTESSE : Utilise fetch natif pour éviter les erreurs de dépendances SDK.
 */

interface MeSombApiParams {
    endpoint: string;
    method: 'POST' | 'GET' | 'PUT';
    body?: any;
    service?: 'payment' | 'wallet';
}

/**
 * Exécute une requête signée vers l'API MeSomb.
 */
export async function callMeSombApi({ endpoint, method, body = {}, service = 'payment' }: MeSombApiParams) {
    const accessKey = process.env.MESOMB_ACCESS_KEY?.trim();
    const secretKey = process.env.MESOMB_SECRET_KEY?.trim();
    const appKey = process.env.MESOMB_APPLICATION_KEY?.trim();

    if (!accessKey || !secretKey || !appKey) {
        throw new Error("CONFIGURATION_INCOMPLETE: Clés MeSomb manquantes sur le serveur.");
    }

    const baseUrl = 'https://mesomb.hachther.com';
    const url = `${baseUrl}${endpoint}`;
    const uri = new URL(url);
    const host = uri.host;
    const path = uri.pathname;
    
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = randomBytes(8).toString('hex');
    const payload = method === 'GET' ? '{}' : JSON.stringify(body);
    const hashedPayload = createHash('sha1').update(payload).digest('hex');

    // 1. Task 1: Requête Canonique
    const headers: Record<string, string> = {
        'content-type': 'application/json',
        'host': host,
        'x-mesomb-application': appKey,
        'x-mesomb-date': timestamp.toString(),
        'x-mesomb-nonce': nonce
    };

    const sortedKeys = Object.keys(headers).sort();
    const canonicalHeaders = sortedKeys.map(k => `${k}:${headers[k]}`).join('\n') + '\n';
    const signedHeaders = sortedKeys.join(';');

    const canonicalRequest = [
        method,
        path,
        '', // Query string vide
        canonicalHeaders,
        signedHeaders,
        hashedPayload
    ].join('\n');

    // 2. Task 2: Chaîne à signer
    const dateStr = new Date(timestamp * 1000).toISOString().slice(0, 10).replace(/-/g, '');
    const scope = `${dateStr}/${service}/mesomb_request`;
    const stringToSign = [
        'HMAC-SHA1',
        timestamp.toString(),
        scope,
        createHash('sha1').update(canonicalRequest).digest('hex')
    ].join('\n');

    // 3. Task 3: Calcul de la Signature
    const signature = createHmac('sha1', secretKey).update(stringToSign).digest('hex');

    // 4. Task 4: Header Authorization
    const authHeader = `HMAC-SHA1 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    try {
        const response = await fetch(url, {
            method,
            headers: {
                ...headers,
                'Authorization': authHeader
            },
            body: method === 'GET' ? undefined : payload,
            cache: 'no-store'
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("[MeSomb API Error]", data);
            throw new Error(data.message || `Erreur MeSomb ${response.status}`);
        }

        return data;
    } catch (error: any) {
        console.error("[MeSomb Network Error]", error.message);
        throw new Error(error.message === 'fetch failed' ? "Impossible de contacter MeSomb. Vérifiez votre connexion serveur." : error.message);
    }
}

/**
 * Récupère le statut d'une transaction.
 */
export async function getMeSombTransactionStatus(transactionId: string) {
    try {
        const data = await callMeSombApi({
            endpoint: `/api/v1.1/payment/status/${transactionId}/`,
            method: 'GET'
        });
        return data;
    } catch (e) {
        console.error(`[MeSomb Status Check Fail] ID: ${transactionId}`);
        return null;
    }
}
