import React, { useEffect, useRef, useState, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import TagIcon from '@mui/icons-material/Tag';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CallIcon from '@mui/icons-material/Call';
import VideocamIcon from '@mui/icons-material/Videocam';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import GroupsIcon from '@mui/icons-material/Groups';
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
import { typingService, TypingUser } from '../services/typingService';
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
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
    const [isStarred, setIsStarred] = useState(false);

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

    // Listen for typing users
    useEffect(() => {
        if (roomId === 'null' || !user) {
            setTypingUsers([]);
            return;
        }

        const unsubscribe = typingService.listenForTyping(roomId, user.uid, (users) => {
            setTypingUsers(users);
        });

        return () => {
            unsubscribe();
            typingService.stopListening();
        };
    }, [roomId, user]);

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
                    <WelcomeContent>
                        <WelcomeIcon>
                            <ChatBubbleOutlineIcon />
                        </WelcomeIcon>
                        <WelcomeTitle>Welcome to Thryve Chat</WelcomeTitle>
                        <WelcomeText>
                            Select a group or start a conversation from the sidebar to begin chatting
                        </WelcomeText>
                        <WelcomeFeatures>
                            <FeatureItem>
                                <FeatureIcon><GroupsIcon /></FeatureIcon>
                                <FeatureText>Create groups</FeatureText>
                            </FeatureItem>
                            <FeatureItem>
                                <FeatureIcon><VideocamIcon /></FeatureIcon>
                                <FeatureText>Video calls</FeatureText>
                            </FeatureItem>
                            <FeatureItem>
                                <FeatureIcon><ChatBubbleOutlineIcon /></FeatureIcon>
                                <FeatureText>Real-time chat</FeatureText>
                            </FeatureItem>
                        </WelcomeFeatures>
                    </WelcomeContent>
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
                            {roomMessages?.docs.length || 0} messages
                        </ChannelDescription>
                    </ChannelInfo>
                </HeaderLeft>
                <HeaderRight>
                    <HeaderActions>
                        <ActionButton
                            onClick={() => setIsStarred(!isStarred)}
                            $active={isStarred}
                            title={isStarred ? 'Unstar' : 'Star channel'}
                        >
                            {isStarred ? <StarIcon /> : <StarBorderIcon />}
                        </ActionButton>
                        <ActionButton
                            title="Voice Call"
                            onClick={() => handleStartGroupCall('audio')}
                            disabled={isInCall || isStartingCall}
                        >
                            <CallIcon />
                        </ActionButton>
                        <ActionButton
                            title="Video Call"
                            onClick={() => handleStartGroupCall('video')}
                            disabled={isInCall || isStartingCall}
                        >
                            <VideocamIcon />
                        </ActionButton>
                    </HeaderActions>
                    <Separator />
                    <MembersButton
                        title="Members"
                        onClick={() => setShowMembersPanel(!showMembersPanel)}
                        $active={showMembersPanel}
                    >
                        <PeopleOutlineIcon />
                        <span className="button-text">Members</span>
                    </MembersButton>
                    <ActionButton title="Details">
                        <InfoOutlinedIcon />
                    </ActionButton>
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
                                <LoadingText>Loading messages...</LoadingText>
                            </LoadingContainer>
                        ) : (
                            <>
                                <ChannelStart>
                                    <ChannelStartBadge>
                                        <TagIcon />
                                    </ChannelStartBadge>
                                    <ChannelStartTitle>
                                        Welcome to #{roomDetails?.data()?.name}
                                    </ChannelStartTitle>
                                    <ChannelStartText>
                                        This is the beginning of your conversation in this group. Send a message to get started!
                                    </ChannelStartText>
                                </ChannelStart>

                                <MessagesWrapper>
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
                                </MessagesWrapper>
                                <ChatBottom ref={chatRef} />
                            </>
                        )}
                    </ChatMessages>

                    {/* Typing Indicator */}
                    {typingUsers.length > 0 && (
                        <TypingIndicator>
                            <TypingDots>
                                <span></span>
                                <span></span>
                                <span></span>
                            </TypingDots>
                            <TypingText>
                                {typingUsers.length === 1
                                    ? `${typingUsers[0].odUserName} is typing...`
                                    : typingUsers.length === 2
                                    ? `${typingUsers[0].odUserName} and ${typingUsers[1].odUserName} are typing...`
                                    : `${typingUsers.length} people are typing...`}
                            </TypingText>
                        </TypingIndicator>
                    )}

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

const bounce = keyframes`
    0%, 60%, 100% {
        transform: translateY(0);
    }
    30% {
        transform: translateY(-4px);
    }
`;

const pulse = keyframes`
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
`;

// Styled Components
const ChatContainer = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-secondary);
    position: relative;
    overflow: hidden;
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
    min-width: 0;
`;

const WelcomeScreen = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xl);
    background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
`;

const WelcomeContent = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    max-width: 480px;
    animation: ${fadeIn} 0.5s ease-out;
`;

const WelcomeIcon = styled.div`
    width: 100px;
    height: 100px;
    border-radius: var(--radius-xl);
    background: var(--gradient-primary);
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
    margin-bottom: var(--spacing-md);
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;

    @media (max-width: 480px) {
        font-size: 1.5rem;
    }
`;

const WelcomeText = styled.p`
    font-size: 1rem;
    color: var(--text-secondary);
    margin-bottom: var(--spacing-xl);
    line-height: 1.6;

    @media (max-width: 480px) {
        font-size: 0.9rem;
    }
`;

const WelcomeFeatures = styled.div`
    display: flex;
    gap: var(--spacing-lg);
    flex-wrap: wrap;
    justify-content: center;

    @media (max-width: 480px) {
        gap: var(--spacing-md);
    }
`;

const FeatureItem = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-sm);
`;

const FeatureIcon = styled.div`
    width: 48px;
    height: 48px;
    border-radius: var(--radius-lg);
    background: var(--purple-50);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);

    svg {
        font-size: 1.5rem;
        color: var(--accent-primary);
    }

    &:hover {
        background: var(--purple-100);
        transform: scale(1.1);
    }
`;

const FeatureText = styled.span`
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-weight: 500;
`;

const ChatHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border-light);
    gap: var(--spacing-md);

    @media (max-width: 768px) {
        padding: var(--spacing-sm) var(--spacing-md);
    }
`;

const HeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    min-width: 0;
    flex: 1;
`;

const ChannelIcon = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-lg);
    background: var(--purple-50);
    flex-shrink: 0;

    svg {
        font-size: 1.3rem;
        color: var(--accent-primary);
    }

    @media (max-width: 480px) {
        width: 36px;
        height: 36px;

        svg {
            font-size: 1.1rem;
        }
    }
`;

const ChannelInfo = styled.div`
    display: flex;
    flex-direction: column;
    min-width: 0;
`;

const ChannelName = styled.h3`
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    @media (max-width: 480px) {
        font-size: 1rem;
    }
`;

const ChannelDescription = styled.span`
    font-size: 0.8rem;
    color: var(--text-muted);
`;

const HeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    flex-shrink: 0;
`;

const HeaderActions = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);

    @media (max-width: 600px) {
        display: none;
    }
`;

const Separator = styled.div`
    width: 1px;
    height: 24px;
    background: var(--border-light);
    margin: 0 var(--spacing-xs);

    @media (max-width: 600px) {
        display: none;
    }
`;

const ActionButton = styled.button<{ $active?: boolean; disabled?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    color: ${props => {
        if (props.disabled) return 'var(--text-muted)';
        if (props.$active) return 'var(--accent-warning)';
        return 'var(--text-secondary)';
    }};
    background: ${props => props.$active ? 'rgba(245, 158, 11, 0.1)' : 'transparent'};
    transition: all var(--transition-fast);
    cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
    opacity: ${props => props.disabled ? 0.5 : 1};

    svg {
        font-size: 1.2rem;
    }

    &:hover:not(:disabled) {
        background: var(--purple-50);
        color: var(--accent-primary);
    }
`;

const MembersButton = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    color: ${props => props.$active ? 'var(--accent-primary)' : 'var(--text-secondary)'};
    background: ${props => props.$active ? 'var(--purple-50)' : 'transparent'};
    font-size: 0.9rem;
    font-weight: 500;
    transition: all var(--transition-fast);

    svg {
        font-size: 1.1rem;
    }

    .button-text {
        @media (max-width: 600px) {
            display: none;
        }
    }

    &:hover {
        background: var(--purple-50);
        color: var(--accent-primary);
    }
`;

const DeleteButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    color: var(--text-muted);
    transition: all var(--transition-fast);

    svg {
        font-size: 1.2rem;
    }

    &:hover {
        background: rgba(239, 68, 68, 0.1);
        color: var(--accent-danger);
    }
`;

const ChatMessages = styled.div`
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: var(--spacing-md);

    /* Custom scrollbar */
    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: var(--border-medium);
        border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: var(--text-muted);
    }

    @media (max-width: 480px) {
        padding: var(--spacing-sm);
    }
`;

const MessagesWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
`;

const LoadingContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: var(--spacing-lg);
`;

const LoadingSpinner = styled.div`
    width: 48px;
    height: 48px;
    border: 3px solid var(--border-light);
    border-top-color: var(--accent-primary);
    border-radius: 50%;
    animation: ${spin} 1s linear infinite;
`;

const LoadingText = styled.span`
    color: var(--text-muted);
    font-size: 0.9rem;
    animation: ${pulse} 1.5s ease-in-out infinite;
`;

const ChannelStart = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--spacing-xl);
    margin-bottom: var(--spacing-lg);
    animation: ${fadeIn} 0.5s ease-out;
    text-align: center;
`;

const ChannelStartBadge = styled.div`
    width: 64px;
    height: 64px;
    border-radius: var(--radius-xl);
    background: var(--gradient-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--spacing-lg);
    box-shadow: var(--shadow-glow);

    svg {
        font-size: 32px;
        color: white;
    }
`;

const ChannelStartTitle = styled.h2`
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: var(--spacing-sm);

    @media (max-width: 480px) {
        font-size: 1.25rem;
    }
`;

const ChannelStartText = styled.p`
    color: var(--text-muted);
    font-size: 0.95rem;
    max-width: 400px;
    line-height: 1.5;
`;

const ChatBottom = styled.div`
    height: 80px;
`;

const TypingIndicator = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-lg);
    animation: ${fadeIn} 0.2s ease-out;
`;

const TypingDots = styled.div`
    display: flex;
    gap: 3px;
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--purple-50);
    border-radius: var(--radius-full);

    span {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--accent-primary);
        animation: ${bounce} 1.4s ease-in-out infinite;

        &:nth-child(2) {
            animation-delay: 0.2s;
        }

        &:nth-child(3) {
            animation-delay: 0.4s;
        }
    }
`;

const TypingText = styled.span`
    color: var(--text-muted);
    font-size: 0.85rem;
    font-style: italic;
`;
