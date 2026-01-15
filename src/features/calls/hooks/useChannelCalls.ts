import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { callService } from '../../../services/callService';
import { selectIsInCall } from '../../../features/callSlice';
import type { Call } from '../../../types';

interface UseChannelCallsOptions {
    roomId: string;
    isDM: boolean;
}

interface UseChannelCallsReturn {
    activeChannelCall: Call | null;
}

export function useChannelCalls({ roomId, isDM }: UseChannelCallsOptions): UseChannelCallsReturn {
    const [activeChannelCall, setActiveChannelCall] = useState<Call | null>(null);
    const isInCall = useSelector(selectIsInCall);

    // Listen for active group calls in this channel (only for groups, not DMs)
    useEffect(() => {
        if (roomId === 'null' || isDM) {
            setActiveChannelCall(null);
            return;
        }

        const unsubscribe = callService.listenForChannelCalls(roomId, (call) => {
            if (call && isInCall) {
                // Don't show banner if user is already in a call
                setActiveChannelCall(null);
            } else {
                setActiveChannelCall(call);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [roomId, isInCall, isDM]);

    return { activeChannelCall };
}
