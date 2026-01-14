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
import { db } from '../firebase';

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

    // Save or update user when they log in
    async saveUser(user: {
        uid: string;
        displayName: string | null;
        email: string | null;
        photoURL: string | null;
    }): Promise<void> {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        const userData: Partial<AppUser> = {
            uid: user.uid,
            displayName: user.displayName || 'Anonymous',
            email: user.email || '',
            photoURL: user.photoURL || '',
            lastSeen: Date.now(),
            isOnline: true,
        };

        if (!userDoc.exists()) {
            // New user - set createdAt
            userData.createdAt = Date.now();
        }

        await setDoc(userRef, userData, { merge: true });
        console.log('User saved:', user.uid);
    }

    // Update user's online status
    async setUserOnline(uid: string, isOnline: boolean): Promise<void> {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
            isOnline,
            lastSeen: Date.now(),
        });
    }

    // Get all users
    async getAllUsers(): Promise<AppUser[]> {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        return snapshot.docs.map(doc => doc.data() as AppUser);
    }

    // Listen for all users (real-time)
    listenForUsers(onUsersChange: (users: AppUser[]) => void, maxUsers: number = 50): Unsubscribe {
        if (this.usersUnsubscribe) {
            this.usersUnsubscribe();
        }

        const usersRef = collection(db, 'users');
        // Don't use orderBy to include users without lastSeen field
        const q = query(usersRef, limit(maxUsers));

        this.usersUnsubscribe = onSnapshot(q, (snapshot) => {
            const users = snapshot.docs.map(doc => {
                const data = doc.data();
                // Ensure all fields have default values for old users
                return {
                    uid: data.uid || doc.id,
                    displayName: data.displayName || 'Unknown',
                    email: data.email || '',
                    photoURL: data.photoURL || '',
                    lastSeen: data.lastSeen || 0,
                    isOnline: data.isOnline ?? false,
                    createdAt: data.createdAt || 0,
                } as AppUser;
            });
            // Sort by online status first, then by lastSeen
            users.sort((a, b) => {
                if (a.isOnline && !b.isOnline) return -1;
                if (!a.isOnline && b.isOnline) return 1;
                return (b.lastSeen || 0) - (a.lastSeen || 0);
            });
            onUsersChange(users);
        });

        return this.usersUnsubscribe;
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
}

export const userService = new UserService();
export default userService;
