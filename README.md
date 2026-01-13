# Thryve Chat

A modern real-time chat application built with React, TypeScript, Vite, and Firebase with audio/video calling capabilities.

## Features

### Core Messaging
- **Google Authentication** - Secure sign-in with Google accounts
- **Real-time Messaging** - Instant message delivery using Firebase Firestore
- **Password-Protected Channels** - Optional password protection for channels
- **Channel Lock/Unlock** - Channel creators can toggle password protection
- **Emoji Support** - Add emojis to your messages
- **Message Reactions** - React to messages with emojis
- **Image Sharing** - Secure image uploads via Cloudinary (signed uploads)
- **Offline Support** - Queue messages when offline, auto-sync when back online
- **Delete Channels** - Channel creators can delete their channels
- **Save/Bookmark Messages** - Save important messages for later access

### Audio/Video Calling (Agora)
- **Group Calls** - Start audio/video calls in any channel
- **1-to-1 Calls** - Direct calls to individual users from members panel
- **Call Controls** - Mute, video toggle, minimize, end call
- **Incoming Call Modal** - Accept/reject incoming calls with caller info
- **Active Call Banner** - See ongoing calls in channels and join them

### Direct Messaging & Users
- **Direct Messages** - Click on any user to start a private conversation
- **Users List** - See all logged-in users in the sidebar
- **Online Status** - Real-time online/offline indicators
- **New Message Modal** - Quick access to start DMs or join channels

### Channel Member Management
- **Add Members** - Channel creators can add members to password-protected channels
- **Password Bypass** - Added members can access the channel without entering password
- **Channel-Specific** - Members are added to specific channels only, not globally

### Sidebar Panels
- **Threads** - View message threads you're participating in
- **Mentions** - See all messages where you were @mentioned
- **Saved Items** - Access your bookmarked/saved messages
- **People** - View all users with online status, start DMs or calls
- **Settings** - Toggle theme, notifications, sound effects, compact mode

### UI/UX
- **Modern Dark UI** - Discord-inspired dark theme with glassmorphism
- **Responsive Design** - Works on desktop and tablet
- **Toast Notifications** - Feedback for all actions
- **Minimizable Calls** - Continue chatting while in a call

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 18 | Frontend framework |
| TypeScript | Type-safe JavaScript |
| Vite + SWC | Fast build tool |
| Firebase Auth | User authentication |
| Firebase Firestore | Real-time database with offline persistence |
| Agora RTC SDK | Audio/video calling |
| Cloudinary | Image hosting (secure signed uploads) |
| Cloudflare Workers | Serverless functions (signing, token generation) |
| Redux Toolkit | State management |
| Styled Components | CSS-in-JS styling |
| Material UI | Icons and components |
| React Router v6 | Navigation |
| bcryptjs | Password hashing |
| localforage | Offline message queue |
| date-fns | Date formatting |

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   React App     │────▶│  Cloudflare Workers  │────▶│   Cloudinary    │
│   (Frontend)    │     │  - Image Signing     │     │  (Image Host)   │
│                 │     │  - Agora Tokens      │     └─────────────────┘
└────────┬────────┘     └──────────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐     ┌─────────────────┐
│    Firebase     │     │   Agora Cloud   │
│  (Auth + DB)    │     │  (RTC Server)   │
└─────────────────┘     └─────────────────┘
```

### Call Flow
```
User A starts call → Firebase creates call document → User B receives notification
                                    ↓
User B accepts → Both join Agora channel → Audio/Video streams via Agora
                                    ↓
Call ends → Firebase document updated → Both leave Agora channel
```

## Quick Start

### 1. Install Dependencies

```bash
# Main app
npm install

# Cloudflare Worker
cd worker && npm install && cd ..
```

### 2. Configure Environment

Create `.env` file in root:
```env
VITE_CLOUDINARY_WORKER_URL=https://cloudinary-signer.YOUR_SUBDOMAIN.workers.dev
```

### 3. Run the App

```bash
npm run dev
```

### 4. Open Browser
```
http://localhost:3000
```

## Project Structure

```
Chat_Application/
├── src/
│   ├── main.tsx              # App entry point
│   ├── App.tsx               # Main app component with panel routing
│   ├── firebase.ts           # Firebase configuration
│   ├── cloudinary.ts         # Cloudinary signed uploads
│   │
│   ├── types/
│   │   └── index.ts          # TypeScript definitions (User, Room, Message, Call, AppSettings)
│   │
│   ├── app/
│   │   └── store.ts          # Redux store
│   │
│   ├── features/
│   │   ├── appSlice.ts       # App state (rooms, panels, saved messages, settings)
│   │   └── callSlice.ts      # Call state (current call, incoming call)
│   │
│   ├── services/
│   │   ├── offlineService.ts # Offline message queue
│   │   ├── syncService.ts    # Sync when online
│   │   ├── agoraService.ts   # Agora RTC SDK wrapper
│   │   ├── callService.ts    # Firebase call signaling
│   │   └── userService.ts    # User management & online status
│   │
│   ├── hooks/
│   │   ├── useNetworkStatus.ts  # Online/offline detection
│   │   └── useClickOutside.ts   # Click outside detection
│   │
│   ├── utils/
│   │   └── passwordUtils.ts  # bcrypt password hashing
│   │
│   ├── context/
│   │   └── ToastContext.tsx  # Toast notifications
│   │
│   └── components/
│       ├── Header.tsx        # Top navigation + offline banner
│       ├── Sidebar.tsx       # Channel list + users list + menu options
│       ├── SidebarOption.tsx # Channel item with lock toggle + member bypass
│       ├── Chat.tsx          # Chat area + call buttons
│       ├── ChatInput.tsx     # Message input + image upload
│       ├── Message.tsx       # Message display + reactions + bookmark
│       ├── Login.tsx         # Google sign-in
│       ├── VideoCall.tsx     # Video/audio call UI
│       ├── CallControls.tsx  # Mute, video, end call buttons
│       ├── MembersList.tsx   # Channel members + add members
│       │
│       ├── panels/           # Sidebar panel views
│       │   ├── index.ts          # Panel exports
│       │   ├── ThreadsPanel.tsx  # Message threads view
│       │   ├── MentionsPanel.tsx # @mentions view
│       │   ├── SavedPanel.tsx    # Bookmarked messages view
│       │   ├── PeoplePanel.tsx   # All users view
│       │   └── SettingsPanel.tsx # App settings view
│       │
│       └── ui/
│           ├── Toast.tsx              # Toast notification
│           ├── ConfirmDialog.tsx      # Confirmation modal
│           ├── CreateChannelModal.tsx # Create channel (optional password)
│           ├── ChannelPasswordModal.tsx # Enter channel password
│           ├── NewMessageModal.tsx    # Quick DM/channel selector
│           ├── IncomingCallModal.tsx  # Accept/reject incoming call
│           └── ActiveCallBanner.tsx   # Join active channel call
│
├── worker/                   # Cloudflare Worker (Image signing)
│   ├── src/
│   │   └── index.ts          # Cloudinary signing function
│   ├── wrangler.toml
│   └── package.json
│
├── agora-worker/             # Cloudflare Worker (Agora tokens)
│   ├── src/
│   │   └── index.js          # Agora token generation
│   ├── wrangler.toml
│   └── package.json
│
├── functions/                # Firebase Functions (alternative)
│   └── src/
│       └── index.ts
│
└── build/                    # Production build output
```

## Firebase Database Structure

```
rooms/
└── {roomId}/
    ├── name: "channel-name"
    ├── passwordHash: "$2a$10$..." (optional, bcrypt hash)
    ├── createdAt: Timestamp
    ├── createdBy: "userId"
    ├── isPrivate: boolean (optional)
    ├── isDM: boolean (optional, true for direct messages)
    ├── members: ["userId1", "userId2"] (users who can bypass password)
    ├── memberNames: { "userId1": "John" } (optional)
    └── messages/
        └── {messageId}/
            ├── message: "Hello!"
            ├── timestamp: Timestamp
            ├── users: "John Doe"
            ├── userImage: "https://..."
            ├── imageUrl: "https://..." (optional)
            └── reactions: { "👍": ["user1", "user2"] } (optional)

users/
└── {userId}/
    ├── uid: "userId"
    ├── displayName: "John Doe"
    ├── email: "john@example.com"
    ├── photoURL: "https://..."
    ├── isOnline: boolean
    ├── lastSeen: timestamp
    └── createdAt: timestamp

calls/
└── {callId}/
    ├── channelName: "call_123456"
    ├── callerId: "userId"
    ├── callerName: "John Doe"
    ├── callerPhoto: "https://..."
    ├── receiverId: "userId" or "channel"
    ├── receiverName: "Jane" or "Channel Name"
    ├── roomId: "roomId"
    ├── callType: "audio" | "video"
    ├── isGroupCall: boolean
    ├── status: "ringing" | "active" | "ended" | "rejected" | "missed"
    ├── participants: [{ odUserId, odUserName, photo, joinedAt }]
    ├── createdAt: timestamp
    ├── answeredAt: timestamp (optional)
    └── endedAt: timestamp (optional)
```

## Redux State Structure

```typescript
// App State (appSlice.ts)
{
    roomId: string,              // Current selected room
    verifiedRooms: string[],     // Rooms user has unlocked
    activePanel: 'none' | 'threads' | 'mentions' | 'saved' | 'people' | 'settings',
    showNewMessageModal: boolean,
    savedMessages: [{ messageId, roomId, savedAt }],
    settings: {
        theme: 'dark' | 'light',
        notifications: boolean,
        soundEnabled: boolean,
        compactMode: boolean
    }
}

// Call State (callSlice.ts)
{
    currentCall: Call | null,
    incomingCall: Call | null,
    isInCall: boolean,
    isMuted: boolean,
    isVideoEnabled: boolean,
    isMinimized: boolean,
    remoteUsers: string[]
}
```

## Deployment

### Deploy Cloudflare Worker (Required for image uploads)

```bash
cd worker

# Login to Cloudflare
npx wrangler login

# Add API secret
npx wrangler secret put CLOUDINARY_API_SECRET

# Deploy
npm run deploy
```

### Deploy App to Cloudflare Pages

```bash
# Set production worker URL
echo VITE_CLOUDINARY_WORKER_URL=https://cloudinary-signer.YOUR_SUBDOMAIN.workers.dev > .env.production

# Build
npm run build

# Deploy
npx wrangler pages deploy build --project-name=thryve-chat
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run typecheck` | Run TypeScript type checking |

## Services Used (All Free Tier)

| Service | Free Limit | Used For |
|---------|------------|----------|
| Firebase Auth | Unlimited | User authentication |
| Firebase Firestore | 50K reads, 20K writes/day | Messages, channels, calls, users |
| Agora RTC | 10,000 minutes/month | Audio/video calling |
| Cloudinary | 25GB storage, 25GB bandwidth/month | Image hosting |
| Cloudflare Workers | 100K requests/day | Signing & token services |
| Cloudflare Pages | Unlimited bandwidth | App hosting |

## Environment Variables

Create `.env` file in project root:

```env
# Cloudinary image signing
VITE_CLOUDINARY_WORKER_URL=https://cloudinary-signer.YOUR_SUBDOMAIN.workers.dev

# Agora video/audio calling
VITE_AGORA_APP_ID=your_agora_app_id
VITE_AGORA_TOKEN_WORKER_URL=https://agora-token.YOUR_SUBDOMAIN.workers.dev
```

## Security Features

- **Signed Uploads**: Images are uploaded with cryptographic signatures
- **Password Hashing**: bcrypt with salt for channel passwords
- **Member Access Control**: Added members bypass password for specific channels only
- **Firebase Rules**: Firestore security rules for data access
- **HTTPS Only**: All communications encrypted

## Documentation

- [my_demone.md](./my_demone.md) - Detailed technical documentation for developers

## License

MIT License

---

Built with React, Firebase & Cloudflare
