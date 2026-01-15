import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface Room {
  id: string;
  name: string;
  passwordHash: string | null;
  createdAt: Timestamp;
  createdBy: string;
  isPrivate?: boolean; // If true, only members can access
  isDM?: boolean; // If true, this is a direct message room
  members?: string[]; // List of member user IDs (for private channels and DMs)
  memberNames?: Record<string, string>; // Map of userId -> displayName
}

export interface Message {
  id: string;
  message: string;
  timestamp: Timestamp | null;
  users: string;
  userImage: string;
  imageUrl?: string;
  reactions?: Record<string, string[]>;
}

export interface PendingMessage {
  id: string;
  roomId: string;
  message: string;
  clientTimestamp: number;
  users: string;
  userImage: string;
  userId: string;
  imageData?: ImageData | null;
  uploadedImageUrl?: string | null; // Cached URL to prevent duplicate uploads
  status: 'pending' | 'uploading' | 'failed';
  retryCount: number;
  createdAt: number;
}

export interface ImageData {
  base64: string;
  mimeType: string;
  fileName: string;
}

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

export interface ToastType {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error';
  duration: number;
}

export type SidebarPanel = 'none' | 'saved' | 'people' | 'settings';

export interface AppSettings {
  theme: 'dark' | 'light';
  notifications: boolean;
  soundEnabled: boolean;
  compactMode: boolean;
}

export interface SavedMessage {
  messageId: string;
  roomId: string;
  savedAt: number;
}

export interface AppState {
  roomId: string;
  verifiedRooms: string[];
  pendingRoomId: string | null;
  pendingRoomName: string | null;
  isOnline: boolean;
  pendingMessageCount: number;
  showCreateChannelModal: boolean;
  showNewMessageModal: boolean;
  activePanel: SidebarPanel;
  savedMessages: SavedMessage[];
  settings: AppSettings;
}

export interface RootState {
  app: AppState;
  call: CallState;
}

// Call Types
export interface Call {
  id: string;
  channelName: string;
  callerId: string;
  callerName: string;
  callerPhoto: string;
  receiverId: string; // For 1-to-1: specific user ID, For group: 'channel'
  receiverName: string;
  receiverPhoto: string;
  roomId: string;
  callType: 'audio' | 'video';
  isGroupCall: boolean;
  status: 'ringing' | 'active' | 'ended' | 'rejected' | 'missed';
  participants?: CallParticipant[]; // For group calls - who has joined
  createdAt: number;
  answeredAt?: number;
  endedAt?: number;
}

export interface CallParticipant {
  odUserId: string;
  odUserName: string;
  photo: string;
  joinedAt: number;
}

export interface CallState {
  currentCall: Call | null;
  incomingCall: Call | null;
  isInCall: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isMinimized: boolean;
  remoteUsers: string[];
}

export interface CallUser {
  odUserId: string;
  name: string;
  photo: string;
}

// Channel member for members list
export interface ChannelMember {
  odUserId: string;
  displayName: string;
  photoURL: string;
  email: string;
  lastSeen?: number;
}
