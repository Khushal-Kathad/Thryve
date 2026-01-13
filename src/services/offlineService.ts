import localforage from 'localforage';
import type { PendingMessage, ImageData } from '../types';

// Configure localforage
localforage.config({
    name: 'ThryveChat',
    storeName: 'offline_queue',
});

const PENDING_MESSAGES_KEY = 'pendingMessages';

interface MessageInput {
    roomId: string;
    message: string;
    users: string;
    userImage: string;
    imageData?: ImageData | null;
}

export const offlineService = {
    // Get all pending messages
    async getPendingMessages(): Promise<PendingMessage[]> {
        try {
            return (await localforage.getItem<PendingMessage[]>(PENDING_MESSAGES_KEY)) || [];
        } catch (error) {
            console.error('Error getting pending messages:', error);
            return [];
        }
    },

    // Add message to queue
    async addPendingMessage(message: MessageInput): Promise<PendingMessage> {
        try {
            const pending = await this.getPendingMessages();
            const newMessage: PendingMessage = {
                ...message,
                id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                clientTimestamp: Date.now(),
                status: 'pending',
                retryCount: 0,
                createdAt: Date.now(),
            };
            pending.push(newMessage);
            await localforage.setItem(PENDING_MESSAGES_KEY, pending);
            return newMessage;
        } catch (error) {
            console.error('Error adding pending message:', error);
            throw error;
        }
    },

    // Update message status
    async updateMessageStatus(id: string, status: PendingMessage['status'], retryCount: number = 0): Promise<void> {
        try {
            const pending = await this.getPendingMessages();
            const index = pending.findIndex((m) => m.id === id);
            if (index !== -1) {
                pending[index].status = status;
                pending[index].retryCount = retryCount;
                await localforage.setItem(PENDING_MESSAGES_KEY, pending);
            }
        } catch (error) {
            console.error('Error updating message status:', error);
        }
    },

    // Update uploaded image URL (to prevent duplicate uploads on retry)
    async updateUploadedImageUrl(id: string, imageUrl: string): Promise<void> {
        try {
            const pending = await this.getPendingMessages();
            const index = pending.findIndex((m) => m.id === id);
            if (index !== -1) {
                pending[index].uploadedImageUrl = imageUrl;
                await localforage.setItem(PENDING_MESSAGES_KEY, pending);
            }
        } catch (error) {
            console.error('Error updating uploaded image URL:', error);
        }
    },

    // Remove message from queue
    async removePendingMessage(id: string): Promise<void> {
        try {
            const pending = await this.getPendingMessages();
            const filtered = pending.filter((m) => m.id !== id);
            await localforage.setItem(PENDING_MESSAGES_KEY, filtered);
        } catch (error) {
            console.error('Error removing pending message:', error);
        }
    },

    // Get messages for specific room
    async getPendingMessagesForRoom(roomId: string): Promise<PendingMessage[]> {
        try {
            const pending = await this.getPendingMessages();
            return pending.filter((m) => m.roomId === roomId);
        } catch (error) {
            console.error('Error getting pending messages for room:', error);
            return [];
        }
    },

    // Get count of pending messages
    async getPendingCount(): Promise<number> {
        try {
            const pending = await this.getPendingMessages();
            return pending.length;
        } catch (error) {
            console.error('Error getting pending count:', error);
            return 0;
        }
    },

    // Clear all pending messages (use with caution)
    async clearAllPending(): Promise<void> {
        try {
            await localforage.setItem(PENDING_MESSAGES_KEY, []);
        } catch (error) {
            console.error('Error clearing pending messages:', error);
        }
    },
};

export default offlineService;
