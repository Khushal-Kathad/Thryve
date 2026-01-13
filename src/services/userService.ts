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
        const q = query(usersRef, orderBy('lastSeen', 'desc'), limit(maxUsers));

        this.usersUnsubscribe = onSnapshot(q, (snapshot) => {
            const users = snapshot.docs.map(doc => doc.data() as AppUser);
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

    // Create or get DM room between two users
    async getOrCreateDMRoom(
        currentUserId: string,
        otherUserId: string,
        currentUserName: string,
        otherUserName: string
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
                members: [currentUserId, otherUserId],
                memberNames: {
                    [currentUserId]: currentUserName,
                    [otherUserId]: otherUserName,
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
