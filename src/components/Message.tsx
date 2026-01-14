import React, { useState, memo, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { Avatar } from '@mui/material';
import AddReactionOutlinedIcon from '@mui/icons-material/AddReactionOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { format } from 'date-fns';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSaveMessage, selectIsMessageSaved } from '../features/appSlice';
import type { RootState } from '../types';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

interface MessageProps {
    id: string;
    message: string;
    timestamp: Timestamp | null;
    users: string;
    userImage: string;
    imageUrl?: string;
    reactions?: Record<string, string[]>;
    roomId: string;
    isPending?: boolean;
    pendingStatus?: 'pending' | 'uploading' | 'failed';
    userId?: string;
}

const Message: React.FC<MessageProps> = ({
    id,
    message,
    timestamp,
    users,
    userImage,
    imageUrl,
    reactions,
    roomId,
    isPending,
    pendingStatus,
    userId
}) => {
    const dispatch = useDispatch();
    const isSaved = useSelector(selectIsMessageSaved(id));
    const [showActions, setShowActions] = useState(false);
    const [showReactions, setShowReactions] = useState(false);

    const handleToggleSave = () => {
        dispatch(toggleSaveMessage({ messageId: id, roomId }));
    };

    const formatTime = (ts: Timestamp | null): string => {
        if (!ts) return '';
        try {
            const date = ts.toDate();
            return format(date, 'h:mm a');
        } catch {
            return '';
        }
    };

    const formatFullDate = (ts: Timestamp | null): string => {
        if (!ts) return '';
        try {
            const date = ts.toDate();
            return format(date, 'MMM d, yyyy h:mm a');
        } catch {
            return '';
        }
    };

    const handleReaction = useCallback(async (emoji: string) => {
        if (!userId || !roomId || !id) return;

        const messageRef = doc(db, 'rooms', roomId, 'messages', id);

        // Check if user already reacted with this emoji
        const currentReactions = reactions || {};
        const emojiReactions = currentReactions[emoji] || [];
        const hasReacted = emojiReactions.includes(userId);

        try {
            if (hasReacted) {
                // Remove reaction
                await updateDoc(messageRef, {
                    [`reactions.${emoji}`]: arrayRemove(userId)
                });
            } else {
                // Add reaction
                await updateDoc(messageRef, {
                    [`reactions.${emoji}`]: arrayUnion(userId)
                });
            }
        } catch (error) {
            console.error('Error updating reaction:', error);
        }

        setShowReactions(false);
    }, [userId, roomId, id, reactions]);

    const hasUserReacted = useCallback((emoji: string): boolean => {
        if (!reactions || !reactions[emoji] || !userId) return false;
        return reactions[emoji].includes(userId);
    }, [reactions, userId]);

    return (
        <MessageContainer
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => {
                setShowActions(false);
                setShowReactions(false);
            }}
            $isPending={isPending}
        >
            <AvatarWrapper>
                <StyledAvatar src={userImage} alt={users} $isPending={isPending} />
            </AvatarWrapper>

            <MessageContent>
                <MessageHeader>
                    <UserName>{users}</UserName>
                    <TimestampStyled title={formatFullDate(timestamp)}>
                        {isPending ? (
                            <PendingIndicator $status={pendingStatus}>
                                {pendingStatus === 'pending' && <ScheduleIcon />}
                                {pendingStatus === 'uploading' && <CloudUploadIcon />}
                                {pendingStatus === 'failed' && <ErrorOutlineIcon />}
                                <span>
                                    {pendingStatus === 'pending' && 'Sending...'}
                                    {pendingStatus === 'uploading' && 'Uploading...'}
                                    {pendingStatus === 'failed' && 'Failed'}
                                </span>
                            </PendingIndicator>
                        ) : (
                            formatTime(timestamp)
                        )}
                    </TimestampStyled>
                </MessageHeader>

                <MessageText>{message}</MessageText>

                {imageUrl && (
                    <MessageImage>
                        <img
                            src={imageUrl}
                            alt="Shared content"
                            loading="lazy"
                            decoding="async"
                        />
                    </MessageImage>
                )}

                {reactions && Object.keys(reactions).length > 0 && (
                    <ReactionsDisplay>
                        {Object.entries(reactions).map(([emoji, userIds]) => {
                            if (!userIds || userIds.length === 0) return null;
                            return (
                                <ReactionBadge
                                    key={emoji}
                                    onClick={() => handleReaction(emoji)}
                                    $isActive={hasUserReacted(emoji)}
                                >
                                    <span>{emoji}</span>
                                    <span>{userIds.length}</span>
                                </ReactionBadge>
                            );
                        })}
                    </ReactionsDisplay>
                )}
            </MessageContent>

            {showActions && !isPending && (
                <MessageActions>
                    <ActionButton
                        onClick={() => setShowReactions(!showReactions)}
                        title="Add reaction"
                    >
                        <AddReactionOutlinedIcon />
                    </ActionButton>
                    <ActionButton
                        onClick={handleToggleSave}
                        title={isSaved ? "Remove from saved" : "Save message"}
                        $isActive={isSaved}
                    >
                        {isSaved ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                    </ActionButton>
                    <ActionButton title="More options">
                        <MoreHorizIcon />
                    </ActionButton>

                    {showReactions && (
                        <ReactionPicker>
                            {QUICK_REACTIONS.map((emoji) => (
                                <ReactionOption
                                    key={emoji}
                                    onClick={() => handleReaction(emoji)}
                                >
                                    {emoji}
                                </ReactionOption>
                            ))}
                        </ReactionPicker>
                    )}
                </MessageActions>
            )}
        </MessageContainer>
    );
};

export default memo(Message);

// Animations
const fadeIn = keyframes`
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

const scaleIn = keyframes`
    from {
        opacity: 0;
        transform: scale(0.8);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
`;

// Styled Components
const MessageContainer = styled.div<{ $isPending?: boolean }>`
    display: flex;
    gap: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    position: relative;
    animation: ${fadeIn} 0.3s ease-out;
    transition: background var(--transition-fast);
    opacity: ${(props) => (props.$isPending ? 0.7 : 1)};

    &:hover {
        background: var(--glass-bg);
    }
`;

const AvatarWrapper = styled.div`
    flex-shrink: 0;
`;

const StyledAvatar = styled(Avatar)<{ $isPending?: boolean }>`
    width: 40px !important;
    height: 40px !important;
    border: 2px solid ${(props) => (props.$isPending ? 'var(--text-muted)' : 'var(--glass-border)')};
    filter: ${(props) => (props.$isPending ? 'grayscale(50%)' : 'none')};
`;

const PendingIndicator = styled.div<{ $status?: string }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: ${(props) => {
        if (props.$status === 'failed') return 'var(--accent-danger)';
        return 'var(--text-muted)';
    }};

    svg {
        font-size: 0.9rem;
    }

    span {
        font-size: 0.75rem;
    }
`;

const MessageContent = styled.div`
    flex: 1;
    min-width: 0;
`;

const MessageHeader = styled.div`
    display: flex;
    align-items: baseline;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-xs);
`;

const UserName = styled.span`
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.95rem;

    &:hover {
        text-decoration: underline;
        cursor: pointer;
    }
`;

const TimestampStyled = styled.span`
    font-size: 0.75rem;
    color: var(--text-muted);
    cursor: default;

    &:hover {
        text-decoration: underline;
    }
`;

const MessageText = styled.p`
    color: var(--text-secondary);
    font-size: 0.95rem;
    line-height: 1.5;
    word-wrap: break-word;
    white-space: pre-wrap;
`;

const MessageImage = styled.div`
    margin-top: var(--spacing-sm);
    max-width: 400px;
    border-radius: var(--radius-md);
    overflow: hidden;
    border: 1px solid var(--glass-border);

    img {
        width: 100%;
        height: auto;
        display: block;
        cursor: pointer;
        transition: transform var(--transition-normal);

        &:hover {
            transform: scale(1.02);
        }
    }
`;

const ReactionsDisplay = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-sm);
`;

const ReactionBadge = styled.button<{ $isActive?: boolean }>`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: ${props => props.$isActive ? 'var(--accent-primary)' : 'var(--glass-bg)'};
    border: 1px solid ${props => props.$isActive ? 'var(--accent-primary)' : 'var(--glass-border)'};
    border-radius: var(--radius-full);
    font-size: 0.85rem;
    color: var(--text-primary);
    transition: all var(--transition-fast);
    cursor: pointer;

    span:first-child {
        font-size: 1rem;
    }

    span:last-child {
        font-size: 0.75rem;
        color: ${props => props.$isActive ? 'white' : 'var(--text-muted)'};
    }

    &:hover {
        background: ${props => props.$isActive ? 'var(--accent-primary)' : 'var(--glass-bg-hover)'};
        transform: scale(1.05);
    }
`;

const MessageActions = styled.div`
    position: absolute;
    top: -8px;
    right: var(--spacing-md);
    display: flex;
    gap: 2px;
    background: var(--bg-secondary);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    padding: 2px;
    animation: ${scaleIn} 0.15s ease-out;
    box-shadow: var(--shadow-md);
`;

const ActionButton = styled.button<{ $isActive?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    color: ${(props) => (props.$isActive ? 'var(--accent-primary)' : 'var(--text-muted)')};
    transition: all var(--transition-fast);

    svg {
        font-size: 1.1rem;
    }

    &:hover {
        background: var(--glass-bg-hover);
        color: ${(props) => (props.$isActive ? 'var(--accent-primary)' : 'var(--text-primary)')};
    }
`;

const ReactionPicker = styled.div`
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: var(--spacing-xs);
    display: flex;
    gap: 2px;
    background: var(--bg-secondary);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    padding: var(--spacing-xs);
    animation: ${scaleIn} 0.15s ease-out;
    box-shadow: var(--shadow-lg);
    z-index: 10;
`;

const ReactionOption = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    font-size: 1.3rem;
    transition: all var(--transition-fast);

    &:hover {
        background: var(--glass-bg-hover);
        transform: scale(1.2);
    }
`;
