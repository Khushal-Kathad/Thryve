// For Firebase JS SDK v7.20.0 and later, measurementId is optional
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
    initializeFirestore,
    memoryLocalCache,
    enableNetwork,
    disableNetwork,
    waitForPendingWrites,
    onSnapshotsInSync,
    CACHE_SIZE_UNLIMITED
} from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAgogipg4NAwS2TQ351jjvypYLOdoG5iRM",
    authDomain: "thryve-f7b27.firebaseapp.com",
    projectId: "thryve-f7b27",
    storageBucket: "thryve-f7b27.firebasestorage.app",
    messagingSenderId: "214544054388",
    appId: "1:214544054388:web:5f177b22a2c9c6a199b921",
    measurementId: "G-JLSC4FTZWJ"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with memory cache (more reliable than persistent)
// Using long polling to avoid WebChannel/QUIC errors on some networks
const db = initializeFirestore(app, {
    localCache: memoryLocalCache(),
    experimentalForceLongPolling: true,
});

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Connection state
let isFirestoreConnected = true;

// Listen for connection state changes
onSnapshotsInSync(db, () => {
    if (!isFirestoreConnected) {
        console.log('Firestore connection restored');
        isFirestoreConnected = true;
    }
});

// Helper to reconnect Firestore if connection drops
export const reconnectFirestore = async (): Promise<boolean> => {
    try {
        console.log('Attempting to reconnect Firestore...');
        await disableNetwork(db);
        await new Promise(resolve => setTimeout(resolve, 500));
        await enableNetwork(db);
        console.log('Firestore reconnected successfully');
        isFirestoreConnected = true;
        return true;
    } catch (error) {
        console.error('Failed to reconnect Firestore:', error);
        isFirestoreConnected = false;
        return false;
    }
};

// Check if Firestore is connected
export const isConnected = (): boolean => isFirestoreConnected;

// Wait for pending writes to complete
export const flushWrites = async (): Promise<void> => {
    try {
        await waitForPendingWrites(db);
    } catch (error) {
        console.error('Error flushing writes:', error);
    }
};

export { auth, provider, db };
