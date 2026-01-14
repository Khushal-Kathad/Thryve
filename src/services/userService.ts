import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    Unsubscribe,
} from 'firebase/firestore';
import { db, reconnectFirestore } from '../firebase';

// Helper function to extract name from email
const getNameFromEmail = (email: string | null): string => {
    if (!email) return 'Anonymous';
    const namePart = email.split('@')[0];
    // Convert email prefix to readable name (e.g., john.doe -> John Doe)
    return namePart
        .replace(/[._-]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

// Retry wrapper for Firestore operations
const withRetry = async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
): Promise<T> => {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            console.warn(`Operation failed (attempt ${i + 1}/${maxRetries}):`, error.message);

            if (i < maxRetries - 1) {
                // Try to reconnect Firestore before retry
                if (error.code === 'unavailable' || error.message?.includes('Fetch failed')) {
                    await reconnectFirestore();
                }
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            }
        }
    }
    throw lastError;
};

export interface AppUser {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string;
    lastSeen: number;
    isOnline: boolean;
    createdAt: number;
}

class UserService {
    private usersUnsubscribe: Unsubscribe | null = null;
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    private currentUserId: string | null = null;

    // Save or update user when they log in
    async saveUser(user: {
        uid: string;
        displayName: string | null;
        email: string | null;
        photoURL: string | null;
    }): Promise<boolean> {
        try {
            const userRef = doc(db, 'users', user.uid);

            // Get display name - prefer displayName, fall back to email-derived name
            const displayName = user.displayName?.trim() || getNameFromEmail(user.email);

            // Always save user data with merge to update existing or create new
            const userData: Partial<AppUser> = {
                uid: user.uid,
                displayName: displayName,
                email: user.email || '',
                photoURL: user.photoURL || '',
                lastSeen: Date.now(),
                isOnline: true,
            };

            // Check if user exists to set createdAt only for new users
            let isNewUser = true;
            try {
                const userDoc = await withRetry(() => getDoc(userRef), 2, 500);
                isNewUser = !userDoc.exists();
            } catch (readError) {
                console.warn('Could not check if user exists:', readError);
            }

            if (isNewUser) {
                userData.createdAt = Date.now();
            }

            // Save with retry logic
            await withRetry(() => setDoc(userRef, userData, { merge: true }));
            console.log('User saved successfully:', user.uid, displayName);

            // Store current user ID and start heartbeat
            this.currentUserId = user.uid;
            this.startHeartbeat(user.uid);

            return true;
        } catch (error) {
            console.error('Error saving user:', error);
            return false;
        }
    }

    // Start periodic heartbeat to keep online status updated
    startHeartbeat(uid: string): void {
        // Clear any existing heartbeat
        this.stopHeartbeat();

        // Update online status every 2 minutes
        this.heartbeatInterval = setInterval(async () => {
            try {
                await this.setUserOnline(uid, true);
                console.log('Heartbeat: Online status updated');
            } catch (error) {
                console.error('Heartbeat failed:', error);
            }
        }, 2 * 60 * 1000); // Every 2 minutes
    }

    // Stop heartbeat
    stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // Update user's online status
    async setUserOnline(uid: string, isOnline: boolean): Promise<void> {
        try {
            const userRef = doc(db, 'users', uid);
            // Use setDoc with merge and retry for resilience
            await withRetry(() => setDoc(userRef, {
                isOnline,
                lastSeen: Date.now(),
            }, { merge: true }), 2, 500);
        } catch (error) {
            console.error('Error setting user online status:', error);
        }
    }

    // Get all users
    async getAllUsers(): Promise<AppUser[]> {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        return snapshot.docs.map(doc => doc.data() as AppUser);
    }

    // Listen for all users (real-time) - optimized for online status
    listenForUsers(onUsersChange: (users: AppUser[]) => void, maxUsers: number = 100): Unsubscribe {
        if (this.usersUnsubscribe) {
            this.usersUnsubscribe();
        }

        try {
            const usersRef = collection(db, 'users');
            // Get more users to ensure we capture all online users
            const q = query(usersRef, limit(maxUsers));

            this.usersUnsubscribe = onSnapshot(q, (snapshot) => {
                console.log('Snapshot received, docs count:', snapshot.docs.length);

                const users = snapshot.docs.map(doc => {
                    const data = doc.data();
                    // Check if user was active in the last 5 minutes for online status
                    const lastSeenTime = data.lastSeen || 0;
                    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
                    const isRecentlyActive = lastSeenTime > fiveMinutesAgo;

                    // Ensure all fields have default values for old users
                    return {
                        uid: data.uid || doc.id,
                        displayName: data.displayName || 'Unknown',
                        email: data.email || '',
                        photoURL: data.photoURL || '',
                        lastSeen: lastSeenTime,
                        // User is online if explicitly set OR was active recently
                        isOnline: data.isOnline === true || isRecentlyActive,
                        createdAt: data.createdAt || 0,
                    } as AppUser;
                });

                // Sort by online status first, then by lastSeen (most recent first)
                users.sort((a, b) => {
                    if (a.isOnline && !b.isOnline) return -1;
                    if (!a.isOnline && b.isOnline) return 1;
                    return (b.lastSeen || 0) - (a.lastSeen || 0);
                });

                console.log('Users processed:', users.map(u => ({ name: u.displayName, online: u.isOnline })));
                onUsersChange(users);
            }, (error) => {
                console.error('Error listening for users:', error);
                // Still call with empty array so loading state ends
                onUsersChange([]);
            });

            return this.usersUnsubscribe;
        } catch (error) {
            console.error('Error setting up user listener:', error);
            // Return a no-op unsubscribe function
            return () => {};
        }
    }

    // Get user by ID
    async getUserById(uid: string): Promise<AppUser | null> {
        const userRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
            return userDoc.data() as AppUser;
        }
        return null;
    }

    // Listen for a specific user's online status
    listenForUserStatus(uid: string, onStatusChange: (isOnline: boolean) => void): Unsubscribe {
        const userRef = doc(db, 'users', uid);
        return onSnapshot(userRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                onStatusChange(data.isOnline ?? false);
            } else {
                onStatusChange(false);
            }
        });
    }

    // Create or get DM room between two users
    async getOrCreateDMRoom(
        currentUserId: string,
        otherUserId: string,
        currentUserName: string,
        otherUserName: string,
        currentUserPhoto?: string,
        otherUserPhoto?: string
    ): Promise<string> {
        // DM room ID is a combination of both user IDs (sorted for consistency)
        const sortedIds = [currentUserId, otherUserId].sort();
        const dmRoomId = `dm_${sortedIds[0]}_${sortedIds[1]}`;

        const roomRef = doc(db, 'rooms', dmRoomId);
        const roomDoc = await getDoc(roomRef);

        if (!roomDoc.exists()) {
            // Create new DM room
            await setDoc(roomRef, {
                name: `${currentUserName} & ${otherUserName}`,
                isDM: true,
                participants: [currentUserId, otherUserId],
                members: [currentUserId, otherUserId],
                memberNames: {
                    [currentUserId]: currentUserName,
                    [otherUserId]: otherUserName,
                },
                participantPhotos: {
                    [currentUserId]: currentUserPhoto || '',
                    [otherUserId]: otherUserPhoto || '',
                },
                createdAt: Date.now(),
                createdBy: currentUserId,
                passwordHash: null,
                isPrivate: true,
            });
        }

        return dmRoomId;
    }

    // Stop listening for users
    stopListening(): void {
        if (this.usersUnsubscribe) {
            this.usersUnsubscribe();
            this.usersUnsubscribe = null;
        }
    }

    // Full cleanup - call when user logs out
    cleanup(): void {
        this.stopListening();
        this.stopHeartbeat();
        this.currentUserId = null;
    }

    // Get current user ID
    getCurrentUserId(): string | null {
        return this.currentUserId;
    }
}

export const userService = new UserService();
export default userService;
