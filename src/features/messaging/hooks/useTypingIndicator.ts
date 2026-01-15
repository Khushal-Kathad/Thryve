import { useState, useEffect } from 'react';
import { typingService, TypingUser } from '../../../services/typingService';

interface UseTypingIndicatorOptions {
    roomId: string;
    userId: string | undefined;
}

interface UseTypingIndicatorReturn {
    typingUsers: TypingUser[];
}

export function useTypingIndicator({ roomId, userId }: UseTypingIndicatorOptions): UseTypingIndicatorReturn {
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

    useEffect(() => {
        if (roomId === 'null' || !userId) {
            setTypingUsers([]);
            return;
        }

        const unsubscribe = typingService.listenForTyping(roomId, userId, (users) => {
            setTypingUsers(users);
        });

        return () => {
            unsubscribe();
            typingService.stopListening();
        };
    }, [roomId, userId]);

    return { typingUsers };
}

// Helper function to format typing text
export function formatTypingText(typingUsers: TypingUser[], dmUserName?: string): string {
    if (typingUsers.length === 0) return '';

    if (dmUserName) {
        return `${dmUserName} is typing...`;
    }

    if (typingUsers.length === 1) {
        return `${typingUsers[0].odUserName} is typing...`;
    }

    if (typingUsers.length === 2) {
        return `${typingUsers[0].odUserName} and ${typingUsers[1].odUserName} are typing...`;
    }

    return `${typingUsers.length} people are typing...`;
}
