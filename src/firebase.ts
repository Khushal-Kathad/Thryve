// For Firebase JS SDK v7.20.0 and later, measurementId is optional
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
    initializeFirestore,
    persistentLocalCache,
    persistentSingleTabManager,
    enableNetwork,
    disableNetwork
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

// Initialize Firestore with persistent cache
// Using long polling to avoid WebChannel/QUIC errors on some networks
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager({ forceOwnership: false })
    }),
    experimentalForceLongPolling: true,
    experimentalAutoDetectLongPolling: false,
});

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Helper to reconnect Firestore if connection drops
export const reconnectFirestore = async () => {
    try {
        await disableNetwork(db);
        await enableNetwork(db);
        console.log('Firestore reconnected');
        return true;
    } catch (error) {
        console.error('Failed to reconnect Firestore:', error);
        return false;
    }
};

export { auth, provider, db };
