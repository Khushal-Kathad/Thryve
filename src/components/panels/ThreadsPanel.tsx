import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import CloseIcon from '@mui/icons-material/Close';
import ForumIcon from '@mui/icons-material/Forum';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useDispatch } from 'react-redux';
import { setActivePanel, enterRoom, addVerifiedRoom } from '../../features/appSlice';
import { collection, query, getDocs, orderBy, where, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { getAuth } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';

interface ThreadData {
    messageId: string;
    roomId: string;
    roomName: string;
    parentMessage: string;
    parentUser: string;
    parentUserImage: string;
    replyCount: number;
    lastReplyAt: number;
    lastReplyUser: string;
    participants: string[];
}

const ThreadsPanel: React.FC = () => {
    const dispatch = useDispatch();
    const auth = getAuth();
    const [user] = useAuthState(auth);
    const [threads, setThreads] = useState<ThreadData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchThreads = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            setLoading(true);
            const foundThreads: ThreadData[] = [];

            try {
                // Get all rooms
                const roomsSnapshot = await getDocs(collection(db, 'rooms'));

                for (const roomDoc of roomsSnapshot.docs) {
                    const roomName = roomDoc.data().name || 'Unknown';
                    const roomId = roomDoc.id;

                    // Get messages that have replies (checking for thread collections)
                    const messagesQuery = query(
                        collection(db, 'rooms', roomId, 'messages'),
                        orderBy('timestamp', 'desc'),
                        limit(100)
                    );
                    const messagesSnapshot = await getDocs(messagesQuery);

                    for (const msgDoc of messagesSnapshot.docs) {
                        const msgData = msgDoc.data();

                        // Check if this message has replies
                        const repliesSnapshot = await getDocs(
                            query(
                                collection(db, 'rooms', roomId, 'messages', msgDoc.id, 'replies'),
                                orderBy('timestamp', 'desc')
                            )
                        );

                        if (repliesSnapshot.size > 0) {
                            const replies = repliesSnapshot.docs;
                            const participants = new Set<string>([msgData.users]);
                            replies.forEach((reply) => {
                                participants.add(reply.data().users);
                            });

                            // Check if current user participated in this thread
                            const userName = user.displayName || '';
                            if (participants.has(userName) || msgData.users === userName) {
                                const lastReply = replies[0].data();
                                foundThreads.push({
                                    messageId: msgDoc.id,
                                    roomId,
                                    roomName,
                                    parentMessage: msgData.message,
                                    parentUser: msgData.users,
                                    parentUserImage: msgData.userImage,
                                    replyCount: repliesSnapshot.size,
                                    lastReplyAt: lastReply.timestamp?.toMillis() || 0,
                                    lastReplyUser: lastReply.users,
                                    participants: Array.from(participants),
                                });
                            }
                        }
                    }
                }

                // Sort by lastReplyAt (most recent first)
                foundThreads.sort((a, b) => b.lastReplyAt - a.lastReplyAt);
                setThreads(foundThreads.slice(0, 30));
            } catch (error) {
                console.error('Error fetching threads:', error);
            }

            setLoading(false);
        };

        fetchThreads();
    }, [user]);

    const handleClose = () => {
        dispatch(setActivePanel('none'));
    };

    const handleGoToThread = (roomId: string) => {
        dispatch(addVerifiedRoom({ roomId }));
        dispatch(enterRoom({ roomId }));
        dispatch(setActivePanel('none'));
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <Container>
            <Header>
                <Title>
                    <ForumIcon />
                    Threads
                </Title>
                <CloseButton onClick={handleClose}>
                    <CloseIcon />
                </CloseButton>
            </Header>

            <ThreadsContent>
                {loading ? (
                    <LoadingState>Loading threads...</LoadingState>
                ) : threads.length > 0 ? (
                    <>
                        <ThreadsInfo>
                            Threads you're participating in
                        </ThreadsInfo>
                        {threads.map((thread) => (
                            <ThreadItem key={`${thread.roomId}-${thread.messageId}`}>
                                <ThreadHeader>
                                    <ChannelName>#{thread.roomName}</ChannelName>
                                    <ThreadTime>{formatTime(thread.lastReplyAt)}</ThreadTime>
                                </ThreadHeader>
                                <ThreadContent>
                                    <UserAvatar>
                                        {thread.parentUserImage ? (
                                            <img src={thread.parentUserImage} alt={thread.parentUser} />
                                        ) : (
                                            <AvatarPlaceholder>{thread.parentUser[0]}</AvatarPlaceholder>
                                        )}
                                    </UserAvatar>
                                    <ThreadBody>
                                        <UserName>{thread.parentUser}</UserName>
                                        <ThreadMessage>{thread.parentMessage}</ThreadMessage>
                                        <ThreadMeta>
                                            <ReplyCount>
                                                <ChatBubbleOutlineIcon />
                                                {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
                                            </ReplyCount>
                                            <LastReply>
                                                Last reply by {thread.lastReplyUser}
                                            </LastReply>
                                        </ThreadMeta>
                                    </ThreadBody>
                                    <GoToButton
                                        title="Go to thread"
                                        onClick={() => handleGoToThread(thread.roomId)}
                                    >
                                        <OpenInNewIcon />
                                    </GoToButton>
                                </ThreadContent>
                                {thread.participants.length > 2 && (
                                    <Participants>
                                        {thread.participants.slice(0, 5).map((name, idx) => (
                                            <ParticipantBadge key={idx}>{name}</ParticipantBadge>
                                        ))}
                                        {thread.participants.length > 5 && (
                                            <ParticipantMore>+{thread.participants.length - 5}</ParticipantMore>
                                        )}
                                    </Participants>
                                )}
                            </ThreadItem>
                        ))}
                    </>
                ) : (
                    <EmptyState>
                        <EmptyIcon>
                            <ForumIcon />
                        </EmptyIcon>
                        <EmptyTitle>No threads yet</EmptyTitle>
                        <EmptyDescription>
                            Threads will appear here when you participate in message replies. Reply to any message to start a thread.
                        </EmptyDescription>
                        <HelpText>
                            Tip: Click the reply icon on any message to start a thread conversation.
                        </HelpText>
                    </EmptyState>
                )}
            </ThreadsContent>
        </Container>
    );
};

export default ThreadsPanel;

const Container = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    height: calc(100vh - var(--header-height));
    margin-top: var(--header-height);
    background: var(--bg-chat);
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--glass-border);
    background: var(--glass-bg);
`;

const Title = styled.h2`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;

    svg {
        color: var(--accent-primary);
    }
`;

const CloseButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    color: var(--text-muted);
    transition: all var(--transition-fast);

    &:hover {
        background: var(--glass-bg-hover);
        color: var(--text-primary);
    }
`;

const ThreadsContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-lg);
`;

const ThreadsInfo = styled.div`
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-bottom: var(--spacing-md);
`;

const ThreadItem = styled.div`
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-md);
    transition: all var(--transition-fast);

    &:hover {
        border-color: var(--accent-primary);
    }
`;

const ThreadHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-sm);
`;

const ChannelName = styled.span`
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--accent-primary);
`;

const ThreadTime = styled.span`
    font-size: 0.75rem;
    color: var(--text-muted);
`;

const ThreadContent = styled.div`
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
`;

const UserAvatar = styled.div`
    width: 36px;
    height: 36px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
`;

const AvatarPlaceholder = styled.div`
    width: 100%;
    height: 100%;
    background: var(--accent-primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.9rem;
`;

const ThreadBody = styled.div`
    flex: 1;
    min-width: 0;
`;

const UserName = styled.div`
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 2px;
`;

const ThreadMessage = styled.div`
    font-size: 0.9rem;
    color: var(--text-secondary);
    white-space: pre-wrap;
    word-break: break-word;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
`;

const ThreadMeta = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-top: var(--spacing-sm);
`;

const ReplyCount = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    color: var(--accent-primary);
    font-weight: 500;

    svg {
        font-size: 0.9rem;
    }
`;

const LastReply = styled.div`
    font-size: 0.75rem;
    color: var(--text-muted);
`;

const GoToButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xs);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    transition: all var(--transition-fast);
    flex-shrink: 0;

    svg {
        font-size: 1.1rem;
    }

    &:hover {
        background: var(--glass-bg-hover);
        color: var(--accent-primary);
    }
`;

const Participants = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-sm);
    padding-top: var(--spacing-sm);
    border-top: 1px solid var(--glass-border);
`;

const ParticipantBadge = styled.span`
    font-size: 0.7rem;
    padding: 2px 8px;
    background: var(--glass-bg-hover);
    color: var(--text-secondary);
    border-radius: var(--radius-full);
`;

const ParticipantMore = styled.span`
    font-size: 0.7rem;
    padding: 2px 8px;
    color: var(--text-muted);
`;

const LoadingState = styled.div`
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--text-muted);
`;

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xl) var(--spacing-lg);
    text-align: center;
`;

const EmptyIcon = styled.div`
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: var(--glass-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--spacing-lg);

    svg {
        font-size: 2.5rem;
        color: var(--text-muted);
    }
`;

const EmptyTitle = styled.h3`
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 var(--spacing-sm) 0;
`;

const EmptyDescription = styled.p`
    font-size: 0.9rem;
    color: var(--text-muted);
    margin: 0;
    max-width: 300px;
`;

const HelpText = styled.p`
    font-size: 0.8rem;
    color: var(--accent-primary);
    margin-top: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
    background: rgba(var(--accent-primary-rgb), 0.1);
    border-radius: var(--radius-md);
`;
