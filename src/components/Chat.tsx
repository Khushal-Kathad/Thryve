import React, { useEffect, useRef, useState, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import TagIcon from '@mui/icons-material/Tag';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CallIcon from '@mui/icons-material/Call';
import VideocamIcon from '@mui/icons-material/Videocam';
import { useSelector, useDispatch } from 'react-redux';
import { selectRoomId, enterRoom } from '../features/appSlice';
import ChatInput from './ChatInput';
import { doc, orderBy, query, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useCollection, useDocument } from 'react-firebase-hooks/firestore';
import { collection } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import Message from './Message';
import { offlineService } from '../services/offlineService';
import { callService } from '../services/callService';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from './ui/ConfirmDialog';
import { setCurrentCall, selectIsInCall } from '../features/callSlice';
import MembersList from './MembersList';
import ActiveCallBanner from './ui/ActiveCallBanner';
import type { PendingMessage, Call } from '../types';

const Chat: React.FC = () => {
    const chatRef = useRef<HTMLDivElement>(null);
    const roomId = useSelector(selectRoomId);
    const isInCall = useSelector(selectIsInCall);
    const dispatch = useDispatch();
    const auth = getAuth();
    const [user] = useAuthState(auth);
    const { showToast } = useToast();
    const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isStartingCall, setIsStartingCall] = useState(false);
    const [showMembersPanel, setShowMembersPanel] = useState(false);
    const [activeChannelCall, setActiveChannelCall] = useState<Call | null>(null);
    const [isJoiningCall, setIsJoiningCall] = useState(false);

    const [roomDetails] = useDocument(
        roomId !== 'null' ? doc(db, 'rooms', roomId) : null
    );
    const [roomMessages, loading] = useCollection(
        roomId !== 'null'
            ? query(
                collection(db, 'rooms', roomId, 'messages'),
                orderBy('timestamp', 'asc')
            )
            : null
    );

    const loadPendingMessages = useCallback(async () => {
        if (roomId !== 'null') {
            const pending = await offlineService.getPendingMessagesForRoom(roomId);
            setPendingMessages(pending);
        } else {
            setPendingMessages([]);
        }
    }, [roomId]);

    useEffect(() => {
        loadPendingMessages();
    }, [loadPendingMessages]);

    useEffect(() => {
        chatRef?.current?.scrollIntoView({
            behavior: 'smooth',
        });
    }, [roomId, loading, pendingMessages]);

    // Listen for active group calls in this channel
    useEffect(() => {
        if (roomId === 'null') {
            setActiveChannelCall(null);
            return;
        }

        const unsubscribe = callService.listenForChannelCalls(roomId, (call) => {
            // Don't show banner if user is already in this call
            if (call && isInCall) {
                setActiveChannelCall(null);
            } else {
                setActiveChannelCall(call);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [roomId, isInCall]);

    // Check if current user is the channel creator
    const isChannelCreator = user && roomDetails?.data()?.createdBy === user.uid;

    const handleDeleteChannel = async () => {
        if (!roomId || roomId === 'null' || !isChannelCreator) return;

        setIsDeleting(true);
        try {
            // First delete all messages in the channel
            const messagesRef = collection(db, 'rooms', roomId, 'messages');
            const messagesSnapshot = await getDocs(messagesRef);
            const deletePromises = messagesSnapshot.docs.map(docItem =>
                deleteDoc(doc(db, 'rooms', roomId, 'messages', docItem.id))
            );
            await Promise.all(deletePromises);

            // Then delete the channel itself
            await deleteDoc(doc(db, 'rooms', roomId));

            // Reset to no room selected
            dispatch(enterRoom({ roomId: 'null' }));
            showToast('Channel deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting channel:', error);
            showToast('Failed to delete channel', 'error');
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    // Start a group call in the channel
    const handleStartGroupCall = async (callType: 'audio' | 'video') => {
        if (!user || !roomId || roomId === 'null' || isInCall || isStartingCall) return;

        setIsStartingCall(true);
        try {
            const call = await callService.createCall(
                user.uid,
                user.displayName || 'Unknown',
                user.photoURL || '',
                'channel', // receiverId - using 'channel' for group calls
                roomDetails?.data()?.name || 'Channel',
                '', // receiverPhoto
                roomId,
                callType,
                true // isGroupCall
            );

            dispatch(setCurrentCall(call));
            showToast(`Starting ${callType} call in #${roomDetails?.data()?.name}...`, 'info');

            // Listen for call status changes
            callService.listenForCallChanges(call.id, (updatedCall) => {
                if (updatedCall.status === 'ended') {
                    showToast('Call ended', 'info');
                }
            });
        } catch (error) {
            console.error('Error starting group call:', error);
            showToast('Failed to start call', 'error');
        } finally {
            setIsStartingCall(false);
        }
    };

    // Start a 1-to-1 call with a specific member
    const handleStartDirectCall = async (
        receiverId: string,
        receiverName: string,
        receiverPhoto: string,
        callType: 'audio' | 'video'
    ) => {
        if (!user || !roomId || roomId === 'null' || isInCall || isStartingCall) return;

        setIsStartingCall(true);
        try {
            const call = await callService.createCall(
                user.uid,
                user.displayName || 'Unknown',
                user.photoURL || '',
                receiverId,
                receiverName,
                receiverPhoto,
                roomId,
                callType,
                false // isGroupCall = false for 1-to-1
            );

            dispatch(setCurrentCall(call));
            showToast(`Calling ${receiverName}...`, 'info');

            // Listen for call status changes
            callService.listenForCallChanges(call.id, (updatedCall) => {
                if (updatedCall.status === 'rejected') {
                    showToast(`${receiverName} declined the call`, 'info');
                } else if (updatedCall.status === 'ended') {
                    showToast('Call ended', 'info');
                } else if (updatedCall.status === 'missed') {
                    showToast(`${receiverName} didn't answer`, 'info');
                }
            });
        } catch (error) {
            console.error('Error starting direct call:', error);
            showToast('Failed to start call', 'error');
        } finally {
            setIsStartingCall(false);
        }
    };

    // Join an existing group call
    const handleJoinGroupCall = async () => {
        if (!user || !activeChannelCall || isInCall || isJoiningCall) return;

        // Check if user is already a participant
        const isAlreadyParticipant = activeChannelCall.participants?.some(
            (p) => p.odUserId === user.uid
        );

        if (isAlreadyParticipant) {
            // User is already in call, just set current call without adding again
            dispatch(setCurrentCall(activeChannelCall));
            return;
        }

        setIsJoiningCall(true);
        try {
            await callService.joinGroupCall(
                activeChannelCall.id,
                user.uid,
                user.displayName || 'Unknown',
                user.photoURL || ''
            );

            dispatch(setCurrentCall(activeChannelCall));
            showToast('Joined the call', 'success');
        } catch (error) {
            console.error('Error joining group call:', error);
            showToast('Failed to join call', 'error');
        } finally {
            setIsJoiningCall(false);
        }
    };

    // End group call (only for call creator)
    const handleEndGroupCall = async () => {
        if (!activeChannelCall) return;

        try {
            await callService.endCall(activeChannelCall.id);
            setActiveChannelCall(null);
            showToast('Call ended for everyone', 'success');
        } catch (error) {
            console.error('Error ending group call:', error);
            showToast('Failed to end call', 'error');
        }
    };

    if (roomId === 'null') {
        return (
            <ChatContainer>
                <WelcomeScreen>
                    <WelcomeIcon>
                        <TagIcon />
                    </WelcomeIcon>
                    <WelcomeTitle>Welcome to Thryve Chat</WelcomeTitle>
                    <WelcomeText>
                        Select a channel from the sidebar to start chatting
                    </WelcomeText>
                </WelcomeScreen>
            </ChatContainer>
        );
    }

    return (
        <ChatContainer>
            <ChatHeader>
                <HeaderLeft>
                    <ChannelIcon>
                        <TagIcon />
                    </ChannelIcon>
                    <ChannelInfo>
                        <ChannelName>{roomDetails?.data()?.name}</ChannelName>
                        <ChannelDescription>
                            Start a conversation in #{roomDetails?.data()?.name}
                        </ChannelDescription>
                    </ChannelInfo>
                    <StarButton title="Star channel">
                        <StarBorderIcon />
                    </StarButton>
                </HeaderLeft>
                <HeaderRight>
                    <CallButton
                        title="Start Voice Call (Channel)"
                        onClick={() => handleStartGroupCall('audio')}
                        disabled={isInCall || isStartingCall}
                    >
                        <CallIcon />
                    </CallButton>
                    <CallButton
                        title="Start Video Call (Channel)"
                        onClick={() => handleStartGroupCall('video')}
                        disabled={isInCall || isStartingCall}
                    >
                        <VideocamIcon />
                    </CallButton>
                    <MembersButton
                        title="Members"
                        onClick={() => setShowMembersPanel(!showMembersPanel)}
                        $active={showMembersPanel}
                    >
                        <PeopleOutlineIcon />
                        <span>Members</span>
                    </MembersButton>
                    <HeaderButton title="Details">
                        <InfoOutlinedIcon />
                    </HeaderButton>
                    {isChannelCreator && (
                        <DeleteButton
                            title="Delete Channel"
                            onClick={() => setShowDeleteConfirm(true)}
                        >
                            <DeleteOutlineIcon />
                        </DeleteButton>
                    )}
                </HeaderRight>
            </ChatHeader>

            {/* Active Call Banner */}
            {activeChannelCall && !isInCall && (
                <ActiveCallBanner
                    call={activeChannelCall}
                    onJoin={handleJoinGroupCall}
                    onEndCall={handleEndGroupCall}
                    currentUserId={user?.uid}
                    isJoining={isJoiningCall}
                />
            )}

            <ChatBody>
                <ChatContent>
                    <ChatMessages>
                {loading ? (
                    <LoadingContainer>
                        <LoadingSpinner />
                        <span>Loading messages...</span>
                    </LoadingContainer>
                ) : (
                    <>
                        <ChannelStart>
                            <ChannelStartIcon>
                                <TagIcon />
                            </ChannelStartIcon>
                            <h2>#{roomDetails?.data()?.name}</h2>
                            <p>This is the start of the #{roomDetails?.data()?.name} channel.</p>
                        </ChannelStart>
                        {roomMessages?.docs.map((docItem) => {
                            const { message, timestamp, users, userImage, imageUrl, reactions } = docItem.data();
                            return (
                                <Message
                                    key={docItem.id}
                                    id={docItem.id}
                                    message={message}
                                    timestamp={timestamp}
                                    users={users}
                                    userImage={userImage}
                                    imageUrl={imageUrl}
                                    reactions={reactions}
                                    roomId={roomId}
                                    userId={user?.uid}
                                />
                            );
                        })}
                        {pendingMessages.map((msg) => (
                            <Message
                                key={msg.id}
                                id={msg.id}
                                message={msg.message}
                                timestamp={null}
                                users={msg.users}
                                userImage={msg.userImage}
                                imageUrl={msg.imageData?.base64}
                                isPending={true}
                                pendingStatus={msg.status}
                                roomId={roomId}
                                userId={user?.uid}
                            />
                        ))}
                        <ChatBottom ref={chatRef} />
                    </>
                )}
                </ChatMessages>

                <ChatInput
                    chatRef={chatRef}
                    channelName={roomDetails?.data()?.name}
                    channelId={roomId}
                    onPendingUpdate={loadPendingMessages}
                />
            </ChatContent>

                {/* Members Panel */}
                {showMembersPanel && user && (
                    <MembersList
                        roomMessages={roomMessages}
                        currentUserId={user.uid}
                        currentUserName={user.displayName || 'Unknown'}
                        currentUserPhoto={user.photoURL || ''}
                        onClose={() => setShowMembersPanel(false)}
                        onStartCall={handleStartDirectCall}
                        isInCall={isInCall}
                        roomId={roomId}
                        channelName={roomDetails?.data()?.name}
                        isPrivateChannel={!!roomDetails?.data()?.isPrivate || !!roomDetails?.data()?.passwordHash}
                        channelMembers={roomDetails?.data()?.members || []}
                        channelCreatorId={roomDetails?.data()?.createdBy}
                    />
                )}
            </ChatBody>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Delete Channel"
                message={`Are you sure you want to delete #${roomDetails?.data()?.name}? This will permanently delete all messages in this channel. This action cannot be undone.`}
                confirmText={isDeleting ? 'Deleting...' : 'Delete Channel'}
                cancelText="Cancel"
                onConfirm={handleDeleteChannel}
                onCancel={() => setShowDeleteConfirm(false)}
                danger
            />
        </ChatContainer>
    );
};

export default Chat;

// Animations
const fadeIn = keyframes`
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

const spin = keyframes`
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
`;

const float = keyframes`
    0%, 100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-10px);
    }
`;

// Styled Components
const ChatContainer = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    height: calc(100vh - var(--header-height));
    margin-top: var(--header-height);
    background: var(--bg-chat);
    position: relative;
`;

const ChatBody = styled.div`
    flex: 1;
    display: flex;
    overflow: hidden;
`;

const ChatContent = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

const WelcomeScreen = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xl);
    text-align: center;
    animation: ${fadeIn} 0.5s ease-out;
`;

const WelcomeIcon = styled.div`
    width: 100px;
    height: 100px;
    border-radius: var(--radius-xl);
    background: var(--gradient-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--spacing-xl);
    animation: ${float} 3s ease-in-out infinite;
    box-shadow: var(--shadow-glow);

    svg {
        font-size: 50px;
        color: white;
    }
`;

const WelcomeTitle = styled.h1`
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: var(--spacing-md);
    background: var(--gradient-accent);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
`;

const WelcomeText = styled.p`
    font-size: 1rem;
    color: var(--text-muted);
    max-width: 400px;
`;

const ChatHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md) var(--spacing-lg);
    border-bottom: 1px solid var(--glass-border);
    background: var(--glass-bg);
`;

const HeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
`;

const ChannelIcon = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    background: var(--glass-bg);

    svg {
        font-size: 1.2rem;
        color: var(--text-muted);
    }
`;

const ChannelInfo = styled.div`
    display: flex;
    flex-direction: column;
`;

const ChannelName = styled.h3`
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
`;

const ChannelDescription = styled.span`
    font-size: 0.75rem;
    color: var(--text-muted);
`;

const StarButton = styled.button`
    color: var(--text-muted);
    padding: var(--spacing-xs);
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);

    svg {
        font-size: 1.2rem;
    }

    &:hover {
        color: var(--accent-warning);
        background: var(--glass-bg);
    }
`;

const HeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
`;

const HeaderButton = styled.button`
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: 0.85rem;
    transition: all var(--transition-fast);

    svg {
        font-size: 1.1rem;
    }

    &:hover {
        background: var(--glass-bg-hover);
        color: var(--text-primary);
    }
`;

const MembersButton = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    color: ${props => props.$active ? 'var(--accent-primary)' : 'var(--text-secondary)'};
    font-size: 0.85rem;
    transition: all var(--transition-fast);
    background: ${props => props.$active ? 'var(--glass-bg-hover)' : 'transparent'};

    svg {
        font-size: 1.1rem;
    }

    &:hover {
        background: var(--glass-bg-hover);
        color: ${props => props.$active ? 'var(--accent-primary)' : 'var(--text-primary)'};
    }
`;

const DeleteButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    color: var(--text-muted);
    transition: all var(--transition-fast);

    svg {
        font-size: 1.2rem;
    }

    &:hover {
        background: rgba(233, 69, 96, 0.1);
        color: var(--accent-danger);
    }
`;

const CallButton = styled.button<{ disabled?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    color: ${props => props.disabled ? 'var(--text-muted)' : 'var(--text-secondary)'};
    transition: all var(--transition-fast);
    cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
    opacity: ${props => props.disabled ? 0.5 : 1};

    svg {
        font-size: 1.2rem;
    }

    &:hover:not(:disabled) {
        background: rgba(59, 165, 92, 0.1);
        color: var(--accent-success);
    }
`;

const ChatMessages = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-md);
`;

const LoadingContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: var(--spacing-md);
    color: var(--text-muted);
`;

const LoadingSpinner = styled.div`
    width: 40px;
    height: 40px;
    border: 3px solid var(--glass-border);
    border-top-color: var(--accent-primary);
    border-radius: 50%;
    animation: ${spin} 1s linear infinite;
`;

const ChannelStart = styled.div`
    padding: var(--spacing-xl) 0;
    margin-bottom: var(--spacing-lg);
    animation: ${fadeIn} 0.5s ease-out;

    h2 {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: var(--spacing-xs);
    }

    p {
        color: var(--text-muted);
        font-size: 0.9rem;
    }
`;

const ChannelStartIcon = styled.div`
    width: 60px;
    height: 60px;
    border-radius: var(--radius-lg);
    background: var(--glass-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--spacing-md);

    svg {
        font-size: 30px;
        color: var(--accent-primary);
    }
`;

const ChatBottom = styled.div`
    height: 100px;
`;
