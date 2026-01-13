import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import CloseIcon from '@mui/icons-material/Close';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useDispatch, useSelector } from 'react-redux';
import { setActivePanel, selectSavedMessages, toggleSaveMessage, enterRoom, addVerifiedRoom } from '../../features/appSlice';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

interface SavedMessageData {
    messageId: string;
    roomId: string;
    roomName: string;
    message: string;
    users: string;
    userImage: string;
    savedAt: number;
    timestamp: number;
}

const SavedPanel: React.FC = () => {
    const dispatch = useDispatch();
    const savedMessages = useSelector(selectSavedMessages);
    const [messagesData, setMessagesData] = useState<SavedMessageData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSavedMessages = async () => {
            setLoading(true);
            const fetchedMessages: SavedMessageData[] = [];

            for (const saved of savedMessages) {
                try {
                    // Get room name
                    const roomDoc = await getDoc(doc(db, 'rooms', saved.roomId));
                    const roomName = roomDoc.exists() ? roomDoc.data().name : 'Unknown Channel';

                    // Get message data
                    const messageDoc = await getDoc(doc(db, 'rooms', saved.roomId, 'messages', saved.messageId));
                    if (messageDoc.exists()) {
                        const messageData = messageDoc.data();
                        fetchedMessages.push({
                            messageId: saved.messageId,
                            roomId: saved.roomId,
                            roomName,
                            message: messageData.message,
                            users: messageData.users,
                            userImage: messageData.userImage,
                            savedAt: saved.savedAt,
                            timestamp: messageData.timestamp?.toMillis() || 0,
                        });
                    }
                } catch (error) {
                    console.error('Error fetching saved message:', error);
                }
            }

            // Sort by savedAt (most recent first)
            fetchedMessages.sort((a, b) => b.savedAt - a.savedAt);
            setMessagesData(fetchedMessages);
            setLoading(false);
        };

        fetchSavedMessages();
    }, [savedMessages]);

    const handleClose = () => {
        dispatch(setActivePanel('none'));
    };

    const handleRemove = (messageId: string, roomId: string) => {
        dispatch(toggleSaveMessage({ messageId, roomId }));
    };

    const handleGoToMessage = (roomId: string) => {
        dispatch(addVerifiedRoom({ roomId }));
        dispatch(enterRoom({ roomId }));
        dispatch(setActivePanel('none'));
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return date.toLocaleDateString();
    };

    return (
        <Container>
            <Header>
                <Title>
                    <BookmarkIcon />
                    Saved Items
                </Title>
                <CloseButton onClick={handleClose}>
                    <CloseIcon />
                </CloseButton>
            </Header>

            <SavedContent>
                {loading ? (
                    <LoadingState>Loading saved messages...</LoadingState>
                ) : messagesData.length > 0 ? (
                    <>
                        <SavedCount>{messagesData.length} saved item{messagesData.length !== 1 ? 's' : ''}</SavedCount>
                        {messagesData.map((msg) => (
                            <SavedItem key={msg.messageId}>
                                <SavedItemHeader>
                                    <ChannelName>#{msg.roomName}</ChannelName>
                                    <SavedDate>{formatDate(msg.savedAt)}</SavedDate>
                                </SavedItemHeader>
                                <MessageContent>
                                    <UserAvatar>
                                        {msg.userImage ? (
                                            <img src={msg.userImage} alt={msg.users} />
                                        ) : (
                                            <AvatarPlaceholder>{msg.users[0]}</AvatarPlaceholder>
                                        )}
                                    </UserAvatar>
                                    <MessageBody>
                                        <UserName>{msg.users}</UserName>
                                        <MessageText>{msg.message}</MessageText>
                                    </MessageBody>
                                </MessageContent>
                                <SavedItemActions>
                                    <ActionButton
                                        title="Go to message"
                                        onClick={() => handleGoToMessage(msg.roomId)}
                                    >
                                        <OpenInNewIcon />
                                    </ActionButton>
                                    <ActionButton
                                        title="Remove from saved"
                                        onClick={() => handleRemove(msg.messageId, msg.roomId)}
                                        $danger
                                    >
                                        <DeleteOutlineIcon />
                                    </ActionButton>
                                </SavedItemActions>
                            </SavedItem>
                        ))}
                    </>
                ) : (
                    <EmptyState>
                        <EmptyIcon>
                            <BookmarkBorderIcon />
                        </EmptyIcon>
                        <EmptyTitle>No saved items yet</EmptyTitle>
                        <EmptyDescription>
                            Save messages you want to come back to later by clicking the bookmark icon on any message.
                        </EmptyDescription>
                    </EmptyState>
                )}
            </SavedContent>
        </Container>
    );
};

export default SavedPanel;

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

const SavedContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-lg);
`;

const SavedCount = styled.div`
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-bottom: var(--spacing-md);
`;

const SavedItem = styled.div`
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

const SavedItemHeader = styled.div`
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

const SavedDate = styled.span`
    font-size: 0.75rem;
    color: var(--text-muted);
`;

const MessageContent = styled.div`
    display: flex;
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

const MessageBody = styled.div`
    flex: 1;
    min-width: 0;
`;

const UserName = styled.div`
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 2px;
`;

const MessageText = styled.div`
    font-size: 0.9rem;
    color: var(--text-secondary);
    white-space: pre-wrap;
    word-break: break-word;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
`;

const SavedItemActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-sm);
    padding-top: var(--spacing-sm);
    border-top: 1px solid var(--glass-border);
`;

const ActionButton = styled.button<{ $danger?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xs);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    transition: all var(--transition-fast);

    svg {
        font-size: 1.1rem;
    }

    &:hover {
        background: ${(props) => (props.$danger ? 'var(--accent-danger)' : 'var(--glass-bg-hover)')};
        color: ${(props) => (props.$danger ? 'white' : 'var(--accent-primary)')};
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
