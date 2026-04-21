import { createHash, createHmac, randomBytes } from 'crypto';

/**
 * @fileOverview Client MeSomb avec implémentation manuelle du protocole SigV4 (HMAC-SHA1).
 * ✅ DÉRIVATION : Implémentation de la dérivation de clé (Date -> Service -> Request).
 * ✅ DEBUG : Logs détaillés pour identifier l'origine exacte du rejet 403.
 */

interface MeSombApiParams {
    endpoint: string;
    method: 'POST' | 'GET' | 'PUT';
    body?: any;
    service?: string;
}

/**
 * Calcule le HMAC-SHA1
 */
function hmac(key: string | Buffer, data: string): Buffer {
    return createHmac('sha1', key).update(data).digest();
}

/**
 * Calcule le hachage SHA1 en hexadécimal
 */
function hash(data: string): string {
    return createHash('sha1').update(data).digest('hex');
}

/**
 * Exécute une requête signée SigV4 vers MeSomb.
 */
export async function callMeSombApi({ endpoint, method, body = {}, service = 'payment' }: MeSombApiParams) {
    const accessKey = process.env.MESOMB_ACCESS_KEY?.trim();
    const secretKey = process.env.MESOMB_SECRET_KEY?.trim();
    const appKey = process.env.MESOMB_APPLICATION_KEY?.trim();

    if (!accessKey || !secretKey || !appKey) {
        throw new Error("CONFIG_MISSING: Vérifiez MESOMB_ACCESS_KEY, MESOMB_SECRET_KEY et MESOMB_APPLICATION_KEY.");
    }

    const host = 'mesomb.hachther.com';
    const url = `https://${host}${endpoint}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000);
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const nonce = randomBytes(8).toString('hex');
    
    // Le payload doit être exactement le même pour le hash et la requête
    const payload = method === 'GET' ? '{}' : JSON.stringify(body);
    const hashedPayload = hash(payload);

    // 1. Headers Canoniques (Triés alphabétiquement)
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

    // 2. Requête Canonique
    const canonicalRequest = [
        method,
        endpoint,
        '', // Query string
        canonicalHeaders,
        signedHeaders,
        hashedPayload
    ].join('\n');

    // 3. String to Sign & Derivation
    const scope = `${dateStr}/${service}/mesomb_request`;
    const stringToSign = [
        'HMAC-SHA1',
        timestamp.toString(),
        scope,
        hash(canonicalRequest)
    ].join('\n');

    // Dérivation de la clé (Standard SigV4)
    const kDate = hmac(secretKey, dateStr);
    const kService = hmac(kDate, service);
    const kSigning = hmac(kService, 'mesomb_request');
    
    // Signature finale
    const signature = createHmac('sha1', kSigning).update(stringToSign).digest('hex');

    const authHeader = `HMAC-SHA1 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    try {
        console.log(`[MeSomb Debug] URL: ${url}`);
        console.log(`[MeSomb Debug] AuthHeader: ${authHeader}`);

        const response = await fetch(url, {
            method,
            headers: {
                ...headers,
                'Authorization': authHeader
            },
            body: method === 'GET' ? undefined : payload,
            cache: 'no-store'
        });

        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            data = { message: responseText };
        }

        if (!response.ok) {
            console.error("[MeSomb API Error]", {
                status: response.status,
                body: data,
                sentBody: body
            });
            throw new Error(data.detail || data.message || `Erreur MeSomb ${response.status}`);
        }

        return data;
    } catch (error: any) {
        console.error("[MeSomb Network/Auth Error]", error.message);
        throw error;
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
