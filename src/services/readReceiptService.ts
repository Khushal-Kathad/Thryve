// Read receipts service - WhatsApp-like blue ticks feature
import { doc, updateDoc, arrayUnion, onSnapshot, Unsubscribe, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import debug from '../utils/debug';

export interface ReadReceipt {
    odUserId: string;
    readAt: number;
}

class ReadReceiptService {
    private unreadUnsubscribe: Unsubscribe | null = null;

    // Mark a message as read by current user
    async markAsRead(roomId: string, messageId: string, odUserId: string): Promise<void> {
        const messageRef = doc(db, 'rooms', roomId, 'messages', messageId);

        try {
            await updateDoc(messageRef, {
                readBy: arrayUnion({
                    odUserId,
                    readAt: Date.now(),
                }),
            });
        } catch (error) {
            debug.error('Error marking message as read:', error);
        }
    }

    // Mark all messages in a room as read
    async markAllAsRead(roomId: string, odUserId: string, lastMessageTimestamp?: number): Promise<void> {
        try {
            // Update the user's last read timestamp for this room
            const roomRef = doc(db, 'rooms', roomId);
            await updateDoc(roomRef, {
                [`lastRead.${odUserId}`]: lastMessageTimestamp || Date.now(),
            });
        } catch (error) {
            debug.error('Error marking all as read:', error);
        }
    }

    // Get unread count for a specific room
    async getUnreadCount(roomId: string, odUserId: string, lastReadTimestamp: number): Promise<number> {
        try {
            const messagesRef = collection(db, 'rooms', roomId, 'messages');
            const q = query(
                messagesRef,
                where('timestamp', '>', lastReadTimestamp),
                orderBy('timestamp', 'desc')
            );

            const snapshot = await getDocs(q);
            // Filter out messages from current user
            const unreadMessages = snapshot.docs.filter(docSnap => {
                const data = docSnap.data();
                return data.userId !== odUserId;
            });

            return unreadMessages.length;
        } catch (error) {
            debug.error('Error getting unread count:', error);
            return 0;
        }
    }

    // Listen for unread counts across all rooms
    listenForUnreadCounts(
        userId: string,
        roomIds: string[],
        onUnreadChange: (counts: Record<string, number>) => void
    ): Unsubscribe {
        if (this.unreadUnsubscribe) {
            this.unreadUnsubscribe();
        }

        // This is a simple implementation - for production, consider Cloud Functions
        const counts: Record<string, number> = {};

        // Subscribe to each room's messages - limited to first 10 rooms
        const limitedRoomIds = roomIds.slice(0, 10);

        const unsubscribes: Unsubscribe[] = limitedRoomIds.map((roomId) => {
            const messagesRef = collection(db, 'rooms', roomId, 'messages');
            const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(50));

            return onSnapshot(q, (snapshot) => {
                // Get last read from room doc (simplified - would need separate listener in production)
                let unreadCount = 0;
                snapshot.docs.forEach((docSnap) => {
                    const data = docSnap.data();
                    // Count messages not from current user that aren't read
                    if (data.userId !== userId && !data.readBy?.some((r: ReadReceipt) => r.odUserId === userId)) {
                        unreadCount++;
                    }
                });
                counts[roomId] = unreadCount;
                onUnreadChange({ ...counts });
            });
        });

        this.unreadUnsubscribe = () => {
            unsubscribes.forEach((unsub) => unsub());
        };

        return this.unreadUnsubscribe;
    }

    // Stop listening
    stopListening(): void {
        if (this.unreadUnsubscribe) {
            this.unreadUnsubscribe();
            this.unreadUnsubscribe = null;
        }
    }
}

export const readReceiptService = new ReadReceiptService();
export default readReceiptService;
