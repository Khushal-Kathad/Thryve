// Typing indicators service - WhatsApp-like feature
import { doc, setDoc, onSnapshot, Unsubscribe, deleteDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import debug from '../utils/debug';

export interface TypingUser {
    odUserId: string;
    odUserName: string;
    timestamp: number;
}

class TypingService {
    private typingUnsubscribe: Unsubscribe | null = null;
    private typingTimeout: NodeJS.Timeout | null = null;
    private lastTypingUpdate = 0;
    private readonly TYPING_THROTTLE = 2000; // Update every 2 seconds max
    private readonly TYPING_EXPIRE = 5000; // Typing expires after 5 seconds

    // Set user as typing in a room
    async setTyping(roomId: string, odUserId: string, odUserName: string): Promise<void> {
        const now = Date.now();

        // Throttle updates
        if (now - this.lastTypingUpdate < this.TYPING_THROTTLE) {
            return;
        }
        this.lastTypingUpdate = now;

        const typingRef = doc(db, 'rooms', roomId, 'typing', odUserId);

        try {
            await setDoc(typingRef, {
                odUserId,
                odUserName,
                timestamp: now,
            });

            // Auto-clear typing after timeout
            if (this.typingTimeout) {
                clearTimeout(this.typingTimeout);
            }
            this.typingTimeout = setTimeout(() => {
                this.clearTyping(roomId, odUserId);
            }, this.TYPING_EXPIRE);
        } catch (error) {
            debug.error('Error setting typing status:', error);
        }
    }

    // Clear typing status
    async clearTyping(roomId: string, odUserId: string): Promise<void> {
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }

        const typingRef = doc(db, 'rooms', roomId, 'typing', odUserId);

        try {
            await deleteDoc(typingRef);
        } catch {
            // Ignore errors when clearing
        }
    }

    // Listen for typing users in a room
    listenForTyping(
        roomId: string,
        currentUserId: string,
        onTypingChange: (typingUsers: TypingUser[]) => void
    ): Unsubscribe {
        if (this.typingUnsubscribe) {
            this.typingUnsubscribe();
        }

        const typingRef = collection(db, 'rooms', roomId, 'typing');

        this.typingUnsubscribe = onSnapshot(typingRef, (snapshot) => {
            const now = Date.now();
            const typingUsers: TypingUser[] = [];

            snapshot.docs.forEach((docSnap) => {
                const data = docSnap.data() as TypingUser;
                // Filter out current user and expired typing
                if (data.odUserId !== currentUserId && now - data.timestamp < this.TYPING_EXPIRE) {
                    typingUsers.push(data);
                }
            });

            onTypingChange(typingUsers);
        });

        return this.typingUnsubscribe;
    }

    // Stop listening
    stopListening(): void {
        if (this.typingUnsubscribe) {
            this.typingUnsubscribe();
            this.typingUnsubscribe = null;
        }
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }
    }
}

export const typingService = new TypingService();
export default typingService;
