import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import CloseIcon from '@mui/icons-material/Close';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useDispatch } from 'react-redux';
import { setActivePanel, enterRoom, addVerifiedRoom } from '../../features/appSlice';
import { collection, query, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { getAuth } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';

interface MentionData {
    messageId: string;
    roomId: string;
    roomName: string;
    message: string;
    users: string;
    userImage: string;
    timestamp: number;
}

const MentionsPanel: React.FC = () => {
    const dispatch = useDispatch();
    const auth = getAuth();
    const [user] = useAuthState(auth);
    const [mentions, setMentions] = useState<MentionData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMentions = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            setLoading(true);
            const foundMentions: MentionData[] = [];
            const userName = user.displayName || '';

            try {
                // Get all rooms
                const roomsSnapshot = await getDocs(collection(db, 'rooms'));

                for (const roomDoc of roomsSnapshot.docs) {
                    const roomName = roomDoc.data().name || 'Unknown';
                    const roomId = roomDoc.id;

                    // Get messages in this room
                    const messagesQuery = query(
                        collection(db, 'rooms', roomId, 'messages'),
                        orderBy('timestamp', 'desc')
                    );
                    const messagesSnapshot = await getDocs(messagesQuery);

                    for (const msgDoc of messagesSnapshot.docs) {
                        const msgData = msgDoc.data();
                        const messageText = msgData.message || '';

                        // Check if message mentions this user
                        // Match @username pattern (case insensitive)
                        const mentionPattern = new RegExp(`@${userName}\\b`, 'i');
                        if (mentionPattern.test(messageText) && msgData.users !== userName) {
                            foundMentions.push({
                                messageId: msgDoc.id,
                                roomId,
                                roomName,
                                message: messageText,
                                users: msgData.users,
                                userImage: msgData.userImage,
                                timestamp: msgData.timestamp?.toMillis() || 0,
                            });
                        }
                    }
                }

                // Sort by timestamp (most recent first)
                foundMentions.sort((a, b) => b.timestamp - a.timestamp);
                // Limit to 50 most recent mentions
                setMentions(foundMentions.slice(0, 50));
            } catch (error) {
                console.error('Error fetching mentions:', error);
            }

            setLoading(false);
        };

        fetchMentions();
    }, [user]);

    const handleClose = () => {
        dispatch(setActivePanel('none'));
    };

    const handleGoToMessage = (roomId: string) => {
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

    const highlightMention = (text: string) => {
        if (!user?.displayName) return text;
        const pattern = new RegExp(`(@${user.displayName})\\b`, 'gi');
        const parts = text.split(pattern);
        return parts.map((part, index) =>
            pattern.test(part) ? (
                <MentionHighlight key={index}>{part}</MentionHighlight>
            ) : (
                part
            )
        );
    };

    return (
        <Container>
            <Header>
                <Title>
                    <AlternateEmailIcon />
                    Mentions
                </Title>
                <CloseButton onClick={handleClose}>
                    <CloseIcon />
                </CloseButton>
            </Header>

            <MentionsContent>
                {loading ? (
                    <LoadingState>Searching for mentions...</LoadingState>
                ) : mentions.length > 0 ? (
                    <>
                        <MentionsCount>{mentions.length} mention{mentions.length !== 1 ? 's' : ''}</MentionsCount>
                        {mentions.map((mention) => (
                            <MentionItem key={`${mention.roomId}-${mention.messageId}`}>
                                <MentionHeader>
                                    <ChannelName>#{mention.roomName}</ChannelName>
                                    <MentionTime>{formatTime(mention.timestamp)}</MentionTime>
                                </MentionHeader>
                                <MentionContent>
                                    <UserAvatar>
                                        {mention.userImage ? (
                                            <img src={mention.userImage} alt={mention.users} />
                                        ) : (
                                            <AvatarPlaceholder>{mention.users[0]}</AvatarPlaceholder>
                                        )}
                                    </UserAvatar>
                                    <MentionBody>
                                        <UserName>{mention.users}</UserName>
                                        <MentionText>{highlightMention(mention.message)}</MentionText>
                                    </MentionBody>
                                    <GoToButton
                                        title="Go to message"
                                        onClick={() => handleGoToMessage(mention.roomId)}
                                    >
                                        <OpenInNewIcon />
                                    </GoToButton>
                                </MentionContent>
                            </MentionItem>
                        ))}
                    </>
                ) : (
                    <EmptyState>
                        <EmptyIcon>
                            <AlternateEmailIcon />
                        </EmptyIcon>
                        <EmptyTitle>No mentions yet</EmptyTitle>
                        <EmptyDescription>
                            When someone mentions you with @{user?.displayName || 'yourname'}, you'll see it here.
                        </EmptyDescription>
                    </EmptyState>
                )}
            </MentionsContent>
        </Container>
    );
};

export default MentionsPanel;

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

const MentionsContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-lg);
`;

const MentionsCount = styled.div`
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-bottom: var(--spacing-md);
`;

const MentionItem = styled.div`
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

const MentionHeader = styled.div`
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

const MentionTime = styled.span`
    font-size: 0.75rem;
    color: var(--text-muted);
`;

const MentionContent = styled.div`
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

const MentionBody = styled.div`
    flex: 1;
    min-width: 0;
`;

const UserName = styled.div`
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 2px;
`;

const MentionText = styled.div`
    font-size: 0.9rem;
    color: var(--text-secondary);
    white-space: pre-wrap;
    word-break: break-word;
`;

const MentionHighlight = styled.span`
    background: rgba(var(--accent-primary-rgb), 0.2);
    color: var(--accent-primary);
    padding: 1px 4px;
    border-radius: 4px;
    font-weight: 500;
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
    max-width: 280px;
`;
