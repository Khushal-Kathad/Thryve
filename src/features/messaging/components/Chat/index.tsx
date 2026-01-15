import React, { useRef, useState, useEffect, useCallback } from 'react';
import TagIcon from '@mui/icons-material/Tag';
import PersonIcon from '@mui/icons-material/Person';
import { useSelector, useDispatch } from 'react-redux';
import { selectRoomId, enterRoom } from '../../../../features/appSlice';
import { selectIsInCall } from '../../../../features/callSlice';
import { getAuth } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';

// Hooks
import { useMessages } from '../../hooks/useMessages';
import { useMessageSearch } from '../../hooks/useMessageSearch';
import { useTypingIndicator } from '../../hooks/useTypingIndicator';
import { useReplyState, ReplyData } from '../../hooks/useReplyState';
import { useCallManagement } from '../../../calls/hooks/useCallManagement';
import { useChannelCalls } from '../../../calls/hooks/useChannelCalls';

// Components
import WelcomeScreen from './WelcomeScreen';
import ChatHeader from './ChatHeader';
import SearchBar from './SearchBar';
import TypingIndicator from './TypingIndicator';
import Message from '../../../../components/Message';
import ChatInput from '../../../../components/ChatInput';
import MembersList from '../../../../components/MembersList';
import ActiveCallBanner from '../../../../components/ui/ActiveCallBanner';
import ConfirmDialog from '../../../../components/ui/ConfirmDialog';

// Services
import { userService } from '../../../../services/userService';
import { useToast } from '../../../../context/ToastContext';

// Types
import type { Room, Message as MessageType } from '../../../../types';
import type { Timestamp } from 'firebase/firestore';

// Message document data type
interface MessageData {
    message: string;
    timestamp: Timestamp | null;
    users: string;
    userImage: string;
    imageUrl?: string;
    reactions?: Record<string, string[]>;
    isRead?: boolean;
    replyTo?: {
        id: string;
        message: string;
        users: string;
        imageUrl?: string;
    };
}

// Styles
import {
    ChatContainer,
    ChatBody,
    ChatContent,
    ChatMessages,
    MessagesWrapper,
    MessageWrapper,
    LoadingContainer,
    LoadingSpinner,
    LoadingText,
    ChannelStart,
    ChannelStartBadge,
    ChannelStartTitle,
    ChannelStartText,
    DMChatStart,
    DMChatStartAvatar,
    DMChatStartTitle,
    DMChatStartText,
    ChatBottom,
} from './Chat.styles';

const Chat: React.FC = () => {
    const chatRef = useRef<HTMLDivElement>(null);
    const roomId = useSelector(selectRoomId);
    const isInCall = useSelector(selectIsInCall);
    const dispatch = useDispatch();
    const auth = getAuth();
    const [user] = useAuthState(auth);
    const { showToast } = useToast();

    // Local UI state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showMembersPanel, setShowMembersPanel] = useState(false);
    const [isStarred, setIsStarred] = useState(false);
    const [otherUserOnline, setOtherUserOnline] = useState(false);

    // Custom hooks
    const { roomDetails, roomMessages, loading, pendingMessages, loadPendingMessages, isDM } = useMessages({ roomId });

    const {
        showSearch,
        searchQuery,
        searchResults,
        currentSearchIndex,
        searchInputRef,
        handleSearchToggle,
        handleSearchChange,
        handleSearchKeyDown,
        navigateSearch,
    } = useMessageSearch({ roomMessages });

    const { typingUsers } = useTypingIndicator({ roomId, userId: user?.uid });
    const { replyTo, handleReply, handleCancelReply } = useReplyState({ roomId });
    const { activeChannelCall } = useChannelCalls({ roomId, isDM });

    const {
        isStartingCall,
        isJoiningCall,
        handleStartGroupCall,
        handleStartDirectCall,
        handleJoinGroupCall,
        handleEndGroupCall,
        handleMemberCall,
    } = useCallManagement({
        userId: user?.uid,
        userDisplayName: user?.displayName || undefined,
        userPhotoURL: user?.photoURL || undefined,
        roomId,
        roomName: (roomDetails?.data() as Room | undefined)?.name,
        showToast,
    });

    // Get other user's info for DM
    const getOtherUserInfo = useCallback(() => {
        if (!isDM || !user) return null;
        const roomData = roomDetails?.data() as (Room & { participants?: string[], participantPhotos?: Record<string, string> }) | undefined;
        if (!roomData) return null;

        let otherUserId: string | undefined;
        const participants = roomData.participants || [];
        if (participants.length > 0) {
            otherUserId = participants.find((id: string) => id !== user.uid);
        }

        if (!otherUserId) {
            const members = roomData.members || [];
            if (members.length > 0) {
                otherUserId = members.find((id: string) => id !== user.uid);
            }
        }

        if (!otherUserId && roomId && roomId.startsWith('dm_')) {
            const parts = roomId.split('_');
            if (parts.length === 3) {
                otherUserId = parts[1] === user.uid ? parts[2] : parts[1];
            }
        }

        if (!otherUserId) return null;

        const memberNames = roomData.memberNames || {};
        let displayName = memberNames[otherUserId];
        if (!displayName && roomData.name) {
            const names = roomData.name.split(' & ');
            const myName = user.displayName?.split(' ')[0] || user.email?.split('@')[0];
            displayName = names.find((n: string) => n !== myName) || names[0];
        }

        return {
            odUserId: otherUserId,
            name: displayName || 'Chat Partner',
            odPhoto: roomData.participantPhotos?.[otherUserId] || ''
        };
    }, [isDM, user, roomDetails, roomId]);

    const otherUser = getOtherUserInfo();

    // Listen for other user's online status in DMs
    useEffect(() => {
        if (!isDM || !otherUser?.odUserId) {
            setOtherUserOnline(false);
            return;
        }

        const unsubscribe = userService.listenForUserStatus(otherUser.odUserId, (isOnline) => {
            setOtherUserOnline(isOnline);
        });

        return () => unsubscribe();
    }, [isDM, otherUser?.odUserId]);

    // Scroll to bottom on new messages
    useEffect(() => {
        chatRef?.current?.scrollIntoView({ behavior: 'smooth' });
    }, [roomId, loading, pendingMessages]);

    // Check if current user is the channel creator
    const roomData = roomDetails?.data() as (Room & { participants?: string[], participantPhotos?: Record<string, string> }) | undefined;
    const isChannelCreator = !isDM && user && roomData?.createdBy === user.uid;

    const handleDeleteChannel = async () => {
        if (!roomId || roomId === 'null' || !isChannelCreator) return;

        setIsDeleting(true);
        try {
            // Note: In production, use a Cloud Function for this
            const { deleteDoc, doc, getDocs, collection } = await import('firebase/firestore');
            const { db } = await import('../../../../firebase');

            const messagesRef = collection(db, 'rooms', roomId, 'messages');
            const messagesSnapshot = await getDocs(messagesRef);
            const deletePromises = messagesSnapshot.docs.map(docItem =>
                deleteDoc(doc(db, 'rooms', roomId, 'messages', docItem.id))
            );
            await Promise.all(deletePromises);
            await deleteDoc(doc(db, 'rooms', roomId));

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

    // No room selected
    if (roomId === 'null') {
        return <WelcomeScreen />;
    }

    // Render DM Chat
    if (isDM && otherUser) {
        return (
            <ChatContainer>
                <ChatHeader
                    type="dm"
                    otherUser={otherUser}
                    otherUserOnline={otherUserOnline}
                    showSearch={showSearch}
                    isInCall={isInCall}
                    isStartingCall={isStartingCall}
                    onSearchToggle={handleSearchToggle}
                    onStartCall={(type) => handleStartDirectCall(type, otherUser.odUserId, otherUser.name, otherUser.odPhoto)}
                />

                {showSearch && (
                    <SearchBar
                        searchQuery={searchQuery}
                        searchResults={searchResults}
                        currentSearchIndex={currentSearchIndex}
                        searchInputRef={searchInputRef}
                        onSearchChange={handleSearchChange}
                        onSearchKeyDown={handleSearchKeyDown}
                        onNavigateSearch={navigateSearch}
                        onClose={handleSearchToggle}
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
                                    <DMChatStart>
                                        <DMChatStartAvatar>
                                            {otherUser.odPhoto ? (
                                                <img src={otherUser.odPhoto} alt={otherUser.name} />
                                            ) : (
                                                <PersonIcon />
                                            )}
                                        </DMChatStartAvatar>
                                        <DMChatStartTitle>{otherUser.name}</DMChatStartTitle>
                                        <DMChatStartText>
                                            This is the beginning of your conversation with {otherUser.name}
                                        </DMChatStartText>
                                    </DMChatStart>

                                    <MessagesWrapper>
                                        {roomMessages?.docs.map((docItem) => {
                                            const data = docItem.data() as MessageData;
                                            const isHighlighted = searchResults.includes(docItem.id) && searchResults[currentSearchIndex] === docItem.id;
                                            return (
                                                <MessageWrapper key={docItem.id} id={`message-${docItem.id}`} $highlighted={isHighlighted}>
                                                    <Message
                                                        id={docItem.id}
                                                        message={data.message}
                                                        timestamp={data.timestamp}
                                                        users={data.users}
                                                        userImage={data.userImage}
                                                        imageUrl={data.imageUrl}
                                                        reactions={data.reactions}
                                                        roomId={roomId}
                                                        userId={user?.uid}
                                                        currentUserName={user?.displayName || ''}
                                                        isRead={data.isRead}
                                                        replyTo={data.replyTo}
                                                        onReply={handleReply}
                                                    />
                                                </MessageWrapper>
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
                                                currentUserName={user?.displayName || ''}
                                            />
                                        ))}
                                    </MessagesWrapper>
                                    <ChatBottom ref={chatRef} />
                                </>
                            )}
                        </ChatMessages>

                        <TypingIndicator typingUsers={typingUsers} dmUserName={otherUser.name} />

                        <ChatInput
                            chatRef={chatRef}
                            channelName={otherUser.name}
                            channelId={roomId}
                            onPendingUpdate={loadPendingMessages}
                            replyTo={replyTo}
                            onCancelReply={handleCancelReply}
                        />
                    </ChatContent>
                </ChatBody>
            </ChatContainer>
        );
    }

    // Render Group Chat
    return (
        <ChatContainer>
            <ChatHeader
                type="group"
                roomName={roomData?.name || ''}
                messageCount={roomMessages?.docs.length || 0}
                showSearch={showSearch}
                isStarred={isStarred}
                showMembersPanel={showMembersPanel}
                isInCall={isInCall}
                isStartingCall={isStartingCall}
                isChannelCreator={!!isChannelCreator}
                onSearchToggle={handleSearchToggle}
                onToggleStar={() => setIsStarred(!isStarred)}
                onStartCall={handleStartGroupCall}
                onToggleMembers={() => setShowMembersPanel(!showMembersPanel)}
                onDeleteChannel={() => setShowDeleteConfirm(true)}
            />

            {showSearch && (
                <SearchBar
                    searchQuery={searchQuery}
                    searchResults={searchResults}
                    currentSearchIndex={currentSearchIndex}
                    searchInputRef={searchInputRef}
                    onSearchChange={handleSearchChange}
                    onSearchKeyDown={handleSearchKeyDown}
                    onNavigateSearch={navigateSearch}
                    onClose={handleSearchToggle}
                />
            )}

            {activeChannelCall && !isInCall && (
                <ActiveCallBanner
                    call={activeChannelCall}
                    onJoin={() => handleJoinGroupCall(activeChannelCall)}
                    onEndCall={() => handleEndGroupCall(activeChannelCall)}
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
                                        Welcome to #{roomData?.name}
                                    </ChannelStartTitle>
                                    <ChannelStartText>
                                        This is the beginning of your conversation in this group. Send a message to get started!
                                    </ChannelStartText>
                                </ChannelStart>

                                <MessagesWrapper>
                                    {roomMessages?.docs.map((docItem) => {
                                        const data = docItem.data() as MessageData;
                                        const isHighlighted = searchResults.includes(docItem.id) && searchResults[currentSearchIndex] === docItem.id;
                                        return (
                                            <MessageWrapper key={docItem.id} id={`message-${docItem.id}`} $highlighted={isHighlighted}>
                                                <Message
                                                    id={docItem.id}
                                                    message={data.message}
                                                    timestamp={data.timestamp}
                                                    users={data.users}
                                                    userImage={data.userImage}
                                                    imageUrl={data.imageUrl}
                                                    reactions={data.reactions}
                                                    roomId={roomId}
                                                    userId={user?.uid}
                                                    currentUserName={user?.displayName || ''}
                                                    isRead={data.isRead}
                                                    replyTo={data.replyTo}
                                                    onReply={handleReply}
                                                />
                                            </MessageWrapper>
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
                                            currentUserName={user?.displayName || ''}
                                        />
                                    ))}
                                </MessagesWrapper>
                                <ChatBottom ref={chatRef} />
                            </>
                        )}
                    </ChatMessages>

                    <TypingIndicator typingUsers={typingUsers} />

                    <ChatInput
                        chatRef={chatRef}
                        channelName={roomData?.name}
                        channelId={roomId}
                        onPendingUpdate={loadPendingMessages}
                        replyTo={replyTo}
                        onCancelReply={handleCancelReply}
                    />
                </ChatContent>

                {showMembersPanel && user && (
                    <MembersList
                        roomMessages={roomMessages}
                        currentUserId={user.uid}
                        currentUserName={user.displayName || 'Unknown'}
                        currentUserPhoto={user.photoURL || ''}
                        onClose={() => setShowMembersPanel(false)}
                        onStartCall={handleMemberCall}
                        isInCall={isInCall}
                        roomId={roomId}
                        channelName={roomData?.name}
                        isPrivateChannel={!!roomData?.isPrivate || !!roomData?.passwordHash}
                        channelMembers={roomData?.members || []}
                        channelCreatorId={roomData?.createdBy}
                    />
                )}
            </ChatBody>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Delete Channel"
                message={`Are you sure you want to delete #${roomData?.name}? This will permanently delete all messages in this channel. This action cannot be undone.`}
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
