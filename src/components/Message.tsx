import React, { useState, memo, useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled, { keyframes } from 'styled-components';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import AddReactionOutlinedIcon from '@mui/icons-material/AddReactionOutlined';
import ReplyIcon from '@mui/icons-material/Reply';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { format } from 'date-fns';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { toggleSaveMessage, selectIsMessageSaved } from '../features/appSlice';
import { useToast } from '../context/ToastContext';
import type { RootState } from '../types';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👏'];

interface ReplyData {
    id: string;
    message: string;
    users: string;
    imageUrl?: string;
}

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
    currentUserName?: string;
    isRead?: boolean;
    replyTo?: ReplyData;
    onReply?: (replyData: ReplyData) => void;
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
    userId,
    currentUserName,
    isRead = false,
    replyTo,
    onReply
}) => {
    const dispatch = useDispatch();
    const { showToast } = useToast();
    const isSaved = useSelector((state: RootState) => selectIsMessageSaved(id)(state));
    const [showActions, setShowActions] = useState(false);
    const [showReactions, setShowReactions] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [showImagePreview, setShowImagePreview] = useState(false);
    const [copiedMessage, setCopiedMessage] = useState(false);
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Determine if this is the current user's message
    const isSent = currentUserName ? users === currentUserName : false;

    // Clear timeout on unmount
    useEffect(() => {
        return () => {
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }
        };
    }, []);

    // Reset image states when imageUrl changes
    useEffect(() => {
        setImageLoaded(false);
        setImageError(false);
    }, [imageUrl]);

    const handleMouseEnter = useCallback(() => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
        setShowActions(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        // Use a delay to allow mouse to move to actions/reactions
        hideTimeoutRef.current = setTimeout(() => {
            setShowActions(false);
            setShowReactions(false);
        }, 300);
    }, []);

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
        if (!userId || !roomId || !id || isPending) {
            console.warn('Cannot react: missing userId, roomId, id, or message is pending', { userId, roomId, id, isPending });
            return;
        }

        const messageRef = doc(db, 'rooms', roomId, 'messages', id);
        const currentReactions = reactions || {};
        const emojiReactions = currentReactions[emoji] || [];
        const hasReacted = emojiReactions.includes(userId);

        // Close the picker immediately for better UX
        setShowReactions(false);

        try {
            if (hasReacted) {
                await updateDoc(messageRef, {
                    [`reactions.${emoji}`]: arrayRemove(userId)
                });
            } else {
                await updateDoc(messageRef, {
                    [`reactions.${emoji}`]: arrayUnion(userId)
                });
            }
            console.log('Reaction updated successfully:', emoji, hasReacted ? 'removed' : 'added');
        } catch (error: any) {
            console.error('Error updating reaction:', error?.message || error);
            // Show a visual indication that the reaction failed
            alert('Failed to add reaction. Please try again.');
        }
    }, [userId, roomId, id, reactions, isPending]);

    const hasUserReacted = useCallback((emoji: string): boolean => {
        if (!reactions || !reactions[emoji] || !userId) return false;
        return reactions[emoji].includes(userId);
    }, [reactions, userId]);

    const copyMessage = async () => {
        try {
            await navigator.clipboard.writeText(message);
            setCopiedMessage(true);
            setTimeout(() => setCopiedMessage(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
        setShowActions(false);
    };

    const handleReply = () => {
        if (onReply) {
            onReply({
                id,
                message,
                users,
                imageUrl
            });
        }
        setShowActions(false);
    };

    const handleSave = () => {
        dispatch(toggleSaveMessage({ messageId: id, roomId }));
        setShowActions(false);
    };

    const handleDelete = async () => {
        if (!roomId || !id || isPending) {
            showToast('Cannot delete this message', 'error');
            return;
        }

        // Only allow sender to delete their own messages
        if (!isSent) {
            showToast('You can only delete your own messages', 'error');
            return;
        }

        const confirmDelete = window.confirm('Are you sure you want to delete this message?');
        if (!confirmDelete) return;

        try {
            const messageRef = doc(db, 'rooms', roomId, 'messages', id);
            await deleteDoc(messageRef);
            showToast('Message deleted', 'success');
        } catch (error) {
            console.error('Error deleting message:', error);
            showToast('Failed to delete message', 'error');
        }
        setShowActions(false);
    };

    const getTotalReactions = () => {
        if (!reactions) return 0;
        return Object.values(reactions).reduce((total, users) => total + users.length, 0);
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <>
            <MessageWrapper
                $isSent={isSent}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {/* Avatar - only show for received messages */}
                {!isSent && (
                    <AvatarContainer>
                        {userImage ? (
                            <Avatar src={userImage} alt={users} />
                        ) : (
                            <AvatarPlaceholder>
                                {getInitials(users)}
                            </AvatarPlaceholder>
                        )}
                    </AvatarContainer>
                )}

                <BubbleContainer $isSent={isSent}>
                    {/* Sender name for received messages in groups */}
                    {!isSent && <SenderName>{users}</SenderName>}

                    <MessageBubble $isSent={isSent} $isPending={isPending} $hasImage={!!imageUrl}>
                        {/* Bubble tail */}
                        <BubbleTail $isSent={isSent} $hasImage={!!imageUrl && !message} />

                        {/* Quoted Reply */}
                        {replyTo && (
                            <QuotedReply $isSent={isSent}>
                                <QuotedBar $isSent={isSent} />
                                <QuotedContent>
                                    <QuotedUser $isSent={isSent}>{replyTo.users}</QuotedUser>
                                    <QuotedText $isSent={isSent}>
                                        {replyTo.imageUrl ? '📷 Photo' : replyTo.message.slice(0, 60)}
                                        {replyTo.message.length > 60 && '...'}
                                    </QuotedText>
                                </QuotedContent>
                                {replyTo.imageUrl && (
                                    <QuotedImage src={replyTo.imageUrl} alt="" />
                                )}
                            </QuotedReply>
                        )}

                        {/* Image */}
                        {imageUrl && (
                            <ImageContainer
                                onClick={() => setShowImagePreview(true)}
                                $isOnly={!message}
                            >
                                {!imageLoaded && !imageError && <ImageSkeleton />}
                                {imageError ? (
                                    <ImageErrorPlaceholder>
                                        <span>Failed to load image</span>
                                    </ImageErrorPlaceholder>
                                ) : (
                                    <MessageImage
                                        src={imageUrl}
                                        alt="Shared"
                                        onLoad={() => setImageLoaded(true)}
                                        onError={() => {
                                            console.error('Image failed to load:', imageUrl?.substring(0, 50));
                                            setImageError(true);
                                        }}
                                        $loaded={imageLoaded}
                                    />
                                )}
                            </ImageContainer>
                        )}

                        {/* Message text */}
                        {message && (
                            <MessageText $isSent={isSent} $hasImage={!!imageUrl}>
                                {message}
                            </MessageText>
                        )}

                        {/* Message footer with time and status */}
                        <MessageFooter $isSent={isSent} $isOverImage={!!imageUrl && !message}>
                            <TimeStamp
                                $isSent={isSent}
                                $isOverImage={!!imageUrl && !message}
                                title={formatFullDate(timestamp)}
                            >
                                {formatTime(timestamp)}
                            </TimeStamp>

                            {isSent && (
                                <StatusIndicator $isOverImage={!!imageUrl && !message}>
                                    {isPending ? (
                                        <PendingStatus $status={pendingStatus}>
                                            {pendingStatus === 'pending' && <ScheduleIcon />}
                                            {pendingStatus === 'uploading' && <CloudUploadIcon />}
                                            {pendingStatus === 'failed' && <ErrorOutlineIcon />}
                                        </PendingStatus>
                                    ) : isRead ? (
                                        <ReadStatus><DoneAllIcon /></ReadStatus>
                                    ) : (
                                        <DeliveredStatus><DoneAllIcon /></DeliveredStatus>
                                    )}
                                </StatusIndicator>
                            )}
                        </MessageFooter>
                    </MessageBubble>

                    {/* Quick actions - Moved inside BubbleContainer to fix positioning */}
                    {showActions && !isPending && (
                        <ActionsContainer
                            $isSent={isSent}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                        >
                            <ActionBtn
                                onClick={() => setShowReactions(!showReactions)}
                                title="Add reaction"
                                $isActive={showReactions}
                            >
                                <AddReactionOutlinedIcon />
                            </ActionBtn>
                            <ActionBtn title="Reply" onClick={handleReply}>
                                <ReplyIcon />
                            </ActionBtn>
                            <ActionBtn
                                onClick={copyMessage}
                                title={copiedMessage ? "Copied!" : "Copy"}
                                $isActive={copiedMessage}
                            >
                                <ContentCopyIcon />
                            </ActionBtn>
                            <ActionBtn
                                onClick={handleSave}
                                title={isSaved ? "Unsave" : "Save"}
                                $isActive={isSaved}
                            >
                                {isSaved ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                            </ActionBtn>
                            {isSent && (
                                <ActionBtn
                                    title="Delete"
                                    onClick={handleDelete}
                                    $isDelete
                                >
                                    <DeleteOutlineIcon />
                                </ActionBtn>
                            )}

                            {showReactions && (
                                <ReactionPicker
                                    $isSent={isSent}
                                    onMouseEnter={handleMouseEnter}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    {QUICK_REACTIONS.map((emoji) => (
                                        <ReactionBtn
                                            key={emoji}
                                            onClick={() => handleReaction(emoji)}
                                            $isActive={hasUserReacted(emoji)}
                                        >
                                            {emoji}
                                        </ReactionBtn>
                                    ))}
                                </ReactionPicker>
                            )}
                        </ActionsContainer>
                    )}

                    {/* Reactions */}
                    {reactions && getTotalReactions() > 0 && (
                        <ReactionsBar $isSent={isSent}>
                            {Object.entries(reactions).map(([emoji, userIds]) => {
                                if (!userIds || userIds.length === 0) return null;
                                return (
                                    <ReactionPill
                                        key={emoji}
                                        onClick={() => handleReaction(emoji)}
                                        $isActive={hasUserReacted(emoji)}
                                    >
                                        <span className="emoji">{emoji}</span>
                                        {userIds.length > 1 && (
                                            <span className="count">{userIds.length}</span>
                                        )}
                                    </ReactionPill>
                                );
                            })}
                        </ReactionsBar>
                    )}
                </BubbleContainer>


            </MessageWrapper>

            {/* Image Preview Modal */}
            {showImagePreview && imageUrl && (
                <ImagePreviewOverlay onClick={() => setShowImagePreview(false)}>
                    <ImagePreviewContent onClick={(e) => e.stopPropagation()}>
                        <ClosePreviewBtn onClick={() => setShowImagePreview(false)}>
                            ×
                        </ClosePreviewBtn>
                        <PreviewImage src={imageUrl} alt="Preview" />
                        <PreviewInfo>
                            <PreviewSender>{users}</PreviewSender>
                            <PreviewTime>{formatFullDate(timestamp)}</PreviewTime>
                        </PreviewInfo>
                    </ImagePreviewContent>
                </ImagePreviewOverlay>
            )}
        </>
    );
};

export default memo(Message);

// Animations
const fadeIn = keyframes`
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
`;

const slideInLeft = keyframes`
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
`;

const slideInRight = keyframes`
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
`;

const popIn = keyframes`
    0% { opacity: 0; transform: scale(0.5); }
    70% { transform: scale(1.1); }
    100% { opacity: 1; transform: scale(1); }
`;

const pulse = keyframes`
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
`;

const shimmer = keyframes`
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
`;

// Styled Components
const MessageWrapper = styled.div<{ $isSent: boolean }>`
    display: flex;
    align-items: flex-end;
    gap: var(--spacing-xs);
    margin-bottom: 4px;
    padding: 2px var(--spacing-md);
    justify-content: ${props => props.$isSent ? 'flex-end' : 'flex-start'};
    animation: ${props => props.$isSent ? slideInRight : slideInLeft} 0.25s ease-out;
    position: relative;

    @media (max-width: 480px) {
        padding: 2px var(--spacing-sm);
    }
`;

const AvatarContainer = styled.div`
    flex-shrink: 0;
    margin-bottom: 18px;
`;

const Avatar = styled.img`
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    object-fit: cover;
    box-shadow: var(--shadow-sm);

    @media (max-width: 480px) {
        width: 24px;
        height: 24px;
    }
`;

const AvatarPlaceholder = styled.div`
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.65rem;
    font-weight: 600;
    color: white;
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.4);

    @media (max-width: 480px) {
        width: 24px;
        height: 24px;
        font-size: 0.55rem;
    }
`;

const BubbleContainer = styled.div<{ $isSent: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: ${props => props.$isSent ? 'flex-end' : 'flex-start'};
    max-width: 70%;
    position: relative;

    @media (max-width: 768px) {
        max-width: 80%;
    }

    @media (max-width: 480px) {
        max-width: 85%;
    }
`;

const SenderName = styled.span`
    font-size: 0.7rem;
    font-weight: 700;
    background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 2px;
    margin-left: 12px;
`;

const MessageBubble = styled.div<{ $isSent: boolean; $isPending?: boolean; $hasImage?: boolean }>`
    position: relative;
    padding: ${props => props.$hasImage ? '4px' : 'var(--spacing-sm) var(--spacing-md)'};
    border-radius: ${props => props.$isSent
        ? '18px 18px 4px 18px'
        : '18px 18px 18px 4px'
    };
    background: ${props => props.$isSent
        ? 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 50%, #EC4899 100%)'
        : 'var(--glass-bg)'
    };
    backdrop-filter: ${props => props.$isSent ? 'none' : 'blur(10px)'};
    -webkit-backdrop-filter: ${props => props.$isSent ? 'none' : 'blur(10px)'};
    box-shadow: ${props => props.$isSent
        ? '0 4px 20px rgba(139, 92, 246, 0.5), 0 0 40px rgba(236, 72, 153, 0.2)'
        : '0 2px 12px rgba(0, 0, 0, 0.1)'
    };
    border: ${props => props.$isSent ? 'none' : '1px solid var(--glass-border)'};
    opacity: ${props => props.$isPending ? 0.7 : 1};
    min-width: 60px;
    overflow: hidden;
    transition: all 0.25s ease;

    &:hover {
        box-shadow: ${props => props.$isSent
        ? '0 6px 28px rgba(139, 92, 246, 0.6), 0 0 50px rgba(236, 72, 153, 0.3)'
        : '0 4px 16px rgba(0, 0, 0, 0.15)'
    };
        transform: translateY(-1px);
    }
`;

const BubbleTail = styled.div<{ $isSent: boolean; $hasImage?: boolean }>`
    position: absolute;
    bottom: 0;
    ${props => props.$isSent ? 'right: -8px;' : 'left: -8px;'}
    width: 12px;
    height: 20px;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        bottom: 0;
        ${props => props.$isSent ? 'right: 0;' : 'left: 0;'}
        width: 20px;
        height: 20px;
        background: ${props => props.$isSent
        ? 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)'
        : 'var(--glass-bg)'
    };
        border-radius: ${props => props.$isSent ? '0 0 0 15px' : '0 0 15px 0'};
        ${props => !props.$isSent && 'border: 1px solid var(--glass-border); border-top: none;'}
    }
`;

const ImageContainer = styled.div<{ $isOnly?: boolean }>`
    margin: ${props => props.$isOnly ? '0' : '0 0 var(--spacing-xs) 0'};
    border-radius: 14px;
    overflow: hidden;
    cursor: pointer;
    position: relative;
    min-height: 100px;
`;

const ImageSkeleton = styled.div`
    width: 100%;
    min-width: 200px;
    min-height: 150px;
    background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-secondary) 50%, var(--bg-tertiary) 75%);
    background-size: 200% 100%;
    animation: ${shimmer} 1.5s infinite;
    border-radius: 14px;
`;

const MessageImage = styled.img<{ $loaded: boolean }>`
    width: 100%;
    max-width: 280px;
    min-width: 150px;
    max-height: 350px;
    object-fit: cover;
    opacity: ${props => props.$loaded ? 1 : 0};
    position: ${props => props.$loaded ? 'relative' : 'absolute'};
    top: 0;
    left: 0;
    transition: opacity 0.3s ease, transform 0.2s ease, filter 0.2s ease;

    &:hover {
        filter: brightness(0.95);
    }

    @media (max-width: 480px) {
        max-width: 200px;
        max-height: 250px;
    }
`;

const ImageErrorPlaceholder = styled.div`
    width: 100%;
    min-width: 150px;
    min-height: 100px;
    max-width: 280px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-tertiary);
    border-radius: 14px;
    color: var(--text-muted);
    font-size: 0.85rem;
    padding: var(--spacing-md);
`;

const MessageText = styled.p<{ $isSent: boolean; $hasImage?: boolean }>`
    color: ${props => props.$isSent ? 'white' : 'var(--text-primary)'};
    font-size: 0.95rem;
    line-height: 1.45;
    word-wrap: break-word;
    white-space: pre-wrap;
    margin: 0;
    padding: ${props => props.$hasImage ? 'var(--spacing-xs) var(--spacing-sm) 0' : '0'};

    @media (max-width: 480px) {
        font-size: 0.9rem;
    }
`;

const MessageFooter = styled.div<{ $isSent: boolean; $isOverImage?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 3px;
    margin-top: 2px;
    padding: ${props => props.$isOverImage ? '4px 8px' : '0'};
    ${props => props.$isOverImage && `
        position: absolute;
        bottom: 8px;
        right: 8px;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 10px;
    `}
`;

const TimeStamp = styled.span<{ $isSent: boolean; $isOverImage?: boolean }>`
    font-size: 0.65rem;
    color: ${props => {
        if (props.$isOverImage) return 'rgba(255, 255, 255, 0.9)';
        return props.$isSent ? 'rgba(255, 255, 255, 0.75)' : 'var(--text-muted)';
    }};
    font-weight: 500;
`;

const StatusIndicator = styled.div<{ $isOverImage?: boolean }>`
    display: flex;
    align-items: center;
    margin-left: 2px;
`;

const DeliveredStatus = styled.span`
    color: rgba(255, 255, 255, 0.75);
    display: flex;
    align-items: center;

    svg { font-size: 0.95rem; }
`;

const ReadStatus = styled.span`
    color: #34D399;
    display: flex;
    align-items: center;

    svg { font-size: 0.95rem; }
`;

const PendingStatus = styled.span<{ $status?: string }>`
    display: flex;
    align-items: center;
    color: ${props => props.$status === 'failed' ? '#F87171' : 'rgba(255, 255, 255, 0.75)'};
    animation: ${pulse} 2s ease-in-out infinite;

    svg { font-size: 0.85rem; }
`;

const ReactionsBar = styled.div<{ $isSent: boolean }>`
    display: flex;
    gap: 4px;
    margin-top: -8px;
    margin-bottom: 4px;
    flex-wrap: wrap;
    justify-content: ${props => props.$isSent ? 'flex-end' : 'flex-start'};
    padding: 0 8px;
`;

const ReactionPill = styled.button<{ $isActive?: boolean }>`
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 4px 10px;
    background: ${props => props.$isActive
        ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)'
        : 'var(--glass-bg)'};
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid ${props => props.$isActive ? 'rgba(139, 92, 246, 0.5)' : 'var(--glass-border)'};
    border-radius: 14px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(139, 92, 246, 0.15);

    .emoji { font-size: 1rem; }
    .count {
        font-size: 0.7rem;
        font-weight: 700;
        color: ${props => props.$isActive ? '#8B5CF6' : 'var(--text-secondary)'};
    }

    &:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 16px rgba(139, 92, 246, 0.25);
        border-color: rgba(139, 92, 246, 0.5);
    }
`;

const ActionsContainer = styled.div<{ $isSent: boolean }>`
    position: absolute;
    display: flex;
    gap: 2px;
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--glass-border);
    border-radius: 14px;
    padding: 4px;
    box-shadow: 0 8px 32px rgba(139, 92, 246, 0.25),
                0 0 0 1px rgba(255, 255, 255, 0.1) inset;
    animation: ${fadeIn} 0.15s ease-out;
    z-index: 100;
    min-width: max-content;

    /* Positioning logic */
    ${props => props.$isSent ? `
        /* Sent messages: Show ABOVE the bubble aligned to right to avoid left-sidebar clipping */
        top: -50px;
        right: 0;
        margin-right: 0;
        transform: none;
    ` : `
        /* Received messages: Show to the RIGHT of the bubble (safe from sidebar) */
        top: 50%;
        left: 100%;
        margin-left: 8px;
        transform: translateY(-50%);
    `}

    @media (max-width: 768px) {
        /* On mobile, always show above */
        top: -50px;
        transform: none;
        flex-wrap: nowrap;

        ${props => props.$isSent
        ? 'right: 0; margin-right: 0;'
        : 'left: 0; margin-left: 0;'
    }
    }
`;

const ActionBtn = styled.button<{ $isActive?: boolean; $isDelete?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    color: ${props => {
        if (props.$isDelete) return 'var(--text-secondary)';
        return props.$isActive ? '#8B5CF6' : 'var(--text-secondary)';
    }};
    background: ${props => props.$isActive ? 'rgba(139, 92, 246, 0.15)' : 'transparent'};
    transition: all 0.2s ease;

    svg {
        font-size: 1rem;
        transition: transform 0.2s ease;
    }

    &:hover {
        background: ${props => props.$isDelete
            ? 'rgba(253, 58, 85, 0.15)'
            : 'rgba(139, 92, 246, 0.15)'};
        color: ${props => props.$isDelete ? '#FD3A55' : '#8B5CF6'};

        svg {
            transform: scale(1.15);
        }
    }
`;

const ReactionPicker = styled.div<{ $isSent: boolean }>`
    position: absolute;
    bottom: calc(100% + 8px);
    ${props => props.$isSent ? 'right: 0;' : 'left: 0;'}
    display: flex;
    gap: 4px;
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--glass-border);
    border-radius: 28px;
    padding: 10px 14px;
    box-shadow: 0 12px 40px rgba(139, 92, 246, 0.3),
                0 0 0 1px rgba(255, 255, 255, 0.1) inset;
    animation: ${popIn} 0.2s ease-out;
    z-index: 20;
`;

const ReactionBtn = styled.button<{ $isActive?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    font-size: 1.4rem;
    background: ${props => props.$isActive ? 'rgba(139, 92, 246, 0.2)' : 'transparent'};
    transition: all 0.2s ease;

    &:hover {
        background: rgba(139, 92, 246, 0.15);
        transform: scale(1.3);
    }

    &:active {
        transform: scale(1.1);
    }
`;

const ImagePreviewOverlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(15, 15, 26, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: ${fadeIn} 0.2s ease-out;
    cursor: zoom-out;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
`;

const ImagePreviewContent = styled.div`
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
    cursor: default;
    display: flex;
    flex-direction: column;
    align-items: center;
`;

const ClosePreviewBtn = styled.button`
    position: absolute;
    top: -50px;
    right: 0;
    width: 44px;
    height: 44px;
    border-radius: var(--radius-full);
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(236, 72, 153, 0.3) 100%);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    font-size: 1.8rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    line-height: 1;

    &:hover {
        background: linear-gradient(135deg, rgba(139, 92, 246, 0.5) 0%, rgba(236, 72, 153, 0.5) 100%);
        transform: scale(1.1) rotate(90deg);
        box-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
    }
`;

const PreviewImage = styled.img`
    max-width: 90vw;
    max-height: 80vh;
    object-fit: contain;
    border-radius: 12px;
    box-shadow: 0 25px 80px rgba(139, 92, 246, 0.4),
                0 0 0 1px rgba(255, 255, 255, 0.1);
`;

const PreviewInfo = styled.div`
    margin-top: 16px;
    text-align: center;
`;

const PreviewSender = styled.div`
    font-weight: 700;
    font-size: 1rem;
    margin-bottom: 4px;
    background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
`;

const PreviewTime = styled.div`
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.85rem;
`;

// Quoted Reply Styles
const QuotedReply = styled.div<{ $isSent: boolean }>`
    display: flex;
    align-items: stretch;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    margin: var(--spacing-xs);
    margin-bottom: var(--spacing-sm);
    background: ${props => props.$isSent
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(139, 92, 246, 0.08)'
    };
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: ${props => props.$isSent
        ? 'rgba(255, 255, 255, 0.18)'
        : 'rgba(139, 92, 246, 0.12)'
    };
    }
`;

const QuotedBar = styled.div<{ $isSent: boolean }>`
    width: 3px;
    background: ${props => props.$isSent
        ? 'rgba(255, 255, 255, 0.8)'
        : 'linear-gradient(180deg, #8B5CF6 0%, #EC4899 100%)'
    };
    border-radius: 2px;
    flex-shrink: 0;
`;

const QuotedContent = styled.div`
    flex: 1;
    min-width: 0;
    padding-left: var(--spacing-xs);
`;

const QuotedUser = styled.span<{ $isSent: boolean }>`
    display: block;
    font-size: 0.7rem;
    font-weight: 700;
    color: ${props => props.$isSent
        ? 'rgba(255, 255, 255, 0.9)'
        : '#8B5CF6'
    };
    margin-bottom: 2px;
`;

const QuotedText = styled.span<{ $isSent: boolean }>`
    display: block;
    font-size: 0.8rem;
    color: ${props => props.$isSent
        ? 'rgba(255, 255, 255, 0.75)'
        : 'var(--text-secondary)'
    };
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const QuotedImage = styled.img`
    width: 40px;
    height: 40px;
    border-radius: var(--radius-sm);
    object-fit: cover;
    flex-shrink: 0;
`;
