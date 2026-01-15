// Emoji constants
export const EMOJI_CATEGORIES = {
    smileys: ['😀', '😂', '🤣', '😊', '😍', '🥰', '😎', '🤔', '😢', '😭', '😡', '🥳'],
    gestures: ['👍', '👎', '👋', '🙌', '👏', '🤝', '✌️', '🤞', '💪', '🙏', '❤️', '💔'],
    symbols: ['🔥', '✨', '⭐', '💯', '🎉', '🎊', '💡', '⚡', '🌟', '💫', '🎯', '✅'],
};

export const EMOJI_LIST = [
    ...EMOJI_CATEGORIES.smileys,
    ...EMOJI_CATEGORIES.gestures,
    ...EMOJI_CATEGORIES.symbols,
];

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👏'];

// Message constants
export const MESSAGE_LIMITS = {
    MAX_LENGTH: 2000,
    MAX_IMAGE_SIZE_MB: 10,
};

// Timing constants
export const TIMING = {
    TYPING_DEBOUNCE_MS: 300,
    SEARCH_DEBOUNCE_MS: 250,
    USER_LOADING_TIMEOUT_MS: 10000,
    TOAST_DURATION_MS: 3000,
};

// Image optimization
export const IMAGE_CONFIG = {
    PREVIEW_MAX_WIDTH: 280,
    PREVIEW_MAX_HEIGHT: 350,
    THUMBNAIL_SIZE: 40,
    AVATAR_SIZE: 40,
};

// Call constants
export const CALL_CONFIG = {
    RINGING_TIMEOUT_MS: 30000,
    TOKEN_EXPIRY_HOURS: 24,
};
