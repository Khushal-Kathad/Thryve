import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { v2 as cloudinary } from 'cloudinary';
import { RtcTokenBuilder, RtcRole } from 'agora-token';

admin.initializeApp();

// Configure Cloudinary using environment variables
// Set in functions/.env file
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

interface SignatureParams {
    timestamp: number;
    folder?: string;
}

// Generate signed upload parameters for Cloudinary
export const getCloudinarySignature = functions.https.onCall(
    async (data, context) => {
        // Verify user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'User must be authenticated to upload images'
            );
        }

        const timestamp = Math.round(new Date().getTime() / 1000);
        const folder = 'chat_images';

        // Parameters to sign
        const paramsToSign: SignatureParams = {
            timestamp,
            folder,
        };

        // Generate signature
        const signature = cloudinary.utils.api_sign_request(
            paramsToSign,
            process.env.CLOUDINARY_API_SECRET || ''
        );

        return {
            signature,
            timestamp,
            folder,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            apiKey: process.env.CLOUDINARY_API_KEY,
        };
    }
);

// Generate Agora RTC Token for video/audio calls
export const getAgoraToken = functions.https.onCall(
    async (data, context) => {
        // Verify user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'User must be authenticated to join calls'
            );
        }

        const { channelName, uid } = data;

        if (!channelName) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Channel name is required'
            );
        }

        const appId = process.env.AGORA_APP_ID;
        const appCertificate = process.env.AGORA_APP_CERTIFICATE;

        if (!appId || !appCertificate) {
            throw new functions.https.HttpsError(
                'failed-precondition',
                'Agora credentials not configured'
            );
        }

        // Token expires in 24 hours
        const expirationTimeInSeconds = 24 * 3600;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

        // Use UID 0 if not provided (allows any UID to use the token)
        const uidNum = uid ? parseInt(uid, 10) : 0;

        // Build the token
        const token = RtcTokenBuilder.buildTokenWithUid(
            appId,
            appCertificate,
            channelName,
            uidNum,
            RtcRole.PUBLISHER,
            privilegeExpiredTs,
            privilegeExpiredTs
        );

        return {
            token,
            appId,
            channel: channelName,
            uid: uidNum,
        };
    }
);
