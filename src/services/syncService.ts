import { offlineService } from './offlineService';
import { uploadToCloudinary } from '../cloudinary';
import { db } from '../firebase';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';

interface SyncResult {
    synced: number;
    failed: number;
}

type SyncCompleteCallback = (result: SyncResult) => void;

class SyncService {
    private isSyncing: boolean = false;
    private onSyncComplete: SyncCompleteCallback | null = null;

    async syncPendingMessages(): Promise<SyncResult> {
        if (this.isSyncing || !navigator.onLine) {
            return { synced: 0, failed: 0 };
        }

        this.isSyncing = true;
        let synced = 0;
        let failed = 0;

        try {
            const pending = await offlineService.getPendingMessages();

            if (pending.length === 0) {
                this.isSyncing = false;
                return { synced: 0, failed: 0 };
            }

            // Sort by clientTimestamp to maintain order
            const sorted = [...pending].sort((a, b) => a.clientTimestamp - b.clientTimestamp);

            for (const message of sorted) {
                if (!navigator.onLine) {
                    break;
                }

                try {
                    await offlineService.updateMessageStatus(message.id, 'uploading', message.retryCount);

                    let imageUrl: string | null = message.uploadedImageUrl || null;

                    // Upload image if present AND not already uploaded
                    if (message.imageData && !imageUrl) {
                        try {
                            // Convert base64 to blob
                            const response = await fetch(message.imageData.base64);
                            const blob = await response.blob();
                            const file = new File([blob], message.imageData.fileName, {
                                type: message.imageData.mimeType,
                            });

                            const result = await uploadToCloudinary(file);
                            imageUrl = result.url;

                            // Cache the uploaded URL to prevent duplicate uploads on retry
                            await offlineService.updateUploadedImageUrl(message.id, imageUrl);
                        } catch (uploadError) {
                            console.error('Image upload error:', uploadError);
                            // Continue without image if upload fails
                        }
                    }

                    // Create Firestore document
                    const chatDoc = doc(db, 'rooms', message.roomId);
                    const messageDoc = doc(collection(chatDoc, 'messages'));

                    await setDoc(messageDoc, {
                        message: message.message,
                        timestamp: Timestamp.fromMillis(message.clientTimestamp),
                        users: message.users,
                        userImage: message.userImage,
                        userId: message.userId,
                        ...(imageUrl && { imageUrl }),
                    });

                    // Remove from pending
                    await offlineService.removePendingMessage(message.id);
                    synced++;
                } catch (error) {
                    console.error('Sync error for message:', message.id, error);

                    const newRetryCount = message.retryCount + 1;
                    if (newRetryCount >= 3) {
                        await offlineService.updateMessageStatus(message.id, 'failed', newRetryCount);
                    } else {
                        await offlineService.updateMessageStatus(message.id, 'pending', newRetryCount);
                    }
                    failed++;
                }
            }
        } catch (error) {
            console.error('Sync service error:', error);
        } finally {
            this.isSyncing = false;

            if (this.onSyncComplete) {
                this.onSyncComplete({ synced, failed });
            }
        }

        return { synced, failed };
    }

    setOnSyncComplete(callback: SyncCompleteCallback): void {
        this.onSyncComplete = callback;
    }
}

export const syncService = new SyncService();
export default syncService;
