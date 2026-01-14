import React, { useState, memo, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Avatar } from '@mui/material';
import AddReactionOutlinedIcon from '@mui/icons-material/AddReactionOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ReplyIcon from '@mui/icons-material/Reply';
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

    // Get initials for avatar placeholder
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

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
                {userImage ? (
                    <StyledAvatar src={userImage} alt={users} $isPending={isPending} />
                ) : (
                    <AvatarPlaceholder $isPending={isPending}>
                        {getInitials(users)}
                    </AvatarPlaceholder>
                )}
            </AvatarWrapper>

            <MessageContent>
                <MessageHeader>
                    <UserName>{users}</UserName>
                    <TimestampWrapper title={formatFullDate(timestamp)}>
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
                            <TimeStamp>{formatTime(timestamp)}</TimeStamp>
                        )}
                    </TimestampWrapper>
                    {isSaved && (
                        <SavedBadge>
                            <BookmarkIcon />
                        </SavedBadge>
                    )}
                </MessageHeader>

                <MessageBubble $isPending={isPending}>
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
                </MessageBubble>

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
                                    <span className="emoji">{emoji}</span>
                                    <span className="count">{userIds.length}</span>
                                </ReactionBadge>
                            );
                        })}
                        <AddReactionButton onClick={() => setShowReactions(!showReactions)}>
                            <AddReactionOutlinedIcon />
                        </AddReactionButton>
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
                    <ActionButton title="Reply">
                        <ReplyIcon />
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
                                    $isActive={hasUserReacted(emoji)}
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

const pulse = keyframes`
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
`;

// Styled Components
const MessageContainer = styled.div<{ $isPending?: boolean }>`
    display: flex;
    gap: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-lg);
    position: relative;
    animation: ${fadeIn} 0.3s ease-out;
    transition: background var(--transition-fast);
    opacity: ${(props) => (props.$isPending ? 0.7 : 1)};

    &:hover {
        background: var(--bg-tertiary);
    }

    @media (max-width: 480px) {
        padding: var(--spacing-sm);
        gap: var(--spacing-sm);
    }
`;

const AvatarWrapper = styled.div`
    flex-shrink: 0;
`;

const StyledAvatar = styled(Avatar)<{ $isPending?: boolean }>`
    width: 40px !important;
    height: 40px !important;
    border: 2px solid var(--bg-primary);
    box-shadow: var(--shadow-sm);
    filter: ${(props) => (props.$isPending ? 'grayscale(50%)' : 'none')};

    @media (max-width: 480px) {
        width: 36px !important;
        height: 36px !important;
    }
`;

const AvatarPlaceholder = styled.div<{ $isPending?: boolean }>`
    width: 40px;
    height: 40px;
    border-radius: var(--radius-full);
    background: var(--gradient-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    font-weight: 600;
    color: white;
    border: 2px solid var(--bg-primary);
    box-shadow: var(--shadow-sm);
    filter: ${(props) => (props.$isPending ? 'grayscale(50%)' : 'none')};

    @media (max-width: 480px) {
        width: 36px;
        height: 36px;
        font-size: 0.75rem;
    }
`;

const MessageContent = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
`;

const MessageHeader = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
`;

const UserName = styled.span`
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.95rem;
    cursor: pointer;
    transition: color var(--transition-fast);

    &:hover {
        color: var(--accent-primary);
    }

    @media (max-width: 480px) {
        font-size: 0.9rem;
    }
`;

const TimestampWrapper = styled.div`
    display: flex;
    align-items: center;
`;

const TimeStamp = styled.span`
    font-size: 0.75rem;
    color: var(--text-muted);
    cursor: default;

    &:hover {
        text-decoration: underline;
    }
`;

const SavedBadge = styled.span`
    display: flex;
    align-items: center;
    color: var(--accent-warning);

    svg {
        font-size: 0.9rem;
    }
`;

const PendingIndicator = styled.div<{ $status?: string }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: var(--radius-full);
    background: ${(props) => {
        if (props.$status === 'failed') return 'rgba(239, 68, 68, 0.1)';
        return 'var(--purple-50)';
    }};
    color: ${(props) => {
        if (props.$status === 'failed') return 'var(--accent-danger)';
        return 'var(--accent-primary)';
    }};
    animation: ${pulse} 2s ease-in-out infinite;

    svg {
        font-size: 0.85rem;
    }

    span {
        font-size: 0.7rem;
        font-weight: 500;
    }
`;

const MessageBubble = styled.div<{ $isPending?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    max-width: 100%;
`;

const MessageText = styled.p`
    color: var(--text-primary);
    font-size: 0.95rem;
    line-height: 1.6;
    word-wrap: break-word;
    white-space: pre-wrap;

    @media (max-width: 480px) {
        font-size: 0.9rem;
    }
`;

const MessageImage = styled.div`
    max-width: 400px;
    border-radius: var(--radius-lg);
    overflow: hidden;
    border: 1px solid var(--border-light);
    box-shadow: var(--shadow-sm);

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

    @media (max-width: 480px) {
        max-width: 280px;
    }
`;

const ReactionsDisplay = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-xs);
`;

const ReactionBadge = styled.button<{ $isActive?: boolean }>`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: ${props => props.$isActive ? 'var(--purple-100)' : 'var(--bg-tertiary)'};
    border: 1px solid ${props => props.$isActive ? 'var(--accent-primary)' : 'var(--border-light)'};
    border-radius: var(--radius-full);
    font-size: 0.85rem;
    transition: all var(--transition-fast);
    cursor: pointer;

    .emoji {
        font-size: 1rem;
    }

    .count {
        font-size: 0.75rem;
        font-weight: 600;
        color: ${props => props.$isActive ? 'var(--accent-primary)' : 'var(--text-secondary)'};
    }

    &:hover {
        background: ${props => props.$isActive ? 'var(--purple-200)' : 'var(--bg-tertiary)'};
        transform: scale(1.05);
        border-color: var(--accent-primary);
    }
`;

const AddReactionButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    background: var(--bg-tertiary);
    border: 1px dashed var(--border-medium);
    color: var(--text-muted);
    transition: all var(--transition-fast);

    svg {
        font-size: 0.9rem;
    }

    &:hover {
        background: var(--purple-50);
        border-color: var(--accent-primary);
        border-style: solid;
        color: var(--accent-primary);
    }
`;

const MessageActions = styled.div`
    position: absolute;
    top: 0;
    right: var(--spacing-md);
    display: flex;
    gap: 2px;
    background: var(--bg-primary);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-lg);
    padding: 4px;
    animation: ${scaleIn} 0.15s ease-out;
    box-shadow: var(--shadow-lg);
    z-index: 5;

    @media (max-width: 480px) {
        right: var(--spacing-sm);
    }
`;

const ActionButton = styled.button<{ $isActive?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    color: ${(props) => (props.$isActive ? 'var(--accent-primary)' : 'var(--text-muted)')};
    transition: all var(--transition-fast);

    svg {
        font-size: 1.1rem;
    }

    &:hover {
        background: var(--purple-50);
        color: var(--accent-primary);
    }
`;

const ReactionPicker = styled.div`
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    display: flex;
    gap: 2px;
    background: var(--bg-primary);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-lg);
    padding: 6px;
    animation: ${scaleIn} 0.15s ease-out;
    box-shadow: var(--shadow-xl);
    z-index: 10;
`;

const ReactionOption = styled.button<{ $isActive?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    font-size: 1.3rem;
    transition: all var(--transition-fast);
    background: ${props => props.$isActive ? 'var(--purple-100)' : 'transparent'};

    &:hover {
        background: var(--purple-50);
        transform: scale(1.2);
    }
`;
