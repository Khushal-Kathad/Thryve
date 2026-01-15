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
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useSelector, useDispatch } from 'react-redux';
import { selectRoomId, enterRoom } from '../features/appSlice';
import ChatInput, { ReplyData } from './ChatInput';
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
import { userService } from '../services/userService';
import { useDebounce, useDebouncedCallback } from '../hooks/useDebounce';

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
    const [otherUserOnline, setOtherUserOnline] = useState(false);
    const [replyTo, setReplyTo] = useState<ReplyData | null>(null);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<string[]>([]);
    const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
    const searchInputRef = useRef<HTMLInputElement>(null);

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

    // Check if this is a DM
    const isDM = roomDetails?.data()?.isDM === true;

    // Get other user's info for DM
    const getOtherUserInfo = () => {
        if (!isDM || !user) return null;
        const roomData = roomDetails?.data();
        if (!roomData) return null;

        // Try multiple sources to find the other user's ID
        let otherUserId: string | undefined;

        // 1. Try participants array
        const participants = roomData.participants || [];
        if (participants.length > 0) {
            otherUserId = participants.find((id: string) => id !== user.uid);
        }

        // 2. Try members array if participants didn't work
        if (!otherUserId) {
            const members = roomData.members || [];
            if (members.length > 0) {
                otherUserId = members.find((id: string) => id !== user.uid);
            }
        }

        // 3. Try to extract from room ID if it's in DM format (dm_userId1_userId2)
        if (!otherUserId && roomId && roomId.startsWith('dm_')) {
            const parts = roomId.split('_');
            if (parts.length === 3) {
                // Format: dm_userId1_userId2
                otherUserId = parts[1] === user.uid ? parts[2] : parts[1];
            }
        }

        // Return null if we still can't find the other user's ID
        if (!otherUserId) {
            console.warn('Could not find other user ID in DM room:', {
                roomId,
                participants,
                members: roomData.members,
            });
            return null;
        }

        const memberNames = roomData.memberNames || {};

        // Get name from memberNames, or extract from room name, or use fallback
        let displayName = memberNames[otherUserId];
        if (!displayName && roomData.name) {
            // Room name format is "User1 & User2", try to extract the other user's name
            const names = roomData.name.split(' & ');
            const myName = user.displayName?.split(' ')[0] || user.email?.split('@')[0];
            displayName = names.find((n: string) => n !== myName) || names[0];
        }

        return {
            odUserId: otherUserId,
            name: displayName || 'Chat Partner',
            odPhoto: roomData.participantPhotos?.[otherUserId] || ''
        };
    };

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

    const loadPendingMessages = useCallback(async () => {
        if (roomId !== 'null') {
            const pending = await offlineService.getPendingMessagesForRoom(roomId);
            setPendingMessages(pending);
        } else {
            setPendingMessages([]);
        }
    }, [roomId]);

    // Reply handler
    const handleReply = useCallback((data: ReplyData) => {
        setReplyTo(data);
    }, []);

    const handleCancelReply = useCallback(() => {
        setReplyTo(null);
    }, []);

    // Clear reply when room changes
    useEffect(() => {
        setReplyTo(null);
    }, [roomId]);

    // Search functionality
    const handleSearchToggle = useCallback(() => {
        setShowSearch(prev => {
            if (!prev) {
                setTimeout(() => searchInputRef.current?.focus(), 100);
            } else {
                setSearchQuery('');
                setSearchResults([]);
                setCurrentSearchIndex(0);
            }
            return !prev;
        });
    }, []);

    // Debounced search query
    const debouncedSearchQuery = useDebounce(searchQuery, 250);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    }, []);

    // Perform search when debounced query changes
    useEffect(() => {
        if (!debouncedSearchQuery.trim() || !roomMessages?.docs) {
            setSearchResults([]);
            setCurrentSearchIndex(0);
            return;
        }

        const lowerQuery = debouncedSearchQuery.toLowerCase();
        const matchingIds = roomMessages.docs
            .filter(doc => {
                const data = doc.data();
                return data.message?.toLowerCase().includes(lowerQuery);
            })
            .map(doc => doc.id);

        setSearchResults(matchingIds);
        setCurrentSearchIndex(matchingIds.length > 0 ? 0 : -1);

        // Scroll to first result
        if (matchingIds.length > 0) {
            requestAnimationFrame(() => {
                const element = document.getElementById(`message-${matchingIds[0]}`);
                element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        }
    }, [debouncedSearchQuery, roomMessages]);

    const navigateSearch = useCallback((direction: 'up' | 'down') => {
        if (searchResults.length === 0) return;

        let newIndex;
        if (direction === 'up') {
            newIndex = currentSearchIndex > 0 ? currentSearchIndex - 1 : searchResults.length - 1;
        } else {
            newIndex = currentSearchIndex < searchResults.length - 1 ? currentSearchIndex + 1 : 0;
        }

        setCurrentSearchIndex(newIndex);
        const element = document.getElementById(`message-${searchResults[newIndex]}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [searchResults, currentSearchIndex]);

    const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            navigateSearch(e.shiftKey ? 'up' : 'down');
        } else if (e.key === 'Escape') {
            handleSearchToggle();
        }
    }, [navigateSearch, handleSearchToggle]);

    useEffect(() => {
        loadPendingMessages();
    }, [loadPendingMessages]);

    useEffect(() => {
        chatRef?.current?.scrollIntoView({
            behavior: 'smooth',
        });
    }, [roomId, loading, pendingMessages]);

    // Listen for active group calls in this channel (only for groups, not DMs)
    useEffect(() => {
        if (roomId === 'null' || isDM) {
            setActiveChannelCall(null);
            return;
        }

        const unsubscribe = callService.listenForChannelCalls(roomId, (call) => {
            if (call && isInCall) {
                setActiveChannelCall(null);
            } else {
                setActiveChannelCall(call);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [roomId, isInCall, isDM]);

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

    // Check if current user is the channel creator (only for groups)
    const isChannelCreator = !isDM && user && roomDetails?.data()?.createdBy === user.uid;

    const handleDeleteChannel = async () => {
        if (!roomId || roomId === 'null' || !isChannelCreator) return;

        setIsDeleting(true);
        try {
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

    // Start a group call in the channel (only for groups)
    const handleStartGroupCall = async (callType: 'audio' | 'video') => {
        if (!user || !roomId || roomId === 'null' || isInCall || isStartingCall || isDM) return;

        setIsStartingCall(true);
        try {
            const call = await callService.createCall(
                user.uid,
                user.displayName || 'Unknown',
                user.photoURL || '',
                'channel',
                roomDetails?.data()?.name || 'Channel',
                '',
                roomId,
                callType,
                true
            );

            dispatch(setCurrentCall(call));
            showToast(`Starting ${callType} call in #${roomDetails?.data()?.name}...`, 'info');

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

    // Start a direct call (for DMs)
    const handleStartDirectCall = async (callType: 'audio' | 'video') => {
        if (!user || !roomId || roomId === 'null' || isInCall || isStartingCall) return;

        // Validate otherUser exists and has required fields
        if (!otherUser || !otherUser.odUserId) {
            console.error('Cannot start call: other user info is missing', { otherUser, roomId });
            showToast('Unable to start call - user info not loaded yet', 'error');
            return;
        }

        setIsStartingCall(true);
        try {
            const call = await callService.createCall(
                user.uid,
                user.displayName || 'Unknown',
                user.photoURL || '',
                otherUser.odUserId,
                otherUser.name,
                otherUser.odPhoto,
                roomId,
                callType,
                false
            );

            dispatch(setCurrentCall(call));
            showToast(`Calling ${otherUser.name}...`, 'info');

            callService.listenForCallChanges(call.id, (updatedCall) => {
                if (updatedCall.status === 'rejected') {
                    showToast(`${otherUser.name} declined the call`, 'info');
                } else if (updatedCall.status === 'ended') {
                    showToast('Call ended', 'info');
                } else if (updatedCall.status === 'missed') {
                    showToast(`${otherUser.name} didn't answer`, 'info');
                }
            });
        } catch (error) {
            console.error('Error starting direct call:', error);
            showToast('Failed to start call', 'error');
        } finally {
            setIsStartingCall(false);
        }
    };

    // For MembersList callback (groups only)
    const handleMemberCall = async (
        receiverId: string,
        receiverName: string,
        receiverPhoto: string,
        callType: 'audio' | 'video'
    ) => {
        if (!user || !roomId || roomId === 'null' || isInCall || isStartingCall) return;

        // Validate receiverId is provided
        if (!receiverId) {
            console.error('Cannot start call: receiver ID is missing');
            showToast('Unable to start call - user info missing', 'error');
            return;
        }

        setIsStartingCall(true);
        try {
            const call = await callService.createCall(
                user.uid,
                user.displayName || 'Unknown',
                user.photoURL || '',
                receiverId,
                receiverName || 'Unknown',
                receiverPhoto || '',
                roomId,
                callType,
                false
            );

            dispatch(setCurrentCall(call));
            showToast(`Calling ${receiverName || 'User'}...`, 'info');

            callService.listenForCallChanges(call.id, (updatedCall) => {
                if (updatedCall.status === 'rejected') {
                    showToast(`${receiverName || 'User'} declined the call`, 'info');
                } else if (updatedCall.status === 'ended') {
                    showToast('Call ended', 'info');
                } else if (updatedCall.status === 'missed') {
                    showToast(`${receiverName || 'User'} didn't answer`, 'info');
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

        const isAlreadyParticipant = activeChannelCall.participants?.some(
            (p) => p.odUserId === user.uid
        );

        if (isAlreadyParticipant) {
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

    // Render DM Chat (WhatsApp style)
    if (isDM && otherUser) {
        return (
            <ChatContainer>
                <ChatHeader>
                    <HeaderLeft>
                        <DMUserAvatar>
                            {otherUser.odPhoto ? (
                                <img src={otherUser.odPhoto} alt={otherUser.name} />
                            ) : (
                                <PersonIcon />
                            )}
                            <OnlineIndicator $isOnline={otherUserOnline} />
                        </DMUserAvatar>
                        <DMUserInfo>
                            <DMUserName>{otherUser.name}</DMUserName>
                            <DMUserStatus $online={otherUserOnline}>
                                {otherUserOnline ? 'Online' : 'Offline'}
                            </DMUserStatus>
                        </DMUserInfo>
                    </HeaderLeft>
                    <HeaderRight>
                        <ActionButton
                            onClick={handleSearchToggle}
                            $active={showSearch}
                            title="Search messages"
                        >
                            <SearchIcon />
                        </ActionButton>
                        <ActionButton
                            title="Voice Call"
                            onClick={() => handleStartDirectCall('audio')}
                            disabled={isInCall || isStartingCall}
                        >
                            <CallIcon />
                        </ActionButton>
                        <ActionButton
                            title="Video Call"
                            onClick={() => handleStartDirectCall('video')}
                            disabled={isInCall || isStartingCall}
                        >
                            <VideocamIcon />
                        </ActionButton>
                        <ActionButton title="Info">
                            <InfoOutlinedIcon />
                        </ActionButton>
                    </HeaderRight>
                </ChatHeader>

                {/* Search Bar */}
                {showSearch && (
                    <SearchBar>
                        <SearchInputWrapper>
                            <SearchIcon />
                            <SearchInput
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search in messages..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                                onKeyDown={handleSearchKeyDown}
                            />
                            {searchQuery && (
                                <SearchResults>
                                    {searchResults.length > 0
                                        ? `${currentSearchIndex + 1} of ${searchResults.length}`
                                        : 'No results'}
                                </SearchResults>
                            )}
                        </SearchInputWrapper>
                        <SearchNavButtons>
                            <SearchNavButton
                                onClick={() => navigateSearch('up')}
                                disabled={searchResults.length === 0}
                                title="Previous (Shift+Enter)"
                            >
                                <KeyboardArrowUpIcon />
                            </SearchNavButton>
                            <SearchNavButton
                                onClick={() => navigateSearch('down')}
                                disabled={searchResults.length === 0}
                                title="Next (Enter)"
                            >
                                <KeyboardArrowDownIcon />
                            </SearchNavButton>
                        </SearchNavButtons>
                        <CloseSearchButton onClick={handleSearchToggle} title="Close (Esc)">
                            <CloseIcon />
                        </CloseSearchButton>
                    </SearchBar>
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
                                            const { message, timestamp, users, userImage, imageUrl, reactions, isRead, replyTo: msgReplyTo } = docItem.data();
                                            const isHighlighted = searchResults.includes(docItem.id) && searchResults[currentSearchIndex] === docItem.id;
                                            return (
                                                <MessageWrapper key={docItem.id} id={`message-${docItem.id}`} $highlighted={isHighlighted}>
                                                    <Message
                                                        id={docItem.id}
                                                        message={message}
                                                        timestamp={timestamp}
                                                        users={users}
                                                        userImage={userImage}
                                                        imageUrl={imageUrl}
                                                        reactions={reactions}
                                                        roomId={roomId}
                                                        userId={user?.uid}
                                                        currentUserName={user?.displayName || ''}
                                                        isRead={isRead}
                                                        replyTo={msgReplyTo}
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

                        {/* Typing Indicator */}
                        {typingUsers.length > 0 && (
                            <TypingIndicator>
                                <TypingDots>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </TypingDots>
                                <TypingText>{otherUser.name} is typing...</TypingText>
                            </TypingIndicator>
                        )}

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
                            onClick={handleSearchToggle}
                            $active={showSearch}
                            title="Search messages"
                        >
                            <SearchIcon />
                        </ActionButton>
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

            {/* Search Bar */}
            {showSearch && (
                <SearchBar>
                    <SearchInputWrapper>
                        <SearchIcon />
                        <SearchInput
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search in messages..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onKeyDown={handleSearchKeyDown}
                        />
                        {searchQuery && (
                            <SearchResults>
                                {searchResults.length > 0
                                    ? `${currentSearchIndex + 1} of ${searchResults.length}`
                                    : 'No results'}
                            </SearchResults>
                        )}
                    </SearchInputWrapper>
                    <SearchNavButtons>
                        <SearchNavButton
                            onClick={() => navigateSearch('up')}
                            disabled={searchResults.length === 0}
                            title="Previous (Shift+Enter)"
                        >
                            <KeyboardArrowUpIcon />
                        </SearchNavButton>
                        <SearchNavButton
                            onClick={() => navigateSearch('down')}
                            disabled={searchResults.length === 0}
                            title="Next (Enter)"
                        >
                            <KeyboardArrowDownIcon />
                        </SearchNavButton>
                    </SearchNavButtons>
                    <CloseSearchButton onClick={handleSearchToggle} title="Close (Esc)">
                        <CloseIcon />
                    </CloseSearchButton>
                </SearchBar>
            )}

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
                                        const { message, timestamp, users, userImage, imageUrl, reactions, isRead, replyTo: msgReplyTo } = docItem.data();
                                        const isHighlighted = searchResults.includes(docItem.id) && searchResults[currentSearchIndex] === docItem.id;
                                        return (
                                            <MessageWrapper key={docItem.id} id={`message-${docItem.id}`} $highlighted={isHighlighted}>
                                                <Message
                                                    id={docItem.id}
                                                    message={message}
                                                    timestamp={timestamp}
                                                    users={users}
                                                    userImage={userImage}
                                                    imageUrl={imageUrl}
                                                    reactions={reactions}
                                                    roomId={roomId}
                                                    userId={user?.uid}
                                                    currentUserName={user?.displayName || ''}
                                                    isRead={isRead}
                                                    replyTo={msgReplyTo}
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
                        replyTo={replyTo}
                        onCancelReply={handleCancelReply}
                    />
                </ChatContent>

                {/* Members Panel - Only for groups */}
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

const onlinePulse = keyframes`
    0%, 100% {
        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
    }
    50% {
        box-shadow: 0 0 0 4px rgba(34, 197, 94, 0);
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
    /* GPU acceleration */
    transform: translateZ(0);
    will-change: transform;
`;

const ChatBody = styled.div`
    flex: 1;
    display: flex;
    overflow: hidden;
    /* Prevent overscroll bounce */
    overscroll-behavior: contain;
`;

const ChatContent = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
    /* GPU acceleration for smoother scrolling */
    transform: translateZ(0);
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

// DM specific header styles
const DMUserAvatar = styled.div`
    position: relative;
    width: 44px;
    height: 44px;
    border-radius: var(--radius-full);
    background: var(--purple-100);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: visible;

    img {
        width: 100%;
        height: 100%;
        border-radius: var(--radius-full);
        object-fit: cover;
    }

    svg {
        font-size: 1.5rem;
        color: var(--accent-primary);
    }

    @media (max-width: 480px) {
        width: 40px;
        height: 40px;
    }
`;

const OnlineIndicator = styled.span<{ $isOnline: boolean }>`
    position: absolute;
    bottom: 0;
    right: 0;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${props => props.$isOnline ? 'var(--accent-success)' : 'var(--text-muted)'};
    border: 3px solid var(--bg-primary);
    animation: ${props => props.$isOnline ? onlinePulse : 'none'} 2s ease-in-out infinite;
`;

const DMUserInfo = styled.div`
    display: flex;
    flex-direction: column;
    min-width: 0;
`;

const DMUserName = styled.h3`
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

const DMUserStatus = styled.span<{ $online: boolean }>`
    font-size: 0.8rem;
    color: ${props => props.$online ? 'var(--accent-success)' : 'var(--text-muted)'};
    font-weight: 500;
`;

const DMChatStart = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--spacing-xl);
    margin-bottom: var(--spacing-lg);
    animation: ${fadeIn} 0.5s ease-out;
    text-align: center;
`;

const DMChatStartAvatar = styled.div`
    width: 80px;
    height: 80px;
    border-radius: var(--radius-full);
    background: var(--purple-100);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--spacing-lg);
    box-shadow: var(--shadow-lg);

    img {
        width: 100%;
        height: 100%;
        border-radius: var(--radius-full);
        object-fit: cover;
    }

    svg {
        font-size: 2.5rem;
        color: var(--accent-primary);
    }
`;

const DMChatStartTitle = styled.h2`
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: var(--spacing-sm);

    @media (max-width: 480px) {
        font-size: 1.25rem;
    }
`;

const DMChatStartText = styled.p`
    color: var(--text-muted);
    font-size: 0.95rem;
    max-width: 400px;
    line-height: 1.5;
`;

// Group chat header styles
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
    /* Smooth momentum scrolling on iOS */
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
    scroll-behavior: smooth;
    /* GPU acceleration */
    transform: translateZ(0);
    will-change: scroll-position;

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: var(--border-default);
        border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: var(--text-muted);
    }

    @media (max-width: 768px) {
        padding: var(--spacing-sm);
        /* Hide scrollbar on mobile for cleaner look */
        scrollbar-width: none;
        -ms-overflow-style: none;

        &::-webkit-scrollbar {
            display: none;
        }
    }

    @media (max-width: 480px) {
        padding: var(--spacing-xs);
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

// Search Bar Styles
const SearchBar = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border-light);
    animation: ${fadeIn} 0.2s ease-out;
`;

const SearchInputWrapper = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--bg-tertiary);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-light);

    svg {
        font-size: 1.2rem;
        color: var(--text-muted);
    }
`;

const SearchInput = styled.input`
    flex: 1;
    min-width: 0;
    background: transparent;
    border: none;
    outline: none;
    font-size: 0.95rem;
    color: var(--text-primary);

    &::placeholder {
        color: var(--text-muted);
    }
`;

const SearchResults = styled.span`
    font-size: 0.8rem;
    color: var(--text-muted);
    white-space: nowrap;
`;

const SearchNavButtons = styled.div`
    display: flex;
    gap: 2px;
`;

const SearchNavButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    transition: all var(--transition-fast);

    &:hover:not(:disabled) {
        background: var(--purple-50);
        color: var(--accent-primary);
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    svg {
        font-size: 1.2rem;
    }
`;

const CloseSearchButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    color: var(--text-muted);
    transition: all var(--transition-fast);

    &:hover {
        background: rgba(239, 68, 68, 0.1);
        color: var(--accent-danger);
    }

    svg {
        font-size: 1.2rem;
    }
`;

const pulseHighlight = keyframes`
    0%, 100% {
        background: rgba(124, 58, 237, 0.15);
    }
    50% {
        background: rgba(124, 58, 237, 0.25);
    }
`;

const MessageWrapper = styled.div<{ $highlighted?: boolean }>`
    transition: background 0.3s ease;
    border-radius: var(--radius-lg);
    padding: 2px;
    margin: -2px;
    ${props => props.$highlighted && `
        background: rgba(124, 58, 237, 0.15);
        animation: ${pulseHighlight} 1s ease-in-out;
    `}
`;
