import { useState, useEffect, useCallback } from 'react';
import { useCollection, useDocument } from 'react-firebase-hooks/firestore';
import { collection, doc, query, orderBy, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import { offlineService } from '../../../services/offlineService';
import type { PendingMessage } from '../../../types';

interface UseMessagesOptions {
    roomId: string;
}

interface UseMessagesReturn {
    roomDetails: ReturnType<typeof useDocument>[0];
    roomMessages: ReturnType<typeof useCollection>[0];
    loading: boolean;
    pendingMessages: PendingMessage[];
    loadPendingMessages: () => Promise<void>;
    isDM: boolean;
}

export function useMessages({ roomId }: UseMessagesOptions): UseMessagesReturn {
    const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);

    const [roomDetails] = useDocument(
        roomId !== 'null' ? doc(db, 'rooms', roomId) : null
    );

    const [roomMessages, loading] = useCollection(
        roomId !== 'null'
            ? query(
                collection(db, 'rooms', roomId, 'messages'),
                orderBy('timestamp', 'asc')
            )
            : null
    );

    const isDM = roomDetails?.data()?.isDM === true;

    const loadPendingMessages = useCallback(async () => {
        if (roomId !== 'null') {
            const pending = await offlineService.getPendingMessagesForRoom(roomId);
            setPendingMessages(pending);
        } else {
            setPendingMessages([]);
        }
    }, [roomId]);

    useEffect(() => {
        loadPendingMessages();
    }, [loadPendingMessages]);

    return {
        roomDetails,
        roomMessages,
        loading,
        pendingMessages,
        loadPendingMessages,
        isDM,
    };
}

interface UseChannelDeletionOptions {
    roomId: string;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export function useChannelDeletion({ roomId, onSuccess, onError }: UseChannelDeletionOptions) {
    const [isDeleting, setIsDeleting] = useState(false);

    const deleteChannel = useCallback(async () => {
        if (!roomId || roomId === 'null') return;

        setIsDeleting(true);
        try {
            // Delete all messages first
            const messagesRef = collection(db, 'rooms', roomId, 'messages');
            const messagesSnapshot = await getDocs(messagesRef);
            const deletePromises = messagesSnapshot.docs.map(docItem =>
                deleteDoc(doc(db, 'rooms', roomId, 'messages', docItem.id))
            );
            await Promise.all(deletePromises);

            // Delete the room
            await deleteDoc(doc(db, 'rooms', roomId));

            onSuccess?.();
        } catch (error) {
            console.error('Error deleting channel:', error);
            onError?.(error as Error);
        } finally {
            setIsDeleting(false);
        }
    }, [roomId, onSuccess, onError]);

    return { deleteChannel, isDeleting };
}
