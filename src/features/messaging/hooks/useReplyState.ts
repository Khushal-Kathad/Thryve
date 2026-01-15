import { useState, useCallback, useEffect } from 'react';

export interface ReplyData {
    id: string;
    message: string;
    users: string;
    imageUrl?: string;
}

interface UseReplyStateOptions {
    roomId: string;
}

interface UseReplyStateReturn {
    replyTo: ReplyData | null;
    handleReply: (data: ReplyData) => void;
    handleCancelReply: () => void;
}

export function useReplyState({ roomId }: UseReplyStateOptions): UseReplyStateReturn {
    const [replyTo, setReplyTo] = useState<ReplyData | null>(null);

    // Reply handler
    const handleReply = useCallback((data: ReplyData) => {
        setReplyTo(data);
    }, []);

    const handleCancelReply = useCallback(() => {
        setReplyTo(null);
    }, []);

    // Clear reply when room changes
    useEffect(() => {
        setReplyTo(null);
    }, [roomId]);

    return {
        replyTo,
        handleReply,
        handleCancelReply,
    };
}
