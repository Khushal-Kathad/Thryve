import AgoraRTC, {
    IAgoraRTCClient,
    IMicrophoneAudioTrack,
    ICameraVideoTrack,
    IAgoraRTCRemoteUser,
} from 'agora-rtc-sdk-ng';

const APP_ID = import.meta.env.VITE_AGORA_APP_ID;
const TOKEN_WORKER_URL = import.meta.env.VITE_AGORA_TOKEN_WORKER_URL;

// Configure Agora SDK
AgoraRTC.setLogLevel(4); // Error level only - reduces console noise
AgoraRTC.disableLogUpload(); // Disable stats/log upload to prevent ERR_ADDRESS_INVALID errors

// Convert string UID to numeric UID for Agora compatibility
// Agora works more reliably with numeric UIDs
function stringToNumericUid(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // Ensure positive number and within Agora's UID range (0 to 2^32-1)
    return Math.abs(hash) % 4294967295;
}

export interface AgoraEventHandlers {
    onUserJoined?: (user: IAgoraRTCRemoteUser) => void;
    onUserLeft?: (user: IAgoraRTCRemoteUser) => void;
    onUserPublished?: (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => void;
    onUserUnpublished?: (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => void;
    onConnectionStateChange?: (state: string) => void;
}

class AgoraService {
    private client: IAgoraRTCClient | null = null;
    private localAudioTrack: IMicrophoneAudioTrack | null = null;
    private localVideoTrack: ICameraVideoTrack | null = null;
    private eventHandlers: AgoraEventHandlers = {};
    private isJoining: boolean = false;

    // Initialize the Agora client
    async initialize(handlers: AgoraEventHandlers = {}): Promise<void> {
        // If client exists and is connected/connecting, leave first
        if (this.client) {
            const state = this.client.connectionState;
            if (state === 'CONNECTED' || state === 'CONNECTING') {
                console.log('Agora client in use, leaving first...');
                await this.leaveChannel();
            }
        }

        this.eventHandlers = handlers;

        // Create new client
        this.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

        // Set up event listeners
        this.client.on('user-joined', (user) => {
            console.log('User joined:', user.uid);
            this.eventHandlers.onUserJoined?.(user);
        });

        this.client.on('user-left', (user) => {
            console.log('User left:', user.uid);
            this.eventHandlers.onUserLeft?.(user);
        });

        this.client.on('user-published', async (user, mediaType) => {
            console.log('User published:', user.uid, mediaType);
            if (mediaType === 'audio' || mediaType === 'video') {
                await this.client?.subscribe(user, mediaType);
                this.eventHandlers.onUserPublished?.(user, mediaType);
            }
        });

        this.client.on('user-unpublished', (user, mediaType) => {
            console.log('User unpublished:', user.uid, mediaType);
            if (mediaType === 'audio' || mediaType === 'video') {
                this.eventHandlers.onUserUnpublished?.(user, mediaType);
            }
        });

        this.client.on('connection-state-change', (state) => {
            console.log('Connection state:', state);
            this.eventHandlers.onConnectionStateChange?.(state);
        });
    }

    // Join a channel
    async joinChannel(channelName: string, uid: string): Promise<boolean> {
        if (!this.client) {
            console.warn('Client not initialized, initializing now...');
            await this.initialize();
        }

        if (!this.client) {
            throw new Error('Failed to initialize Agora client');
        }

        const state = this.client.connectionState;
        if (state === 'CONNECTED') {
            console.log('Already connected to a channel');
            return true;
        }

        // Wait for ongoing join to complete
        if (this.isJoining || state === 'CONNECTING') {
            console.log('Already joining/connecting, waiting for completion...');
            // Wait up to 10 seconds for connection
            for (let i = 0; i < 100; i++) {
                await new Promise(resolve => setTimeout(resolve, 100));
                if (this.client?.connectionState === 'CONNECTED') {
                    console.log('Connection completed while waiting');
                    return true;
                }
                if (!this.isJoining && this.client?.connectionState === 'DISCONNECTED') {
                    console.log('Connection failed while waiting');
                    break;
                }
            }
            return this.client?.connectionState === 'CONNECTED';
        }

        this.isJoining = true;
        try {
            // Convert string UID to numeric for Agora compatibility
            const numericUid = stringToNumericUid(uid);
            console.log(`Converting UID: ${uid} -> ${numericUid}`);

            // Fetch token and appId from Cloudflare Worker
            let token: string | null = null;
            let appId = APP_ID; // Fallback to env variable

            if (TOKEN_WORKER_URL) {
                try {
                    // Use numeric UID for token generation
                    const response = await fetch(
                        `${TOKEN_WORKER_URL}?channel=${encodeURIComponent(channelName)}&uid=${numericUid}`
                    );
                    if (response.ok) {
                        const data = await response.json();
                        token = data.token;
                        // Use appId from worker response if provided
                        if (data.appId) {
                            appId = data.appId;
                        }
                        console.log('Token fetched for channel:', channelName, 'uid:', numericUid, 'token length:', token?.length);
                    } else {
                        const errorText = await response.text();
                        console.warn('Failed to fetch token:', errorText);
                    }
                } catch (tokenError) {
                    console.warn('Error fetching token, will try without token:', tokenError);
                }
            }

            if (!appId) {
                throw new Error('Agora App ID not configured. Please set VITE_AGORA_APP_ID in your .env file');
            }

            console.log('Joining Agora channel:', channelName, 'with appId:', appId.substring(0, 8) + '...', 'uid:', numericUid, 'hasToken:', !!token);

            // Try to join with token first, fall back to null token if it fails
            try {
                await this.client.join(appId, channelName, token, numericUid);
                console.log('Successfully joined channel:', channelName);
            } catch (joinError: unknown) {
                const errorMessage = joinError instanceof Error ? joinError.message : String(joinError);
                // If token-based join fails with "invalid vendor key", try without token
                if (errorMessage.includes('CAN_NOT_GET_GATEWAY_SERVER') || errorMessage.includes('invalid')) {
                    console.warn('Token-based join failed, trying without token (App ID only mode)...');
                    await this.client.join(appId, channelName, null, numericUid);
                    console.log('Successfully joined channel without token:', channelName);
                } else {
                    throw joinError;
                }
            }
            return true;
        } catch (error) {
            console.error('Failed to join Agora channel:', error);
            throw error;
        } finally {
            this.isJoining = false;
        }
    }

    // Create and publish local tracks
    async createLocalTracks(enableVideo: boolean = true): Promise<void> {
        console.log('Agora: Creating local tracks, enableVideo:', enableVideo);

        // Try to create audio track
        try {
            this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            console.log('Agora: Audio track created successfully');
        } catch (audioError) {
            console.warn('Agora: Could not create audio track:', audioError);
            // Continue without audio
        }

        // Try to create video track if enabled
        if (enableVideo) {
            try {
                console.log('Agora: Requesting camera access...');
                this.localVideoTrack = await AgoraRTC.createCameraVideoTrack({
                    encoderConfig: {
                        width: 640,
                        height: 480,
                        frameRate: 30,
                        bitrateMin: 400,
                        bitrateMax: 1000,
                    },
                });
                console.log('Agora: Video track created successfully, track ID:', this.localVideoTrack.getTrackId());
            } catch (videoError) {
                console.error('Agora: Could not create video track:', videoError);
                // Continue without video
            }
        }

        // Log final status
        console.log('Agora: Track creation complete - Audio:', !!this.localAudioTrack, 'Video:', !!this.localVideoTrack);

        // If neither track was created, warn but don't fail
        if (!this.localAudioTrack && !this.localVideoTrack) {
            console.warn('Agora: No audio or video devices available - joining as listener only');
        }
    }

    // Publish local tracks
    async publishTracks(): Promise<void> {
        if (!this.client) {
            console.warn('Cannot publish tracks - client not initialized');
            return;
        }

        if (this.client.connectionState !== 'CONNECTED') {
            console.warn('Cannot publish tracks - not connected to channel');
            return;
        }

        const tracks: (IMicrophoneAudioTrack | ICameraVideoTrack)[] = [];
        if (this.localAudioTrack) tracks.push(this.localAudioTrack);
        if (this.localVideoTrack) tracks.push(this.localVideoTrack);

        if (tracks.length > 0) {
            await this.client.publish(tracks);
            console.log('Published local tracks');
        } else {
            console.log('No tracks to publish - joining as listener');
        }
    }

    // Play local video in a container
    playLocalVideo(containerId: string): void {
        if (this.localVideoTrack) {
            try {
                console.log('Agora: Playing local video track in container:', containerId);
                this.localVideoTrack.play(containerId);
                console.log('Agora: Local video playing');
            } catch (error) {
                console.error('Agora: Error playing local video:', error);
            }
        } else {
            console.warn('Agora: No local video track to play');
        }
    }

    // Play remote user's video
    playRemoteVideo(user: IAgoraRTCRemoteUser, containerId: string): void {
        if (user.videoTrack) {
            try {
                console.log('Agora: Playing remote video for user', user.uid, 'in container:', containerId);
                user.videoTrack.play(containerId);
                console.log('Agora: Remote video playing for user', user.uid);
            } catch (error) {
                console.error('Agora: Error playing remote video:', error);
            }
        } else {
            console.warn('Agora: No video track for remote user', user.uid);
        }
    }

    // Play remote user's audio
    playRemoteAudio(user: IAgoraRTCRemoteUser): void {
        if (user.audioTrack) {
            user.audioTrack.play();
        }
    }

    // Toggle local audio (mute/unmute)
    async toggleAudio(enabled: boolean): Promise<void> {
        if (this.localAudioTrack) {
            await this.localAudioTrack.setEnabled(enabled);
            console.log('Audio', enabled ? 'unmuted' : 'muted');
        }
    }

    // Toggle local video (on/off)
    async toggleVideo(enabled: boolean): Promise<void> {
        if (this.localVideoTrack) {
            await this.localVideoTrack.setEnabled(enabled);
            console.log('Video', enabled ? 'enabled' : 'disabled');
        }
    }

    // Get local video track
    getLocalVideoTrack(): ICameraVideoTrack | null {
        return this.localVideoTrack;
    }

    // Get local audio track
    getLocalAudioTrack(): IMicrophoneAudioTrack | null {
        return this.localAudioTrack;
    }

    // Leave the channel and clean up
    async leaveChannel(): Promise<void> {
        this.isJoining = false;

        // Stop and close local tracks
        if (this.localAudioTrack) {
            this.localAudioTrack.stop();
            this.localAudioTrack.close();
            this.localAudioTrack = null;
        }

        if (this.localVideoTrack) {
            this.localVideoTrack.stop();
            this.localVideoTrack.close();
            this.localVideoTrack = null;
        }

        // Leave channel if connected
        if (this.client) {
            const state = this.client.connectionState;
            if (state === 'CONNECTED' || state === 'CONNECTING') {
                try {
                    await this.client.leave();
                    console.log('Left channel');
                } catch (error) {
                    console.warn('Error leaving channel:', error);
                }
            }
            // Reset client
            this.client = null;
        }
    }

    // Clean up everything
    async destroy(): Promise<void> {
        await this.leaveChannel();
        this.client = null;
        this.eventHandlers = {};
    }

    // Check if client is connected
    isConnected(): boolean {
        return this.client?.connectionState === 'CONNECTED';
    }
}

export const agoraService = new AgoraService();
export default agoraService;
