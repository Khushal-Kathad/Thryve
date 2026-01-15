import React, { useState, memo, useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { format } from 'date-fns';
import { db } from '../../../../firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { toggleSaveMessage, selectIsMessageSaved } from '../../../../features/appSlice';
import type { RootState } from '../../../../types';
import { useToast } from '../../../../context/ToastContext';

// Sub-components
import QuotedReply from './QuotedReply';
import ReactionBar from './ReactionBar';
import MessageActions from './MessageActions';
import ImagePreviewModal from './ImagePreviewModal';

// Styles
import {
    MessageWrapper,
    AvatarContainer,
    Avatar,
    AvatarPlaceholder,
    BubbleContainer,
    SenderName,
    MessageBubble,
    BubbleTail,
    ImageContainer,
    ImageSkeleton,
    MessageImage,
    ImageErrorPlaceholder,
    MessageText,
    MessageFooter,
    TimeStamp,
    StatusIndicator,
    DeliveredStatus,
    ReadStatus,
    PendingStatus,
} from './Message.styles';

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

    const isSent = currentUserName ? users === currentUserName : false;

    // Clear timeout on unmount
    useEffect(() => {
        return () => {
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }
        };
    }, []);

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
        }, 200);
    }, []);

    // Reset image states when imageUrl changes
    useEffect(() => {
        setImageLoaded(false);
        setImageError(false);
    }, [imageUrl]);

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
            console.warn('Cannot react: missing data or message is pending');
            return;
        }

        const messageRef = doc(db, 'rooms', roomId, 'messages', id);
        const currentReactions = reactions || {};
        const emojiReactions = currentReactions[emoji] || [];
        const hasReacted = emojiReactions.includes(userId);

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
        } catch (error) {
            console.error('Error updating reaction:', error);
            alert('Failed to add reaction. Please try again.');
        }
    }, [userId, roomId, id, reactions, isPending]);

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
                    {/* Sender name for received messages */}
                    {!isSent && <SenderName>{users}</SenderName>}

                    <MessageBubble $isSent={isSent} $isPending={isPending} $hasImage={!!imageUrl}>
                        <BubbleTail $isSent={isSent} $hasImage={!!imageUrl && !message} />

                        {/* Quoted Reply */}
                        {replyTo && <QuotedReply replyTo={replyTo} isSent={isSent} />}

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
                                        onError={() => setImageError(true)}
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

                    {/* Quick actions */}
                    {showActions && !isPending && (
                        <MessageActions
                            isSent={isSent}
                            isSaved={isSaved}
                            copiedMessage={copiedMessage}
                            showReactions={showReactions}
                            userId={userId}
                            reactions={reactions}
                            onToggleReactions={() => setShowReactions(!showReactions)}
                            onReact={handleReaction}
                            onReply={handleReply}
                            onCopy={copyMessage}
                            onSave={handleSave}
                            onDelete={handleDelete}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                        />
                    )}

                    {/* Reactions */}
                    {reactions && (
                        <ReactionBar
                            reactions={reactions}
                            isSent={isSent}
                            userId={userId}
                            onReact={handleReaction}
                        />
                    )}
                </BubbleContainer>
            </MessageWrapper>

            {/* Image Preview Modal */}
            {showImagePreview && imageUrl && (
                <ImagePreviewModal
                    imageUrl={imageUrl}
                    senderName={users}
                    timestamp={timestamp}
                    onClose={() => setShowImagePreview(false)}
                />
            )}
        </>
    );
};

export default memo(Message);
