// Agora Token Generator Worker

const VERSION = '007';

// Privileges
const kJoinChannel = 1;
const kPublishAudioStream = 2;
const kPublishVideoStream = 3;
const kPublishDataStream = 4;

function packUint16(value) {
    return new Uint8Array([value & 0xff, (value >> 8) & 0xff]);
}

function packUint32(value) {
    return new Uint8Array([
        value & 0xff,
        (value >> 8) & 0xff,
        (value >> 16) & 0xff,
        (value >> 24) & 0xff
    ]);
}

function packString(str) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    return new Uint8Array([...packUint16(bytes.length), ...bytes]);
}

function packContent(salt, ts, privileges) {
    const parts = [];

    // Pack salt and ts
    parts.push(...packUint32(salt));
    parts.push(...packUint32(ts));

    // Pack privileges map
    const privKeys = Object.keys(privileges);
    parts.push(...packUint16(privKeys.length));

    for (const key of privKeys) {
        parts.push(...packUint16(parseInt(key)));
        parts.push(...packUint32(privileges[key]));
    }

    return new Uint8Array(parts);
}

async function generateSignature(appCertificate, appId, channelName, uid, message) {
    const encoder = new TextEncoder();

    const toSign = new Uint8Array([
        ...encoder.encode(appId),
        ...encoder.encode(channelName),
        ...encoder.encode(String(uid)),
        ...message
    ]);

    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(appCertificate),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, toSign);
    return new Uint8Array(signature);
}

function base64Encode(uint8Array) {
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
}

async function buildToken(appId, appCertificate, channelName, uid, privileges) {
    const salt = Math.floor(Math.random() * 0xFFFFFFFF);
    const ts = Math.floor(Date.now() / 1000) + 24 * 3600;

    const message = packContent(salt, ts, privileges);
    const signature = await generateSignature(appCertificate, appId, channelName, uid, message);

    // Pack final content
    const content = new Uint8Array([
        ...packUint16(signature.length),
        ...signature,
        ...packUint16(message.length),
        ...message
    ]);

    const encoder = new TextEncoder();
    return VERSION + base64Encode(encoder.encode(appId)) + base64Encode(content);
}

async function buildTokenWithUid(appId, appCertificate, channelName, uid, tokenExpire) {
    const now = Math.floor(Date.now() / 1000);
    const expireTimestamp = now + tokenExpire;

    const privileges = {
        [kJoinChannel]: expireTimestamp,
        [kPublishAudioStream]: expireTimestamp,
        [kPublishVideoStream]: expireTimestamp,
        [kPublishDataStream]: expireTimestamp
    };

    return await buildToken(appId, appCertificate, channelName, uid, privileges);
}

export default {
    async fetch(request, env) {
        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // Handle preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        try {
            const url = new URL(request.url);
            const channelName = url.searchParams.get('channel');
            const uid = url.searchParams.get('uid') || '0';

            if (!channelName) {
                return new Response(
                    JSON.stringify({ error: 'Channel name required' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            const appId = env.AGORA_APP_ID;
            const appCertificate = env.AGORA_APP_CERTIFICATE;

            if (!appId || !appCertificate) {
                return new Response(
                    JSON.stringify({ error: 'Agora credentials not configured' }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            // Generate token (24 hours validity)
            const token = await buildTokenWithUid(
                appId,
                appCertificate,
                channelName,
                parseInt(uid) || 0,
                24 * 3600
            );

            return new Response(
                JSON.stringify({ token, appId, channel: channelName, uid }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        } catch (error) {
            return new Response(
                JSON.stringify({ error: error.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }
    },
};
