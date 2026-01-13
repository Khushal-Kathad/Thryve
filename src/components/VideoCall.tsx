import { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import styled, { keyframes } from 'styled-components';
import GroupIcon from '@mui/icons-material/Group';
import {
    selectCurrentCall,
    selectIsMuted,
    selectIsVideoEnabled,
    selectIsMinimized,
    selectRemoteUsers,
    endCall,
    toggleMute,
    toggleVideo,
    toggleMinimize,
} from '../features/callSlice';
import { agoraService } from '../services/agoraService';
import { callService } from '../services/callService';
import CallControls from './CallControls';
import type { IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';

interface VideoCallProps {
    userId: string;
}

const VideoCall = ({ userId }: VideoCallProps) => {
    const dispatch = useDispatch();
    const currentCall = useSelector(selectCurrentCall);
    const isMuted = useSelector(selectIsMuted);
    const isVideoEnabled = useSelector(selectIsVideoEnabled);
    const isMinimized = useSelector(selectIsMinimized);
    const remoteUsers = useSelector(selectRemoteUsers);

    const localVideoRef = useRef<HTMLDivElement>(null);
    const remoteVideoRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [callDuration, setCallDuration] = useState(0);
    const [isConnecting, setIsConnecting] = useState(true);
    const [remoteUsersList, setRemoteUsersList] = useState<IAgoraRTCRemoteUser[]>([]);
    const [participantJoinedAt, setParticipantJoinedAt] = useState<number>(Date.now());

    // Initialize call
    useEffect(() => {
        if (!currentCall) return;

        const initializeCall = async () => {
            try {
                setIsConnecting(true);
                setParticipantJoinedAt(Date.now());

                // Initialize Agora with event handlers
                await agoraService.initialize({
                    onUserJoined: (user) => {
                        console.log('Remote user joined:', user.uid);
                        setRemoteUsersList(prev => {
                            if (prev.find(u => u.uid === user.uid)) return prev;
                            return [...prev, user];
                        });
                    },
                    onUserLeft: (user) => {
                        console.log('Remote user left:', user.uid);
                        setRemoteUsersList(prev => prev.filter(u => u.uid !== user.uid));
                        remoteVideoRefs.current.delete(String(user.uid));
                    },
                    onUserPublished: async (user, mediaType) => {
                        console.log('Remote user published:', user.uid, mediaType);

                        // Add user to list if not already there
                        setRemoteUsersList(prev => {
                            if (prev.find(u => u.uid === user.uid)) return prev;
                            return [...prev, user];
                        });

                        if (mediaType === 'video') {
                            // Play video after a short delay to ensure DOM is ready
                            setTimeout(() => {
                                const containerId = `remote-video-${user.uid}`;
                                const container = document.getElementById(containerId);
                                if (container) {
                                    agoraService.playRemoteVideo(user, containerId);
                                }
                            }, 100);
                        }
                        if (mediaType === 'audio') {
                            agoraService.playRemoteAudio(user);
                        }
                    },
                    onUserUnpublished: (user, mediaType) => {
                        console.log('Remote user unpublished:', user.uid, mediaType);
                    },
                });

                // Join the Agora channel
                await agoraService.joinChannel(currentCall.channelName, userId);

                // Create and publish local tracks
                await agoraService.createLocalTracks(currentCall.callType === 'video');
                await agoraService.publishTracks();

                // Play local video
                if (localVideoRef.current && currentCall.callType === 'video') {
                    agoraService.playLocalVideo(localVideoRef.current.id);
                }

                setIsConnecting(false);
            } catch (error) {
                console.error('Error initializing call:', error);
                handleEndCall();
            }
        };

        initializeCall();

        // Cleanup on unmount
        return () => {
            agoraService.leaveChannel();
        };
    }, [currentCall, userId]);

    // Call duration timer
    useEffect(() => {
        if (!currentCall || isConnecting) return;

        const timer = setInterval(() => {
            setCallDuration((prev) => prev + 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [currentCall, isConnecting]);

    // Handle mute toggle
    useEffect(() => {
        agoraService.toggleAudio(!isMuted);
    }, [isMuted]);

    // Handle video toggle
    useEffect(() => {
        agoraService.toggleVideo(isVideoEnabled);
    }, [isVideoEnabled]);

    const handleEndCall = useCallback(async () => {
        if (currentCall) {
            if (currentCall.isGroupCall) {
                // For group calls, leave the call (don't end for everyone)
                await callService.leaveGroupCall(
                    currentCall.id,
                    userId,
                    currentCall.callerId === userId ? currentCall.callerName : 'Unknown',
                    currentCall.callerId === userId ? currentCall.callerPhoto : '',
                    participantJoinedAt
                );
            } else {
                // For 1-to-1 calls, end the call
                await callService.endCall(currentCall.id);
            }
        }
        await agoraService.leaveChannel();
        dispatch(endCall());
    }, [currentCall, userId, participantJoinedAt, dispatch]);

    const handleToggleMute = () => {
        dispatch(toggleMute());
    };

    const handleToggleVideo = () => {
        dispatch(toggleVideo());
    };

    const handleToggleMinimize = () => {
        dispatch(toggleMinimize());
    };

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!currentCall) return null;

    const isVideoCall = currentCall.callType === 'video';
    const isGroupCall = currentCall.isGroupCall;

    // For 1-to-1 calls, show the other person's info
    // For group calls, show channel name
    const remoteName = isGroupCall
        ? currentCall.receiverName // This is the channel name for group calls
        : currentCall.callerId === userId
            ? currentCall.receiverName
            : currentCall.callerName;

    const remotePhoto = isGroupCall
        ? '' // No single photo for group calls
        : currentCall.callerId === userId
            ? currentCall.receiverPhoto
            : currentCall.callerPhoto;

    const participantCount = isGroupCall
        ? (currentCall.participants?.length || 1)
        : (remoteUsersList.length > 0 ? 2 : 1);

    if (isMinimized) {
        return (
            <MinimizedCall onClick={handleToggleMinimize}>
                {isGroupCall ? (
                    <MinimizedGroupIcon>
                        <GroupIcon />
                    </MinimizedGroupIcon>
                ) : (
                    <MinimizedAvatar>
                        {remotePhoto ? (
                            <img src={remotePhoto} alt={remoteName} />
                        ) : (
                            <GroupIcon />
                        )}
                    </MinimizedAvatar>
                )}
                <MinimizedInfo>
                    <MinimizedName>
                        {isGroupCall ? `#${remoteName}` : remoteName}
                    </MinimizedName>
                    <MinimizedDuration>
                        {formatDuration(callDuration)}
                        {isGroupCall && ` • ${participantCount} participant${participantCount !== 1 ? 's' : ''}`}
                    </MinimizedDuration>
                </MinimizedInfo>
            </MinimizedCall>
        );
    }

    return (
        <CallContainer>
            {isVideoCall ? (
                <>
                    <RemoteVideoContainer>
                        {remoteUsersList.length > 0 ? (
                            <VideoGrid $count={remoteUsersList.length}>
                                {remoteUsersList.map((user) => (
                                    <RemoteVideoWrapper key={user.uid}>
                                        <RemoteVideo id={`remote-video-${user.uid}`} />
                                        <RemoteUserLabel>{String(user.uid)}</RemoteUserLabel>
                                    </RemoteVideoWrapper>
                                ))}
                            </VideoGrid>
                        ) : (
                            <NoVideoPlaceholder>
                                {isGroupCall ? (
                                    <>
                                        <PlaceholderGroupIcon>
                                            <GroupIcon />
                                        </PlaceholderGroupIcon>
                                        <PlaceholderName>#{remoteName}</PlaceholderName>
                                        <PlaceholderSubtext>
                                            Waiting for others to join...
                                        </PlaceholderSubtext>
                                    </>
                                ) : (
                                    <>
                                        <PlaceholderAvatar>
                                            {remotePhoto ? (
                                                <img src={remotePhoto} alt={remoteName} />
                                            ) : (
                                                <GroupIcon />
                                            )}
                                        </PlaceholderAvatar>
                                        <PlaceholderName>{remoteName}</PlaceholderName>
                                    </>
                                )}
                                {isConnecting && <ConnectingText>Connecting...</ConnectingText>}
                            </NoVideoPlaceholder>
                        )}
                    </RemoteVideoContainer>
                    <LocalVideoContainer>
                        <LocalVideo id="local-video" ref={localVideoRef} />
                        {!isVideoEnabled && (
                            <VideoOffOverlay>
                                <span>Camera Off</span>
                            </VideoOffOverlay>
                        )}
                    </LocalVideoContainer>
                </>
            ) : (
                <AudioCallContainer>
                    {isGroupCall ? (
                        <AudioGroupIcon>
                            <GroupIcon />
                        </AudioGroupIcon>
                    ) : (
                        <AudioCallAvatar>
                            {remotePhoto ? (
                                <img src={remotePhoto} alt={remoteName} />
                            ) : (
                                <GroupIcon />
                            )}
                        </AudioCallAvatar>
                    )}
                    <AudioCallName>
                        {isGroupCall ? `#${remoteName}` : remoteName}
                    </AudioCallName>
                    <AudioCallStatus>
                        {isConnecting ? 'Connecting...' : formatDuration(callDuration)}
                    </AudioCallStatus>
                    {isGroupCall && (
                        <ParticipantCount>
                            <GroupIcon fontSize="small" />
                            {participantCount} participant{participantCount !== 1 ? 's' : ''}
                        </ParticipantCount>
                    )}
                </AudioCallContainer>
            )}

            <CallHeader>
                <CallInfo>
                    <CallDuration>{formatDuration(callDuration)}</CallDuration>
                    {isConnecting && <ConnectingDot />}
                    {isGroupCall && (
                        <ParticipantBadge>
                            <GroupIcon fontSize="small" />
                            {participantCount}
                        </ParticipantBadge>
                    )}
                </CallInfo>
            </CallHeader>

            <CallControls
                isMuted={isMuted}
                isVideoEnabled={isVideoEnabled}
                isVideoCall={isVideoCall}
                onToggleMute={handleToggleMute}
                onToggleVideo={handleToggleVideo}
                onEndCall={handleEndCall}
                onMinimize={handleToggleMinimize}
            />
        </CallContainer>
    );
};

const fadeIn = keyframes`
    from { opacity: 0; }
    to { opacity: 1; }
`;

const pulse = keyframes`
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
`;

const CallContainer = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #0a0a0f;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    animation: ${fadeIn} 0.3s ease-out;
`;

const RemoteVideoContainer = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #111119;
    position: relative;
`;

const RemoteVideo = styled.div`
    width: 100%;
    height: 100%;

    video {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
`;

const NoVideoPlaceholder = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
`;

const PlaceholderAvatar = styled.div`
    width: 150px;
    height: 150px;
    border-radius: 50%;
    overflow: hidden;
    border: 4px solid var(--accent-primary);

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
`;

const PlaceholderName = styled.h2`
    color: var(--text-primary);
    margin-top: 20px;
    font-size: 1.5rem;
`;

const ConnectingText = styled.span`
    color: var(--text-muted);
    margin-top: 10px;
    animation: ${pulse} 1.5s infinite;
`;

const LocalVideoContainer = styled.div`
    position: absolute;
    bottom: 120px;
    right: 20px;
    width: 180px;
    height: 240px;
    border-radius: 12px;
    overflow: hidden;
    border: 2px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`;

const LocalVideo = styled.div`
    width: 100%;
    height: 100%;
    background: #1a1a2e;

    video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transform: scaleX(-1); /* Mirror local video */
    }
`;

const VideoOffOverlay = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #1a1a2e;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: 0.85rem;
`;

const AudioCallContainer = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(180deg, #1a1a2e 0%, #0a0a0f 100%);
`;

const AudioCallAvatar = styled.div`
    width: 180px;
    height: 180px;
    border-radius: 50%;
    overflow: hidden;
    border: 4px solid var(--accent-primary);
    box-shadow: 0 0 60px rgba(88, 101, 242, 0.3);

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
`;

const AudioCallName = styled.h2`
    color: var(--text-primary);
    margin-top: 24px;
    font-size: 1.75rem;
    font-weight: 600;
`;

const AudioCallStatus = styled.div`
    color: var(--text-secondary);
    margin-top: 8px;
    font-size: 1.1rem;
`;

const CallHeader = styled.div`
    position: absolute;
    top: 20px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    padding: 0 20px;
`;

const CallInfo = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(0, 0, 0, 0.5);
    padding: 8px 16px;
    border-radius: 20px;
`;

const CallDuration = styled.span`
    color: var(--text-primary);
    font-size: 1rem;
    font-weight: 500;
`;

const ConnectingDot = styled.div`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent-success);
    animation: ${pulse} 1s infinite;
`;

const MinimizedCall = styled.div`
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(30, 35, 60, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    z-index: 9999;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s ease;

    &:hover {
        transform: scale(1.02);
    }
`;

const MinimizedAvatar = styled.div`
    width: 40px;
    height: 40px;
    border-radius: 50%;
    overflow: hidden;
    border: 2px solid var(--accent-success);

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
`;

const MinimizedInfo = styled.div`
    display: flex;
    flex-direction: column;
`;

const MinimizedName = styled.span`
    color: var(--text-primary);
    font-size: 0.9rem;
    font-weight: 500;
`;

const MinimizedDuration = styled.span`
    color: var(--accent-success);
    font-size: 0.8rem;
`;

const MinimizedGroupIcon = styled.div`
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--accent-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--accent-success);

    svg {
        font-size: 1.3rem;
        color: white;
    }
`;

const VideoGrid = styled.div<{ $count: number }>`
    width: 100%;
    height: 100%;
    display: grid;
    gap: 4px;
    padding: 4px;
    grid-template-columns: ${(props) => {
        if (props.$count <= 1) return '1fr';
        if (props.$count <= 4) return 'repeat(2, 1fr)';
        return 'repeat(3, 1fr)';
    }};
    grid-auto-rows: 1fr;
`;

const RemoteVideoWrapper = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 8px;
    overflow: hidden;
    background: #1a1a2e;
`;

const RemoteUserLabel = styled.div`
    position: absolute;
    bottom: 8px;
    left: 8px;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
`;

const PlaceholderGroupIcon = styled.div`
    width: 150px;
    height: 150px;
    border-radius: 50%;
    background: var(--gradient-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 4px solid var(--accent-primary);

    svg {
        font-size: 60px;
        color: white;
    }
`;

const PlaceholderSubtext = styled.span`
    color: var(--text-muted);
    margin-top: 8px;
    font-size: 0.9rem;
`;

const AudioGroupIcon = styled.div`
    width: 180px;
    height: 180px;
    border-radius: 50%;
    background: var(--gradient-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 4px solid var(--accent-primary);
    box-shadow: 0 0 60px rgba(88, 101, 242, 0.3);

    svg {
        font-size: 70px;
        color: white;
    }
`;

const ParticipantCount = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-muted);
    font-size: 1rem;
    margin-top: 16px;

    svg {
        font-size: 1.2rem;
    }
`;

const ParticipantBadge = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgba(255, 255, 255, 0.1);
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.85rem;
    color: var(--text-secondary);

    svg {
        font-size: 0.9rem;
    }
`;

export default VideoCall;
