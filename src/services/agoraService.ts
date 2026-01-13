import AgoraRTC, {
    IAgoraRTCClient,
    IMicrophoneAudioTrack,
    ICameraVideoTrack,
    IAgoraRTCRemoteUser,
} from 'agora-rtc-sdk-ng';

const APP_ID = import.meta.env.VITE_AGORA_APP_ID;
const TOKEN_WORKER_URL = import.meta.env.VITE_AGORA_TOKEN_WORKER_URL;

// Configure Agora SDK
AgoraRTC.setLogLevel(3); // Warning level

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
    async joinChannel(channelName: string, uid: string): Promise<void> {
        if (!this.client) {
            console.warn('Client not initialized, initializing now...');
            await this.initialize();
        }

        if (!this.client) {
            throw new Error('Failed to initialize Agora client');
        }

        if (!APP_ID) {
            throw new Error('Agora App ID not configured');
        }

        // Prevent double joining
        if (this.isJoining) {
            console.log('Already joining a channel, please wait...');
            return;
        }

        const state = this.client.connectionState;
        if (state === 'CONNECTED') {
            console.log('Already connected to a channel');
            return;
        }

        if (state === 'CONNECTING') {
            console.log('Already connecting to a channel');
            return;
        }

        this.isJoining = true;
        try {
            // Fetch token from Cloudflare Worker
            let token = null;
            if (TOKEN_WORKER_URL) {
                try {
                    const response = await fetch(
                        `${TOKEN_WORKER_URL}?channel=${encodeURIComponent(channelName)}&uid=${encodeURIComponent(uid)}`
                    );
                    if (response.ok) {
                        const data = await response.json();
                        token = data.token;
                        console.log('Token fetched for channel:', channelName);
                    } else {
                        console.warn('Failed to fetch token:', await response.text());
                    }
                } catch (tokenError) {
                    console.warn('Error fetching token:', tokenError);
                }
            }

            await this.client.join(APP_ID, channelName, token, uid);
            console.log('Joined channel:', channelName);
        } finally {
            this.isJoining = false;
        }
    }

    // Create and publish local tracks
    async createLocalTracks(enableVideo: boolean = true): Promise<void> {
        // Try to create audio track
        try {
            this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            console.log('Audio track created');
        } catch (audioError) {
            console.warn('Could not create audio track (no microphone?):', audioError);
            // Continue without audio
        }

        // Try to create video track if enabled
        if (enableVideo) {
            try {
                this.localVideoTrack = await AgoraRTC.createCameraVideoTrack({
                    encoderConfig: {
                        width: 640,
                        height: 480,
                        frameRate: 30,
                        bitrateMin: 400,
                        bitrateMax: 1000,
                    },
                });
                console.log('Video track created');
            } catch (videoError) {
                console.warn('Could not create video track (no camera?):', videoError);
                // Continue without video
            }
        }

        // If neither track was created, warn but don't fail
        if (!this.localAudioTrack && !this.localVideoTrack) {
            console.warn('No audio or video devices available - joining as listener only');
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
            this.localVideoTrack.play(containerId);
        }
    }

    // Play remote user's video
    playRemoteVideo(user: IAgoraRTCRemoteUser, containerId: string): void {
        if (user.videoTrack) {
            user.videoTrack.play(containerId);
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
