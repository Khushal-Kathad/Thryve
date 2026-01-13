# Thryve Chat Application - Complete Project Documentation

## For Fresher Interns: Understanding the Project from Zero to Hero

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack Explanation](#tech-stack-explanation)
3. [Project Structure](#project-structure)
4. [Core Concepts Explained](#core-concepts-explained)
5. [Feature Breakdown](#feature-breakdown)
6. [Data Flow](#data-flow)
7. [How Each Feature Works](#how-each-feature-works)
8. [Firebase Configuration](#firebase-configuration)
9. [State Management with Redux](#state-management-with-redux)
10. [Offline Support System](#offline-support-system)
11. [Security: Channel Password Protection](#security-channel-password-protection)
12. [Secure Image Uploads with Cloudflare Workers](#secure-image-uploads-with-cloudflare-workers)
13. [Audio/Video Calling with Agora](#audiovideo-calling-with-agora)
14. [Direct Messaging & User Management](#direct-messaging--user-management)
15. [Channel Lock/Unlock & Member Management](#channel-lockunlock--member-management)
16. [Sidebar Panels](#sidebar-panels)
17. [Styling Approach](#styling-approach)
18. [Deployment Guide](#deployment-guide)
19. [Running the Project](#running-the-project)
20. [Common Patterns Used](#common-patterns-used)
21. [Data Storage Locations](#data-storage-locations)

---

## Project Overview

**Thryve Chat** is a real-time messaging application similar to Slack or Discord with audio/video calling. Users can:
- Sign in with Google
- Create password-protected channels (optional)
- Lock/unlock channels they created
- Send text messages and images
- React to messages with emojis
- Start audio/video calls (group or 1-to-1)
- Send direct messages to any user
- See who's online in real-time
- Add members to their channels (members bypass password)
- Save/bookmark important messages
- View message threads, mentions, and saved items
- Work offline (messages are queued and sent when back online)
- Delete channels they created

### What Makes This Project Special?

1. **Audio/Video Calling**: Real-time calls using Agora RTC SDK
2. **Direct Messaging**: Private conversations between users
3. **User Presence**: See who's online in real-time
4. **Offline-First Architecture**: Messages work even without internet
5. **Optional Password-Protected Channels**: Choose whether to add password protection
6. **Channel Lock/Unlock**: Toggle password protection on your channels
7. **Member Management**: Add members to private channels (they bypass password)
8. **Secure Image Uploads**: Uses Cloudflare Workers for cryptographic signing
9. **Real-Time Updates**: Messages appear instantly for all users
10. **Modern UI**: Beautiful glassmorphism design with animations
11. **Sidebar Panels**: Threads, Mentions, Saved Items, People, Settings
12. **Save/Bookmark Messages**: Save important messages for later access

---

## Tech Stack Explanation

### Build Tool: Vite + SWC

```
Vite (pronounced "veet") = Fast build tool for modern web apps
SWC = Super-fast JavaScript/TypeScript compiler (faster than Babel)
```

**Why Vite instead of Create React App?**
- 10-100x faster startup
- Instant hot module replacement (HMR)
- Better for modern development
- Code splitting for smaller bundles

**Configuration File**: `vite.config.ts`
```typescript
export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                    'vendor-redux': ['@reduxjs/toolkit', 'react-redux'],
                    'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
                    'vendor-mui': ['@mui/material', '@mui/icons-material'],
                    'vendor-utils': ['date-fns', 'bcryptjs', 'localforage', 'styled-components'],
                },
            },
        },
    },
});
```

### TypeScript

TypeScript = JavaScript with types. It catches errors before running code.

```typescript
// JavaScript (no safety)
function greet(name) {
    return "Hello " + name;
}

// TypeScript (catches errors)
function greet(name: string): string {
    return "Hello " + name;
}
```

### React 18

React is a library for building user interfaces using components.

**Key React Concepts Used**:
- **Components**: Reusable UI pieces (Header, Sidebar, Chat, etc.)
- **Hooks**: Functions that let you use React features
  - `useState` - Store component data
  - `useEffect` - Run code on component mount/update
  - `useRef` - Reference DOM elements
  - `useCallback` - Memoize functions

### Firebase (Backend as a Service)

Firebase provides our backend:
- **Authentication**: Google sign-in
- **Firestore**: Real-time database
- **Offline Persistence**: Cache data locally using IndexedDB

### Redux Toolkit (State Management)

Redux stores app-wide data that many components need:
- Which room/channel is selected
- Is user online/offline?
- Which rooms has user unlocked?

---

## Project Structure

```
Chat_Application/
├── index.html              # Entry HTML file for Vite
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
├── package.json            # Dependencies and scripts
├── .env                    # Environment variables (Worker URLs, Agora App ID)
├── .env.production         # Production environment
│
├── src/
│   ├── main.tsx            # App entry point
│   ├── App.tsx             # Main app component
│   ├── App.css             # Global styles
│   ├── index.css           # CSS variables and themes
│   │
│   ├── firebase.ts         # Firebase configuration
│   ├── cloudinary.ts       # Secure image upload with signing
│   │
│   ├── types/
│   │   └── index.ts        # TypeScript type definitions (User, Room, Message, Call)
│   │
│   ├── app/
│   │   └── store.ts        # Redux store configuration
│   │
│   ├── features/
│   │   ├── appSlice.ts     # App state and actions (rooms, online status)
│   │   └── callSlice.ts    # Call state and actions (current call, incoming call)
│   │
│   ├── services/
│   │   ├── offlineService.ts  # Offline message queue
│   │   ├── syncService.ts     # Sync messages when online
│   │   ├── agoraService.ts    # Agora RTC SDK wrapper
│   │   ├── callService.ts     # Firebase call signaling
│   │   └── userService.ts     # User management & online status
│   │
│   ├── hooks/
│   │   ├── useNetworkStatus.ts  # Detect online/offline
│   │   └── useClickOutside.ts   # Detect clicks outside element
│   │
│   ├── utils/
│   │   └── passwordUtils.ts   # Password hashing utilities
│   │
│   ├── context/
│   │   └── ToastContext.tsx   # Toast notification system
│   │
│   └── components/
│       ├── Header.tsx         # Top navigation bar + offline banner
│       ├── Sidebar.tsx        # Left sidebar + channels + users + DM
│       ├── SidebarOption.tsx  # Individual sidebar item + lock toggle
│       ├── Chat.tsx           # Main chat area + call buttons
│       ├── ChatInput.tsx      # Message input box + image upload
│       ├── Message.tsx        # Individual message + reactions + bookmark
│       ├── Login.tsx          # Login page
│       ├── VideoCall.tsx      # Video/audio call UI
│       ├── CallControls.tsx   # Mute, video toggle, end call
│       ├── MembersList.tsx    # Channel members + add members
│       │
│       ├── panels/            # Sidebar panel views
│       │   ├── index.ts           # Panel exports
│       │   ├── ThreadsPanel.tsx   # Message threads view
│       │   ├── MentionsPanel.tsx  # @mentions view
│       │   ├── SavedPanel.tsx     # Bookmarked messages view
│       │   ├── PeoplePanel.tsx    # All users view with online status
│       │   └── SettingsPanel.tsx  # App settings (theme, notifications)
│       │
│       └── ui/
│           ├── Toast.tsx              # Toast notification
│           ├── ConfirmDialog.tsx      # Confirmation modal
│           ├── CreateChannelModal.tsx # Create channel modal
│           ├── ChannelPasswordModal.tsx # Enter password modal
│           ├── NewMessageModal.tsx    # Quick DM/channel selector
│           ├── IncomingCallModal.tsx  # Accept/reject incoming call
│           └── ActiveCallBanner.tsx   # Join active channel call
│
├── worker/                    # Cloudflare Worker (image signing)
│   ├── src/
│   │   └── index.ts          # Worker code
│   ├── wrangler.toml         # Worker configuration
│   ├── package.json          # Worker dependencies
│   └── .gitignore
│
├── agora-worker/              # Cloudflare Worker (Agora token generation)
│   ├── src/
│   │   └── index.js          # Token generation code
│   ├── wrangler.toml         # Worker configuration
│   └── package.json
│
├── functions/                 # Firebase Functions (alternative, requires Blaze plan)
│   ├── src/
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
└── build/                     # Production build output
```

---

## Core Concepts Explained

### 1. Entry Point Flow

```
index.html → main.tsx → App.tsx → Components
```

**index.html**
```html
<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
```

**main.tsx**
```typescript
createRoot(document.getElementById('root')!).render(
    <Provider store={store}>
        <RouterProvider router={router} />
    </Provider>
);
```

### 2. Component Hierarchy

```
App
├── ToastProvider              (Toast notification context)
│   └── AppContent
│       ├── Login              (If not authenticated)
│       │
│       └── (If authenticated):
│           ├── Header         (Top navigation)
│           │   ├── User menu
│           │   ├── Search bar
│           │   └── Offline banner (when offline)
│           │
│           ├── IncomingCallModal  (When receiving a call)
│           ├── NewMessageModal    (Quick DM/channel selector)
│           ├── VideoCall          (When in active call)
│           │
│           └── AppBody
│               ├── Sidebar    (Left panel)
│               │   ├── Menu options (Threads, Mentions, Saved, People)
│               │   ├── Channel list
│               │   │   └── SidebarOption (for each channel)
│               │   ├── Users list (with online status)
│               │   └── Add channel button
│               │
│               └── MainContent (switches based on activePanel)
│                   ├── Chat       (default - main chat area)
│                   │   ├── Chat header + call buttons
│                   │   ├── Messages list
│                   │   │   └── Message (with bookmark button)
│                   │   ├── MembersList (right panel)
│                   │   └── ChatInput
│                   │
│                   ├── ThreadsPanel   (when activePanel = 'threads')
│                   ├── MentionsPanel  (when activePanel = 'mentions')
│                   ├── SavedPanel     (when activePanel = 'saved')
│                   ├── PeoplePanel    (when activePanel = 'people')
│                   └── SettingsPanel  (when activePanel = 'settings')
```

---

## Feature Breakdown

### Feature 1: Google Authentication

**How it works:**

```
User clicks "Continue with Google"
    → Firebase shows Google popup
    → User selects Google account
    → Firebase returns user object
    → App stores user in state
    → UI updates to show main app
```

**Key Files:**
- `src/firebase.ts` - Firebase configuration
- `src/components/Login.tsx` - Login UI

**Error Handling:**
```typescript
const getErrorMessage = (errorCode: string): string => {
    const errorMessages: Record<string, string> = {
        'auth/popup-closed-by-user': 'Sign-in was cancelled.',
        'auth/network-request-failed': 'Network error. Check your connection.',
        'auth/popup-blocked': 'Popup was blocked. Please allow popups.',
    };
    return errorMessages[errorCode] || 'Sign-in failed. Please try again.';
};
```

---

### Feature 2: Channel Password Protection (Optional)

**Why Optional?** Users can choose whether to protect their channel with a password.

**How it works:**

```
Creating Channel:
    → User enters channel name
    → Toggle "Enable password protection" ON/OFF
    → If ON: Enter password
    → Password is hashed with bcrypt
    → Channel created in Firestore

Entering Channel:
    → Check if channel has passwordHash
    → If no password: Enter directly
    → If has password:
        → Check if in "verifiedRooms" (already unlocked)
        → If yes: Enter directly
        → If no: Show password modal
```

**Password Hashing (passwordUtils.ts):**
```typescript
import bcrypt from 'bcryptjs';

// When creating a channel - hash the password
export const hashPassword = async (password: string): Promise<string> => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

// When entering a channel - verify password
export const verifyPassword = async (
    password: string,
    hash: string
): Promise<boolean> => {
    return bcrypt.compare(password, hash);
};
```

**Firestore Database Structure:**
```
rooms/
├── abc123/
│   ├── name: "general"
│   ├── passwordHash: "$2a$10$Xy..." (null if no password)
│   ├── createdAt: Timestamp
│   ├── createdBy: "user-id"
│   └── messages/
│       └── ...
```

---

### Feature 3: Real-Time Messaging

**How messages appear instantly:**

Firebase Firestore has real-time listeners. When data changes, all connected clients receive updates immediately.

**Listening for Messages (Chat.tsx):**
```typescript
const [roomMessages, loading] = useCollection(
    roomId !== 'null'
        ? query(
            collection(db, 'rooms', roomId, 'messages'),
            orderBy('timestamp', 'asc')
          )
        : null
);
```

**Sending Messages (ChatInput.tsx):**
```typescript
await setDoc(messageDoc, {
    message: messageData.message,
    timestamp: Timestamp.fromDate(new Date()),
    users: user.displayName,
    userImage: user.photoURL,
    ...(imageUrl && { imageUrl }),
});
```

---

### Feature 4: Delete Channel

**Only the channel creator can delete a channel.**

**How it works:**
```typescript
// Check if current user is the creator
const isChannelCreator = user && roomDetails?.data()?.createdBy === user.uid;

// Delete function
const handleDeleteChannel = async () => {
    // 1. Delete all messages first
    const messagesSnapshot = await getDocs(messagesRef);
    await Promise.all(messagesSnapshot.docs.map(doc => deleteDoc(doc.ref)));

    // 2. Delete the channel document
    await deleteDoc(doc(db, 'rooms', roomId));

    // 3. Navigate away
    dispatch(enterRoom({ roomId: 'null' }));
};
```

---

## Secure Image Uploads with Cloudflare Workers

### The Problem: Unsigned Uploads

Originally, we used **unsigned uploads** to Cloudinary:

```typescript
// INSECURE - Anyone can upload to your account!
formData.append('upload_preset', 'upload_chats');
```

**Why is this bad?**
- Anyone who knows your cloud name can upload files
- They can fill up your storage (25GB free tier)
- You pay for their bandwidth
- No control over who uploads

### The Solution: Signed Uploads

**Signed uploads** require a cryptographic signature that only you can generate (because only you have the API Secret).

```
Flow:
1. User wants to upload image
2. Frontend calls YOUR server for a signature
3. Server generates signature using API Secret
4. Frontend uploads to Cloudinary WITH the signature
5. Cloudinary verifies signature → allows upload
```

### Why Cloudflare Workers?

| Option | Cost | Setup | Best For |
|--------|------|-------|----------|
| Firebase Functions | Requires Blaze plan ($) | Medium | Already on Blaze |
| Cloudflare Workers | FREE (100K req/day) | Easy | Our choice |
| Vercel Functions | Free tier available | Easy | Vercel users |

### How the Worker Works

**worker/src/index.ts:**
```typescript
export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        // 1. Handle CORS
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // 2. Generate timestamp and folder
        const timestamp = Math.floor(Date.now() / 1000);
        const folder = 'chat_images';

        // 3. Create parameters to sign
        const params = { timestamp, folder };

        // 4. Generate SHA-1 signature
        const stringToSign = `folder=${folder}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`;
        const signature = await sha1(stringToSign);

        // 5. Return signature to frontend
        return new Response(JSON.stringify({
            signature,
            timestamp,
            folder,
            cloudName: env.CLOUDINARY_CLOUD_NAME,
            apiKey: env.CLOUDINARY_API_KEY,
        }));
    },
};
```

**How signature is generated:**
```
Parameters: folder=chat_images, timestamp=1704067200
String to sign: "folder=chat_images&timestamp=1704067200YOUR_API_SECRET"
SHA-1 hash: "a1b2c3d4e5f6..."
```

### Frontend Uses the Signature

**src/cloudinary.ts:**
```typescript
// 1. Get signature from Cloudflare Worker
const getUploadSignature = async () => {
    const response = await fetch(WORKER_URL, { method: 'POST' });
    return response.json();
};

// 2. Upload with signature
export const uploadToCloudinary = async (file: File) => {
    const { signature, timestamp, folder, cloudName, apiKey } = await getUploadSignature();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);           // Public API key
    formData.append('timestamp', timestamp);       // When signature was created
    formData.append('signature', signature);       // The cryptographic signature
    formData.append('folder', folder);            // Where to store

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: formData }
    );

    return response.json();
};
```

### Environment Variables

**.env (for development):**
```
VITE_CLOUDINARY_WORKER_URL=https://cloudinary-signer.thryve.workers.dev
```

**.env.production (for production):**
```
VITE_CLOUDINARY_WORKER_URL=https://cloudinary-signer.thryve.workers.dev
```

**worker/wrangler.toml:**
```toml
name = "cloudinary-signer"
main = "src/index.ts"

[vars]
CLOUDINARY_CLOUD_NAME = "ddp68ttm2"
CLOUDINARY_API_KEY = "942876486665982"

# Secret added via: npx wrangler secret put CLOUDINARY_API_SECRET
```

---

## Offline Support System

### The Big Picture

When user is offline:
1. Messages are saved to IndexedDB (browser storage)
2. User sees "pending" indicator on messages
3. When back online, messages sync automatically
4. Messages keep their original timestamp (correct order)

### Key Files

- `src/services/offlineService.ts` - Queue management
- `src/services/syncService.ts` - Sync when online
- `src/hooks/useNetworkStatus.ts` - Detect online/offline

### Offline Message Structure

```typescript
interface PendingMessage {
    id: string;                    // Unique ID
    roomId: string;                // Which channel
    message: string;               // Text content
    clientTimestamp: number;       // When user sent it
    users: string;                 // User's display name
    userImage: string;             // User's profile picture
    imageData?: {                  // Image as base64
        base64: string;
        mimeType: string;
        fileName: string;
    };
    uploadedImageUrl?: string;     // Cached URL (prevents re-upload)
    status: 'pending' | 'uploading' | 'failed';
    retryCount: number;
    createdAt: number;
}
```

### Sync Service Logic

```typescript
async syncPendingMessages() {
    const pending = await offlineService.getPendingMessages();

    // Sort by timestamp to maintain order
    const sorted = [...pending].sort((a, b) => a.clientTimestamp - b.clientTimestamp);

    for (const message of sorted) {
        try {
            // Check if image already uploaded (prevents duplicates)
            let imageUrl = message.uploadedImageUrl || null;

            if (message.imageData && !imageUrl) {
                // Upload image
                const result = await uploadToCloudinary(file);
                imageUrl = result.url;

                // Cache URL for retry
                await offlineService.updateUploadedImageUrl(message.id, imageUrl);
            }

            // Save to Firestore with CLIENT timestamp
            await setDoc(messageDoc, {
                message: message.message,
                timestamp: Timestamp.fromMillis(message.clientTimestamp),
                // ...
            });

            // Remove from queue
            await offlineService.removePendingMessage(message.id);

        } catch (error) {
            // Retry up to 3 times
            if (message.retryCount >= 3) {
                await offlineService.updateMessageStatus(message.id, 'failed');
            }
        }
    }
}
```

---

## Audio/Video Calling with Agora

### Overview

Thryve Chat uses **Agora RTC SDK** for real-time audio and video calling. Agora provides:
- 10,000 free minutes per month
- Low latency (<400ms)
- Works globally
- Supports both 1-to-1 and group calls

### Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   User A        │────▶│   Agora Cloud        │◀────│   User B        │
│   (Caller)      │     │   (RTC Server)       │     │   (Receiver)    │
└────────┬────────┘     └──────────────────────┘     └────────┬────────┘
         │                                                     │
         │              ┌──────────────────────┐               │
         └─────────────▶│      Firebase        │◀──────────────┘
                        │    (Signaling)       │
                        └──────────────────────┘
```

**How it works:**
1. User A starts call → Creates call document in Firebase
2. User B receives notification → Firebase real-time listener
3. User B accepts → Both join same Agora channel
4. Audio/Video streams via Agora servers
5. Call ends → Firebase document updated

### Key Files

| File | Purpose |
|------|---------|
| `src/services/agoraService.ts` | Agora SDK wrapper - join/leave, publish tracks |
| `src/services/callService.ts` | Firebase call signaling - create/accept/end calls |
| `src/features/callSlice.ts` | Redux call state |
| `src/components/VideoCall.tsx` | Main call UI with video feeds |
| `src/components/CallControls.tsx` | Mute, video toggle, end call buttons |
| `src/components/ui/IncomingCallModal.tsx` | Accept/reject incoming call |
| `src/components/ui/ActiveCallBanner.tsx` | Join ongoing channel call |
| `agora-worker/src/index.js` | Cloudflare Worker for token generation |

### Call Types

**1. Group Calls (Channel Calls)**
- Click audio/video icon in channel header
- All channel members can join
- Active call banner shows in channel

**2. 1-to-1 Calls (Direct Calls)**
- Open Members panel → Click call icon next to user
- Only caller and receiver are in the call

### Agora Service (agoraService.ts)

```typescript
class AgoraService {
    private client: IAgoraRTCClient | null = null;
    private localAudioTrack: IMicrophoneAudioTrack | null = null;
    private localVideoTrack: ICameraVideoTrack | null = null;

    // Initialize client with event handlers
    async initialize(handlers: AgoraEventHandlers): Promise<void> {
        this.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

        this.client.on('user-joined', handlers.onUserJoined);
        this.client.on('user-left', handlers.onUserLeft);
        this.client.on('user-published', async (user, mediaType) => {
            await this.client?.subscribe(user, mediaType);
            handlers.onUserPublished?.(user, mediaType);
        });
    }

    // Join a channel with token
    async joinChannel(channelName: string, uid: string): Promise<void> {
        // Fetch token from Cloudflare Worker
        const response = await fetch(`${TOKEN_WORKER_URL}?channel=${channelName}&uid=${uid}`);
        const { token } = await response.json();

        await this.client.join(APP_ID, channelName, token, uid);
    }

    // Create and publish local tracks
    async createLocalTracks(enableVideo: boolean = true): Promise<void> {
        this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        if (enableVideo) {
            this.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
        }
    }

    // Toggle mute/video
    async toggleAudio(enabled: boolean): Promise<void> {
        await this.localAudioTrack?.setEnabled(enabled);
    }

    async toggleVideo(enabled: boolean): Promise<void> {
        await this.localVideoTrack?.setEnabled(enabled);
    }

    // Leave and cleanup
    async leaveChannel(): Promise<void> {
        this.localAudioTrack?.stop();
        this.localAudioTrack?.close();
        this.localVideoTrack?.stop();
        this.localVideoTrack?.close();
        await this.client?.leave();
    }
}
```

### Call Service (callService.ts)

```typescript
class CallService {
    // Create a new call
    async createCall(
        callerId: string,
        callerName: string,
        receiverId: string,
        receiverName: string,
        roomId: string,
        callType: 'audio' | 'video',
        isGroupCall: boolean
    ): Promise<Call> {
        const callRef = doc(collection(db, 'calls'));
        const callData: Call = {
            id: callRef.id,
            channelName: `call_${callRef.id}`,
            callerId, callerName,
            receiverId, receiverName,
            roomId, callType, isGroupCall,
            status: 'ringing',
            participants: [{ odUserId: callerId, odUserName: callerName, joinedAt: Date.now() }],
            createdAt: Date.now(),
        };
        await setDoc(callRef, callData);
        return callData;
    }

    // Listen for incoming calls
    listenForIncomingCalls(userId: string, callback: (call: Call) => void) {
        const q = query(
            collection(db, 'calls'),
            where('receiverId', '==', userId),
            where('status', '==', 'ringing')
        );
        return onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    callback(change.doc.data() as Call);
                }
            });
        });
    }

    // Accept/Reject/End call
    async acceptCall(callId: string): Promise<void> {
        await updateDoc(doc(db, 'calls', callId), {
            status: 'active',
            answeredAt: Date.now(),
        });
    }

    async rejectCall(callId: string): Promise<void> {
        await updateDoc(doc(db, 'calls', callId), { status: 'rejected' });
    }

    async endCall(callId: string): Promise<void> {
        await updateDoc(doc(db, 'calls', callId), {
            status: 'ended',
            endedAt: Date.now(),
        });
    }
}
```

### Agora Token Worker (agora-worker/src/index.js)

```javascript
// Cloudflare Worker for generating Agora RTC tokens
export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const channel = url.searchParams.get('channel');
        const uid = url.searchParams.get('uid') || '0';

        // Generate token using Agora algorithm
        const token = await generateToken(
            env.AGORA_APP_ID,
            env.AGORA_APP_CERTIFICATE,
            channel,
            uid,
            86400 // 24 hour expiry
        );

        return new Response(JSON.stringify({ token }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
```

---

## Direct Messaging & User Management

### Overview

Users can:
- See all logged-in users in the sidebar
- See who's online/offline in real-time
- Click on any user to start a private conversation
- DM rooms are automatically created

### User Service (userService.ts)

```typescript
interface AppUser {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string;
    lastSeen: number;
    isOnline: boolean;
    createdAt: number;
}

class UserService {
    // Save user when they log in
    async saveUser(user: { uid, displayName, email, photoURL }): Promise<void> {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
            ...user,
            lastSeen: Date.now(),
            isOnline: true,
        }, { merge: true });
    }

    // Update online status
    async setUserOnline(uid: string, isOnline: boolean): Promise<void> {
        await updateDoc(doc(db, 'users', uid), {
            isOnline,
            lastSeen: Date.now(),
        });
    }

    // Listen for all users (real-time)
    listenForUsers(onUsersChange: (users: AppUser[]) => void): Unsubscribe {
        const q = query(collection(db, 'users'), orderBy('lastSeen', 'desc'));
        return onSnapshot(q, (snapshot) => {
            const users = snapshot.docs.map(doc => doc.data() as AppUser);
            onUsersChange(users);
        });
    }

    // Create or get DM room between two users
    async getOrCreateDMRoom(
        currentUserId: string,
        otherUserId: string,
        currentUserName: string,
        otherUserName: string
    ): Promise<string> {
        // DM room ID is sorted combination of user IDs (consistent)
        const sortedIds = [currentUserId, otherUserId].sort();
        const dmRoomId = `dm_${sortedIds[0]}_${sortedIds[1]}`;

        const roomRef = doc(db, 'rooms', dmRoomId);
        const roomDoc = await getDoc(roomRef);

        if (!roomDoc.exists()) {
            await setDoc(roomRef, {
                name: `${currentUserName} & ${otherUserName}`,
                isDM: true,
                members: [currentUserId, otherUserId],
                memberNames: {
                    [currentUserId]: currentUserName,
                    [otherUserId]: otherUserName,
                },
                createdAt: Date.now(),
                passwordHash: null,
                isPrivate: true,
            });
        }

        return dmRoomId;
    }
}
```

### How Users List Works (Sidebar.tsx)

```typescript
// State for all users
const [allUsers, setAllUsers] = useState<AppUser[]>([]);

// Listen for users on mount
useEffect(() => {
    const unsubscribe = userService.listenForUsers((users) => {
        setAllUsers(users);
    });
    return () => unsubscribe();
}, []);

// Filter other users
const otherUsers = allUsers.filter(u => u.uid !== user?.uid);

// Handle starting DM
const handleStartDM = async (otherUser: AppUser) => {
    const dmRoomId = await userService.getOrCreateDMRoom(
        user.uid,
        otherUser.uid,
        user.displayName,
        otherUser.displayName
    );
    dispatch(enterRoom({ roomId: dmRoomId }));
};

// Render users list
{otherUsers.map((otherUser) => (
    <OnlineUser key={otherUser.uid} onClick={() => handleStartDM(otherUser)}>
        <UserAvatar src={otherUser.photoURL} />
        <OnlineIndicator $isOnline={otherUser.isOnline} />
        <span>{otherUser.displayName}</span>
        {otherUser.isOnline && <OnlineText>online</OnlineText>}
    </OnlineUser>
))}
```

---

## Channel Lock/Unlock & Member Management

### Channel Lock/Unlock

Channel creators can toggle password protection on their channels.

**How it works (SidebarOption.tsx):**

```typescript
const isCreator = createdBy === currentUserId;

const toggleChannelLock = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent channel selection

    const roomRef = doc(db, 'rooms', id);

    if (hasPassword) {
        // Remove password protection
        await updateDoc(roomRef, { passwordHash: null });
        showToast(`Channel is now public`, 'success');
    } else {
        // Add password protection
        const password = window.prompt('Enter a password:');
        if (password) {
            const hash = await hashPassword(password);
            await updateDoc(roomRef, { passwordHash: hash });
            showToast(`Channel is now protected`, 'success');
        }
    }
};

// Show lock toggle for creator
{isCreator ? (
    <LockToggleButton onClick={toggleChannelLock}>
        {hasPassword ? <LockIcon /> : <LockOpenIcon />}
    </LockToggleButton>
) : (
    hasPassword && <LockIndicator><LockIcon /></LockIndicator>
)}
```

### Member Management

Channel creators can add members to their channels. **Added members can access the channel without entering the password.**

**Key Features:**
- Only channel creators can add members
- Members are added to a **specific channel only** (not globally)
- Added members bypass password for that channel
- No remove functionality (simplifies UX)

**How it works (MembersList.tsx):**

```typescript
// Add member to THIS specific channel only
const handleAddMember = async (userId: string, userName: string) => {
    // Validate roomId to ensure we're updating the correct channel
    if (!roomId || roomId === 'null' || isUpdating) {
        console.error('Invalid roomId:', roomId);
        return;
    }

    const roomRef = doc(db, 'rooms', roomId);
    console.log(`Adding member ${userName} (${userId}) to channel ${roomId}`);

    await updateDoc(roomRef, {
        members: arrayUnion(userId),
        [`memberNames.${userId}`]: userName,
    });
    showToast(`Added ${userName} to #${channelName}. They can now access without password.`, 'success');
};

// UI for adding members (only visible to creator)
{isCreator && (
    <AddMemberButton onClick={() => setShowAddMember(true)}>
        <PersonAddIcon />
    </AddMemberButton>
)}

{showAddMember && (
    <AddMemberPanel>
        <AddMemberTitle>Add Members to #{channelName}</AddMemberTitle>
        <AddMemberSubtitle>Members can access this channel without password</AddMemberSubtitle>
        {nonMembers.map(user => (
            <AddMemberItem onClick={() => handleAddMember(user.uid, user.displayName)}>
                <Avatar src={user.photoURL} />
                <span>{user.displayName}</span>
                <PersonAddIcon />
            </AddMemberItem>
        ))}
    </AddMemberPanel>
)}
```

**Password Bypass Logic (SidebarOption.tsx):**

```typescript
const selectChannel = () => {
    if (id) {
        // Check if user is the creator or a member added by creator
        const isMember = currentUserId && members.includes(currentUserId);
        const canBypassPassword = isCreator || isMember || verifiedRooms.includes(id);

        // If no password, user is creator/member, or already verified - enter directly
        if (!hasPassword || canBypassPassword) {
            if (!verifiedRooms.includes(id)) {
                dispatch(addVerifiedRoom({ roomId: id }));
            }
            dispatch(enterRoom({ roomId: id }));
        } else {
            // Password protected and not verified/member - show password modal
            dispatch(setPendingRoom({ roomId: id, roomName: title }));
        }
    }
};
```

---

## Sidebar Panels

### Overview

The sidebar has menu options that open different panels in the main content area. This provides quick access to important information without navigating away from the chat.

### Available Panels

| Panel | Purpose | Key File |
|-------|---------|----------|
| **Threads** | View message threads you're participating in | `ThreadsPanel.tsx` |
| **Mentions** | See all messages where you were @mentioned | `MentionsPanel.tsx` |
| **Saved Items** | Access your bookmarked/saved messages | `SavedPanel.tsx` |
| **People** | View all users with online status, start DMs or calls | `PeoplePanel.tsx` |
| **Settings** | Toggle theme, notifications, sound effects, compact mode | `SettingsPanel.tsx` |

### State Management

```typescript
// appSlice.ts - Panel state
interface AppState {
    roomId: string;
    verifiedRooms: string[];
    activePanel: 'none' | 'threads' | 'mentions' | 'saved' | 'people' | 'settings';
    showNewMessageModal: boolean;
    savedMessages: SavedMessage[];
    settings: AppSettings;
}

interface SavedMessage {
    messageId: string;
    roomId: string;
    savedAt: number;
}

interface AppSettings {
    theme: 'dark' | 'light';
    notifications: boolean;
    soundEnabled: boolean;
    compactMode: boolean;
}
```

### Panel Implementation Pattern

Each panel follows a similar pattern:

```typescript
// Example: SavedPanel.tsx
const SavedPanel = () => {
    const dispatch = useDispatch();
    const savedMessages = useSelector(selectSavedMessages);
    const [messages, setMessages] = useState<MessageData[]>([]);

    // Fetch message data from Firestore
    useEffect(() => {
        const fetchMessages = async () => {
            const fetchedMessages = await Promise.all(
                savedMessages.map(async (saved) => {
                    const msgDoc = await getDoc(
                        doc(db, 'rooms', saved.roomId, 'messages', saved.messageId)
                    );
                    return { ...msgDoc.data(), savedAt: saved.savedAt };
                })
            );
            setMessages(fetchedMessages);
        };
        fetchMessages();
    }, [savedMessages]);

    // Navigate to message
    const handleGoToMessage = (roomId: string) => {
        dispatch(enterRoom({ roomId }));
        dispatch(setActivePanel('none'));
    };

    // Remove from saved
    const handleRemove = (messageId: string, roomId: string) => {
        dispatch(toggleSaveMessage({ messageId, roomId }));
    };

    return (
        <Container>
            <Header>
                <Title>Saved Items</Title>
                <CloseButton onClick={() => dispatch(setActivePanel('none'))}>
                    <CloseIcon />
                </CloseButton>
            </Header>
            <MessagesList>
                {messages.map(msg => (
                    <SavedItem key={msg.id}>
                        {/* Message content */}
                    </SavedItem>
                ))}
            </MessagesList>
        </Container>
    );
};
```

### Sidebar Menu Integration

```typescript
// Sidebar.tsx - Menu options with click handlers
const handleMenuClick = (panel: 'threads' | 'mentions' | 'saved' | 'people' | 'settings') => {
    dispatch(setActivePanel(panel));
};

// Menu options
<SidebarOption
    Icon={QuestionAnswerIcon}
    title="Threads"
    onClick={() => handleMenuClick('threads')}
/>
<SidebarOption
    Icon={AlternateEmailIcon}
    title="Mentions"
    onClick={() => handleMenuClick('mentions')}
/>
<SidebarOption
    Icon={BookmarkIcon}
    title="Saved Items"
    onClick={() => handleMenuClick('saved')}
/>
<SidebarOption
    Icon={PeopleIcon}
    title="People"
    onClick={() => handleMenuClick('people')}
/>
<SidebarOption
    Icon={SettingsIcon}
    title="Settings"
    onClick={() => handleMenuClick('settings')}
/>
```

### App.tsx Panel Rendering

```typescript
// App.tsx - Render panel based on activePanel state
const activePanel = useSelector(selectActivePanel);

const renderMainContent = () => {
    switch (activePanel) {
        case 'threads':
            return <ThreadsPanel />;
        case 'mentions':
            return <MentionsPanel />;
        case 'saved':
            return <SavedPanel />;
        case 'people':
            return <PeoplePanel />;
        case 'settings':
            return <SettingsPanel />;
        default:
            return <Chat />; // Default chat view
    }
};

// In render
<AppBody>
    <Sidebar />
    {renderMainContent()}
</AppBody>
```

### Save/Bookmark Messages

Messages can be bookmarked for later access:

```typescript
// Message.tsx - Bookmark button
const isBookmarked = useSelector((state) => selectIsMessageSaved(state, messageId, roomId));

const handleBookmark = () => {
    dispatch(toggleSaveMessage({ messageId, roomId }));
    showToast(isBookmarked ? 'Removed from saved' : 'Message saved', 'success');
};

// In render
<BookmarkButton onClick={handleBookmark} $isActive={isBookmarked}>
    {isBookmarked ? <BookmarkIcon /> : <BookmarkBorderIcon />}
</BookmarkButton>
```

### New Message Modal

Quick access to start DMs or join channels:

```typescript
// NewMessageModal.tsx
const NewMessageModal = ({ onClose }) => {
    const [allUsers, setAllUsers] = useState<AppUser[]>([]);
    const [channels, setChannels] = useState<Channel[]>([]);

    // Start DM with user
    const handleStartDM = async (user: AppUser) => {
        const dmRoomId = await userService.getOrCreateDMRoom(
            currentUser.uid, user.uid,
            currentUser.displayName, user.displayName
        );
        dispatch(enterRoom({ roomId: dmRoomId }));
        onClose();
    };

    // Join channel
    const handleJoinChannel = (channelId: string) => {
        dispatch(enterRoom({ roomId: channelId }));
        onClose();
    };

    return (
        <ModalOverlay>
            <ModalContent>
                <Header>New Message</Header>
                <Section title="Direct Messages">
                    {users.map(user => <UserItem onClick={() => handleStartDM(user)} />)}
                </Section>
                <Section title="Channels">
                    {channels.map(ch => <ChannelItem onClick={() => handleJoinChannel(ch.id)} />)}
                </Section>
            </ModalContent>
        </ModalOverlay>
    );
};
```

---

## Data Storage Locations

| Data | Where Stored | How to Access |
|------|--------------|---------------|
| **User Accounts** | Firebase Authentication | Firebase Console → Authentication |
| **Users (profiles)** | Firebase Firestore | Firestore → `users` collection |
| **Channels** | Firebase Firestore | Firestore → `rooms` collection |
| **Messages** | Firebase Firestore | Firestore → `rooms/{id}/messages` |
| **Calls** | Firebase Firestore | Firestore → `calls` collection |
| **Message Images** | Cloudinary | Cloudinary Console → Media Library |
| **Image URLs** | Firebase Firestore | Stored as `imageUrl` in message docs |
| **Offline Queue** | Browser IndexedDB | DevTools → Application → IndexedDB → ThryveChat |
| **Verified Rooms** | Redux Store (memory) | Lost on page refresh (by design) |
| **Call State** | Redux Store (memory) | Current call, incoming call state |
| **Saved Messages** | Redux Store (memory) | Bookmarked message references |
| **App Settings** | Redux Store (memory) | Theme, notifications, sound, compact mode |
| **Active Panel** | Redux Store (memory) | Currently open sidebar panel |

### Firebase Firestore Structure

```
rooms/
├── channelId1/
│   ├── name: "general"
│   ├── passwordHash: "$2a$10$..." or null
│   ├── createdAt: Timestamp
│   ├── createdBy: "userId"
│   ├── isPrivate: boolean (optional)
│   ├── isDM: boolean (optional, for direct messages)
│   ├── members: ["userId1", "userId2"] (optional)
│   ├── memberNames: { "userId1": "John" } (optional)
│   └── messages/
│       ├── msgId1/
│       │   ├── message: "Hello!"
│       │   ├── timestamp: Timestamp
│       │   ├── users: "John Doe"
│       │   ├── userImage: "https://..."
│       │   ├── imageUrl: "https://res.cloudinary.com/..." (optional)
│       │   └── reactions: { "👍": ["user1"] } (optional)
│       └── msgId2/
│           └── ...
└── dm_userId1_userId2/  # Direct Message rooms
    ├── name: "John & Jane"
    ├── isDM: true
    ├── members: ["userId1", "userId2"]
    └── messages/
        └── ...

users/
├── userId1/
│   ├── uid: "userId1"
│   ├── displayName: "John Doe"
│   ├── email: "john@example.com"
│   ├── photoURL: "https://..."
│   ├── isOnline: true
│   ├── lastSeen: 1704067200000
│   └── createdAt: 1704067200000
└── userId2/
    └── ...

calls/
├── callId1/
│   ├── id: "callId1"
│   ├── channelName: "call_callId1"
│   ├── callerId: "userId1"
│   ├── callerName: "John Doe"
│   ├── callerPhoto: "https://..."
│   ├── receiverId: "userId2" (or "channel" for group calls)
│   ├── receiverName: "Jane"
│   ├── roomId: "channelId1"
│   ├── callType: "video"
│   ├── isGroupCall: false
│   ├── status: "active" (ringing|active|ended|rejected|missed)
│   ├── participants: [{ odUserId, odUserName, photo, joinedAt }]
│   ├── createdAt: 1704067200000
│   ├── answeredAt: 1704067210000
│   └── endedAt: null
└── callId2/
    └── ...
```

---

## Deployment Guide

### 1. Deploy Cloudflare Worker (Required First)

```bash
cd worker

# Login to Cloudflare
npx wrangler login

# Add your Cloudinary API Secret
npx wrangler secret put CLOUDINARY_API_SECRET
# Enter: kB8Ua2wMRr7nru0bggMN3flu2Dc

# Deploy
npm run deploy
```

**Output:**
```
Deployed cloudinary-signer
  https://cloudinary-signer.thryve.workers.dev
```

### 2. Deploy App to Cloudflare Pages

```bash
cd ..  # Back to project root

# Create production env file
echo VITE_CLOUDINARY_WORKER_URL=https://cloudinary-signer.thryve.workers.dev > .env.production

# Build the app
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy build --project-name=thryve-chat
```

**Output:**
```
Deploying to thryve-chat...
  https://thryve-chat.pages.dev
```

### 3. After Deployment

1. Go to Cloudinary Console
2. Settings → Upload → Upload presets
3. Delete or disable the unsigned `upload_chats` preset
4. Now only signed uploads will work!

---

## Running the Project Locally

### Prerequisites
- Node.js 18+ installed
- npm

### Commands

```bash
# Install dependencies
npm install
cd worker && npm install && cd ..

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run typecheck
```

### Environment Setup

1. Create `.env` in project root:
```
VITE_CLOUDINARY_WORKER_URL=https://cloudinary-signer.thryve.workers.dev
```

2. The worker is already deployed and configured

---

## Common Patterns Used

### 1. Custom Hook Pattern

```typescript
// useNetworkStatus.ts
export const useNetworkStatus = (): boolean => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
};

// Usage
const isOnline = useNetworkStatus();
```

### 2. Context Pattern (Toast Notifications)

```typescript
// Create and use anywhere in app
const { showToast } = useToast();
showToast('Message sent!', 'success');
showToast('Failed to send', 'error');
```

### 3. Service Pattern

```typescript
// Encapsulate related functionality
export const offlineService = {
    async getPendingMessages() { /* ... */ },
    async addPendingMessage(message) { /* ... */ },
    async removePendingMessage(id) { /* ... */ },
};

// Usage
await offlineService.addPendingMessage(myMessage);
```

---

## Quick Reference

### File Locations

| What | Where |
|------|-------|
| App entry | `src/main.tsx` |
| Firebase config | `src/firebase.ts` |
| Cloudinary upload | `src/cloudinary.ts` |
| Redux app state | `src/features/appSlice.ts` |
| Redux call state | `src/features/callSlice.ts` |
| Types | `src/types/index.ts` |
| Offline service | `src/services/offlineService.ts` |
| Sync service | `src/services/syncService.ts` |
| Agora service | `src/services/agoraService.ts` |
| Call service | `src/services/callService.ts` |
| User service | `src/services/userService.ts` |
| Sidebar panels | `src/components/panels/` |
| Threads Panel | `src/components/panels/ThreadsPanel.tsx` |
| Mentions Panel | `src/components/panels/MentionsPanel.tsx` |
| Saved Panel | `src/components/panels/SavedPanel.tsx` |
| People Panel | `src/components/panels/PeoplePanel.tsx` |
| Settings Panel | `src/components/panels/SettingsPanel.tsx` |
| New Message Modal | `src/components/ui/NewMessageModal.tsx` |
| Image Worker | `worker/src/index.ts` |
| Agora Worker | `agora-worker/src/index.js` |

### Important URLs

| Service | URL |
|---------|-----|
| Cloudflare Worker (Images) | https://cloudinary-signer.thryve.workers.dev |
| Cloudflare Worker (Agora) | https://agora-token.thryve.workers.dev |
| Firebase Console | https://console.firebase.google.com |
| Cloudinary Console | https://console.cloudinary.com |
| Agora Console | https://console.agora.io |
| Cloudflare Dashboard | https://dash.cloudflare.com |

---

## Summary

This project demonstrates:

1. **Modern React** with TypeScript, hooks, and functional components
2. **Vite + SWC** for fast development builds
3. **Firebase** for authentication and real-time database
4. **Agora RTC SDK** for audio/video calling
5. **Cloudflare Workers** for secure serverless functions (image signing, token generation)
6. **Redux Toolkit** for state management
7. **Styled Components** for CSS-in-JS styling
8. **Offline-first** architecture with localforage
9. **Security** with bcrypt password hashing and signed uploads
10. **Real-time presence** with online/offline user tracking
11. **Direct messaging** between users
12. **Member management** for private channels (add members, password bypass)
13. **Sidebar panels** for threads, mentions, saved items, people, and settings
14. **Save/bookmark messages** for later access

The architecture follows separation of concerns:
- **Components** handle UI (Header, Sidebar, Chat, VideoCall, Panels, etc.)
- **Services** handle business logic (agoraService, callService, userService, offlineService)
- **Hooks** handle reusable stateful logic (useNetworkStatus, useClickOutside)
- **Redux** handles global state (app state, call state, saved messages, settings)
- **Context** handles feature-specific state (toasts)
- **Workers** handle secure backend operations (Cloudinary signing, Agora tokens)

### Key Features Summary

| Feature | Implementation |
|---------|----------------|
| Google Sign-in | Firebase Authentication |
| Real-time Messaging | Firebase Firestore + listeners |
| Image Uploads | Cloudinary with signed uploads |
| Offline Support | IndexedDB + sync service |
| Password Channels | bcrypt hashing |
| Audio/Video Calls | Agora RTC SDK |
| Direct Messages | Auto-created DM rooms |
| User Presence | Firestore users collection |
| Channel Lock/Unlock | Toggle password protection |
| Member Management | Add members (bypass password) |
| Sidebar Panels | Threads, Mentions, Saved, People, Settings |
| Save Messages | Bookmark messages for later access |
| New Message Modal | Quick DM/channel selector |

---

*Documentation created for fresher interns. Happy coding!*
