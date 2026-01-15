import React from 'react';
import AddReactionOutlinedIcon from '@mui/icons-material/AddReactionOutlined';
import ReplyIcon from '@mui/icons-material/Reply';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { QUICK_REACTIONS } from '../../../../shared/constants';
import {
    ActionsContainer,
    ActionBtn,
    ReactionPicker,
    ReactionBtn,
} from './Message.styles';

interface MessageActionsProps {
    isSent: boolean;
    isSaved: boolean;
    copiedMessage: boolean;
    showReactions: boolean;
    userId: string | undefined;
    reactions?: Record<string, string[]>;
    onToggleReactions: () => void;
    onReact: (emoji: string) => void;
    onReply: () => void;
    onCopy: () => void;
    onSave: () => void;
    onDelete: () => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

const MessageActions: React.FC<MessageActionsProps> = ({
    isSent,
    isSaved,
    copiedMessage,
    showReactions,
    userId,
    reactions,
    onToggleReactions,
    onReact,
    onReply,
    onCopy,
    onSave,
    onDelete,
    onMouseEnter,
    onMouseLeave,
}) => {
    const hasUserReacted = (emoji: string): boolean => {
        if (!reactions || !reactions[emoji] || !userId) return false;
        return reactions[emoji].includes(userId);
    };

    return (
        <ActionsContainer
            $isSent={isSent}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <ActionBtn
                onClick={onToggleReactions}
                title="Add reaction"
                $isActive={showReactions}
            >
                <AddReactionOutlinedIcon />
            </ActionBtn>
            <ActionBtn title="Reply" onClick={onReply}>
                <ReplyIcon />
            </ActionBtn>
            <ActionBtn
                onClick={onCopy}
                title={copiedMessage ? "Copied!" : "Copy"}
                $isActive={copiedMessage}
            >
                <ContentCopyIcon />
            </ActionBtn>
            <ActionBtn
                onClick={onSave}
                title={isSaved ? "Unsave" : "Save"}
                $isActive={isSaved}
            >
                {isSaved ? <BookmarkIcon /> : <BookmarkBorderIcon />}
            </ActionBtn>
            {isSent && (
                <ActionBtn
                    title="Delete"
                    onClick={onDelete}
                    $isDelete
                >
                    <DeleteOutlineIcon />
                </ActionBtn>
            )}

            {showReactions && (
                <ReactionPicker
                    $isSent={isSent}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                >
                    {QUICK_REACTIONS.map((emoji) => (
                        <ReactionBtn
                            key={emoji}
                            onClick={() => onReact(emoji)}
                            $isActive={hasUserReacted(emoji)}
                        >
                            {emoji}
                        </ReactionBtn>
                    ))}
                </ReactionPicker>
            )}
        </ActionsContainer>
    );
};

export default MessageActions;
