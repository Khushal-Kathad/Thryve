// Firestore collection names
export const COLLECTIONS = {
    ROOMS: 'rooms',
    USERS: 'users',
    CALLS: 'calls',
    MESSAGES: 'messages',
} as const;

// Firestore field names (to prevent typos)
export const FIELDS = {
    TIMESTAMP: 'timestamp',
    CREATED_AT: 'createdAt',
    UPDATED_AT: 'updatedAt',
    IS_DM: 'isDM',
    IS_PRIVATE: 'isPrivate',
    PASSWORD_HASH: 'passwordHash',
    MEMBERS: 'members',
    MEMBER_NAMES: 'memberNames',
    CREATED_BY: 'createdBy',
    STATUS: 'status',
    IS_ONLINE: 'isOnline',
    LAST_SEEN: 'lastSeen',
} as const;

// Call status values
export const CALL_STATUS = {
    RINGING: 'ringing',
    ACTIVE: 'active',
    ENDED: 'ended',
    REJECTED: 'rejected',
    MISSED: 'missed',
} as const;

// Message status values
export const MESSAGE_STATUS = {
    PENDING: 'pending',
    UPLOADING: 'uploading',
    FAILED: 'failed',
    SENT: 'sent',
} as const;
