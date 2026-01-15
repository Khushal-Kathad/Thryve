// Agora Token Generator Worker using official agora-token package
import { RtcTokenBuilder, RtcRole } from 'agora-token';

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

            // Token expires in 24 hours
            const expirationTimeInSeconds = 24 * 3600;
            const currentTimestamp = Math.floor(Date.now() / 1000);
            const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

            // Parse UID - use 0 if not provided (allows any UID)
            const uidNum = parseInt(uid, 10) || 0;

            // Build the token using official library
            const token = RtcTokenBuilder.buildTokenWithUid(
                appId,
                appCertificate,
                channelName,
                uidNum,
                RtcRole.PUBLISHER,
                privilegeExpiredTs,
                privilegeExpiredTs
            );

            return new Response(
                JSON.stringify({
                    token,
                    appId,
                    channel: channelName,
                    uid: uidNum
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        } catch (error) {
            return new Response(
                JSON.stringify({ error: error.message, stack: error.stack }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }
    },
};
