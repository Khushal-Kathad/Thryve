import React from 'react';
import {
    ReactionsBar,
    ReactionPill,
} from './Message.styles';

interface ReactionBarProps {
    reactions: Record<string, string[]>;
    isSent: boolean;
    userId: string | undefined;
    onReact: (emoji: string) => void;
}

const ReactionBar: React.FC<ReactionBarProps> = ({ reactions, isSent, userId, onReact }) => {
    const getTotalReactions = () => {
        return Object.values(reactions).reduce((total, users) => total + users.length, 0);
    };

    const hasUserReacted = (emoji: string): boolean => {
        if (!reactions[emoji] || !userId) return false;
        return reactions[emoji].includes(userId);
    };

    if (getTotalReactions() === 0) return null;

    return (
        <ReactionsBar $isSent={isSent}>
            {Object.entries(reactions).map(([emoji, userIds]) => {
                if (!userIds || userIds.length === 0) return null;
                return (
                    <ReactionPill
                        key={emoji}
                        onClick={() => onReact(emoji)}
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
    );
};

export default ReactionBar;
