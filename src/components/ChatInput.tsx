import React, { useState, useRef, ChangeEvent, FormEvent, KeyboardEvent, RefObject } from 'react';
import styled, { keyframes } from 'styled-components';
import SendIcon from '@mui/icons-material/Send';
import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import CloseIcon from '@mui/icons-material/Close';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { db } from '../firebase';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth } from 'firebase/auth';
import { useSelector, useDispatch } from 'react-redux';
import { selectIsOnline, setPendingCount } from '../features/appSlice';
import { uploadToCloudinary } from '../cloudinary';
import { offlineService } from '../services/offlineService';

const EMOJI_LIST = ['😀', '😂', '😍', '🥰', '😎', '🤔', '👍', '👎', '❤️', '🔥', '✨', '🎉', '💯', '🙌', '👏', '🤝'];

interface ChatInputProps {
    channelName?: string;
    channelId: string;
    chatRef: RefObject<HTMLDivElement | null>;
    onPendingUpdate?: () => void;
}

interface ImageData {
    base64: string;
    mimeType: string;
    fileName: string;
}

const ChatInput: React.FC<ChatInputProps> = ({ channelName, channelId, chatRef, onPendingUpdate }) => {
    const auth = getAuth();
    const [user] = useAuthState(auth);
    const dispatch = useDispatch();
    const isOnline = useSelector(selectIsOnline);

    const [input, setInput] = useState('');
    const [showEmoji, setShowEmoji] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setImagePreview(null);
        setImageFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const addEmoji = (emoji: string) => {
        setInput((prev) => prev + emoji);
        setShowEmoji(false);
    };

    const updatePendingCount = async () => {
        const count = await offlineService.getPendingCount();
        dispatch(setPendingCount(count));
        if (onPendingUpdate) {
            onPendingUpdate();
        }
    };

    const sendMessage = async (e: FormEvent | KeyboardEvent) => {
        e.preventDefault();

        if (!channelId || (!input.trim() && !imageFile) || !user) return;

        const messageData: {
            roomId: string;
            message: string;
            users: string;
            userImage: string;
            imageData: ImageData | null;
        } = {
            roomId: channelId,
            message: input.trim(),
            users: user.displayName || 'Anonymous',
            userImage: user.photoURL || '',
            imageData: null,
        };

        // Handle image - convert to base64 for offline storage
        if (imageFile && imagePreview) {
            messageData.imageData = {
                base64: imagePreview,
                mimeType: imageFile.type,
                fileName: imageFile.name,
            };
        }

        // Clear inputs immediately for better UX
        setInput('');
        removeImage();
        setShowEmoji(false);

        if (!isOnline) {
            // Store in offline queue
            try {
                await offlineService.addPendingMessage(messageData);
                await updatePendingCount();
            } catch (error) {
                console.error('Error queueing message:', error);
            }
        } else {
            // Try to send immediately
            setUploading(true);
            try {
                let imageUrl: string | null = null;

                if (messageData.imageData) {
                    // Convert base64 to file for upload
                    const response = await fetch(messageData.imageData.base64);
                    const blob = await response.blob();
                    const file = new File([blob], messageData.imageData.fileName, {
                        type: messageData.imageData.mimeType,
                    });
                    const result = await uploadToCloudinary(file);
                    imageUrl = result.url;
                }

                const chatDoc = doc(db, 'rooms', channelId);
                const messageDoc = doc(collection(chatDoc, 'messages'));

                await setDoc(messageDoc, {
                    message: messageData.message,
                    timestamp: Timestamp.fromDate(new Date()),
                    users: messageData.users,
                    userImage: messageData.userImage,
                    ...(imageUrl && { imageUrl }),
                });
            } catch (error) {
                // Failed - add to offline queue
                console.error('Send failed, queueing:', error);
                try {
                    await offlineService.addPendingMessage(messageData);
                    await updatePendingCount();
                } catch (queueError) {
                    console.error('Error queueing failed message:', queueError);
                }
            } finally {
                setUploading(false);
            }
        }

        // Scroll to bottom
        chatRef?.current?.scrollIntoView({
            behavior: 'smooth',
        });
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(e);
        }
    };

    return (
        <InputWrapper>
            <InputContainer $isOffline={!isOnline}>
                {imagePreview && (
                    <ImagePreviewContainer>
                        <PreviewImage src={imagePreview} alt="Preview" />
                        <RemoveButton onClick={removeImage}>
                            <CloseIcon />
                        </RemoveButton>
                    </ImagePreviewContainer>
                )}

                <InputRow>
                    <ActionButtons>
                        <ActionButton
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            title="Add image"
                        >
                            <ImageOutlinedIcon />
                        </ActionButton>
                        <ActionButton
                            type="button"
                            onClick={() => setShowEmoji(!showEmoji)}
                            title="Add emoji"
                            $isActive={showEmoji}
                        >
                            <EmojiEmotionsOutlinedIcon />
                        </ActionButton>
                    </ActionButtons>

                    <StyledInput
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Message #${channelName || 'channel'}`}
                        disabled={uploading}
                    />

                    <SendButton
                        type="submit"
                        onClick={sendMessage}
                        disabled={(!input.trim() && !imageFile) || uploading}
                        $hasContent={!!(input.trim() || imageFile)}
                    >
                        {uploading ? <LoadingSpinner /> : <SendIcon />}
                    </SendButton>
                </InputRow>

                {showEmoji && (
                    <EmojiPicker>
                        {EMOJI_LIST.map((emoji) => (
                            <EmojiButton key={emoji} type="button" onClick={() => addEmoji(emoji)}>
                                {emoji}
                            </EmojiButton>
                        ))}
                    </EmojiPicker>
                )}

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    style={{ display: 'none' }}
                />
            </InputContainer>

            <InputHint>
                {!isOnline && (
                    <OfflineHint>
                        <CloudOffIcon />
                        <span>Offline - messages will be sent when you reconnect</span>
                    </OfflineHint>
                )}
                <span>
                    Press <kbd>Enter</kbd> to send
                </span>
            </InputHint>
        </InputWrapper>
    );
};

export default ChatInput;

// Animations
const fadeIn = keyframes`
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

const spin = keyframes`
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
`;

// Styled Components
const InputWrapper = styled.div`
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--bg-chat);
    border-top: 1px solid var(--glass-border);
`;

const InputContainer = styled.div<{ $isOffline?: boolean }>`
    background: var(--glass-bg);
    border: 1px solid ${(props) => (props.$isOffline ? 'rgba(233, 69, 96, 0.5)' : 'var(--glass-border)')};
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: all var(--transition-normal);

    &:focus-within {
        border-color: ${(props) => (props.$isOffline ? 'rgba(233, 69, 96, 0.7)' : 'var(--accent-primary)')};
        box-shadow: 0 0 0 2px ${(props) => (props.$isOffline ? 'rgba(233, 69, 96, 0.2)' : 'rgba(88, 101, 242, 0.2)')};
    }
`;

const ImagePreviewContainer = styled.div`
    position: relative;
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--glass-border);
    animation: ${fadeIn} 0.2s ease-out;
`;

const PreviewImage = styled.img`
    max-width: 200px;
    max-height: 150px;
    border-radius: var(--radius-md);
    object-fit: cover;
`;

const RemoveButton = styled.button`
    position: absolute;
    top: var(--spacing-sm);
    left: calc(200px + var(--spacing-md));
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    background: var(--bg-primary);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);

    svg {
        font-size: 1rem;
    }

    &:hover {
        background: var(--accent-danger);
        color: white;
    }
`;

const InputRow = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
`;

const ActionButtons = styled.div`
    display: flex;
    gap: 2px;
`;

const ActionButton = styled.button<{ $isActive?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    color: ${(props) => (props.$isActive ? 'var(--accent-primary)' : 'var(--text-muted)')};
    transition: all var(--transition-fast);

    svg {
        font-size: 1.3rem;
    }

    &:hover {
        background: var(--glass-bg-hover);
        color: var(--accent-primary);
    }
`;

const StyledInput = styled.input`
    flex: 1;
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: 0.95rem;
    background: transparent;

    &::placeholder {
        color: var(--text-muted);
    }

    &:disabled {
        opacity: 0.6;
    }
`;

const SendButton = styled.button<{ $hasContent?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    background: ${(props) => (props.$hasContent ? 'var(--accent-primary)' : 'transparent')};
    color: ${(props) => (props.$hasContent ? 'white' : 'var(--text-muted)')};
    transition: all var(--transition-normal);

    svg {
        font-size: 1.2rem;
    }

    &:hover:not(:disabled) {
        background: ${(props) => (props.$hasContent ? 'var(--accent-secondary)' : 'var(--glass-bg-hover)')};
        transform: ${(props) => (props.$hasContent ? 'scale(1.05)' : 'none')};
    }

    &:disabled {
        cursor: not-allowed;
        opacity: 0.5;
    }
`;

const LoadingSpinner = styled.div`
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: ${spin} 0.8s linear infinite;
`;

const EmojiPicker = styled.div`
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 4px;
    padding: var(--spacing-sm);
    border-top: 1px solid var(--glass-border);
    background: var(--bg-secondary);
    animation: ${fadeIn} 0.2s ease-out;
`;

const EmojiButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 36px;
    border-radius: var(--radius-sm);
    font-size: 1.3rem;
    transition: all var(--transition-fast);

    &:hover {
        background: var(--glass-bg-hover);
        transform: scale(1.2);
    }
`;

const InputHint = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: var(--spacing-xs);

    span {
        font-size: 0.75rem;
        color: var(--text-muted);
    }

    kbd {
        display: inline-block;
        padding: 2px 6px;
        background: var(--glass-bg);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-sm);
        font-size: 0.7rem;
        font-family: inherit;
        margin: 0 2px;
    }
`;

const OfflineHint = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--accent-danger);

    svg {
        font-size: 1rem;
    }

    span {
        color: var(--accent-danger);
    }
`;
