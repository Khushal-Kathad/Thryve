import React, { useState, useRef, useEffect, useCallback, ChangeEvent, FormEvent, KeyboardEvent, RefObject } from 'react';
import styled, { keyframes } from 'styled-components';
import SendIcon from '@mui/icons-material/Send';
import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import CloseIcon from '@mui/icons-material/Close';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import ReplyIcon from '@mui/icons-material/Reply';
import MicIcon from '@mui/icons-material/Mic';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { db } from '../firebase';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth } from 'firebase/auth';
import { useSelector, useDispatch } from 'react-redux';
import { selectIsOnline, setPendingCount } from '../features/appSlice';
import { uploadToCloudinary } from '../cloudinary';
import { offlineService } from '../services/offlineService';
import { typingService } from '../services/typingService';

const EMOJI_LIST = ['😀', '😂', '😍', '🥰', '😎', '🤔', '👍', '👎', '❤️', '🔥', '✨', '🎉', '💯', '🙌', '👏', '🤝'];

export interface ReplyData {
    id: string;
    message: string;
    users: string;
    imageUrl?: string;
}

interface ChatInputProps {
    channelName?: string;
    channelId: string;
    chatRef: RefObject<HTMLDivElement | null>;
    onPendingUpdate?: () => void;
    replyTo?: ReplyData | null;
    onCancelReply?: () => void;
}

interface ImageData {
    base64: string;
    mimeType: string;
    fileName: string;
}

const ChatInput: React.FC<ChatInputProps> = ({ channelName, channelId, chatRef, onPendingUpdate, replyTo, onCancelReply }) => {
    const auth = getAuth();
    const [user] = useAuthState(auth);
    const dispatch = useDispatch();
    const isOnline = useSelector(selectIsOnline);

    const [input, setInput] = useState('');
    const [showEmoji, setShowEmoji] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Handle typing indicator
    const handleTyping = useCallback(() => {
        if (user && channelId && isOnline) {
            typingService.setTyping(channelId, user.uid, user.displayName || 'Anonymous');
        }
    }, [user, channelId, isOnline]);

    // Clear typing on unmount or channel change
    useEffect(() => {
        return () => {
            if (user && channelId) {
                typingService.clearTyping(channelId, user.uid);
            }
        };
    }, [user, channelId]);

    // Handle input change with typing indicator
    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
        handleTyping();
    };

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
        inputRef.current?.focus();
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
            userId: string;
            imageData: ImageData | null;
            replyTo?: ReplyData;
        } = {
            roomId: channelId,
            message: input.trim(),
            users: user.displayName || 'Anonymous',
            userImage: user.photoURL || '',
            userId: user.uid,
            imageData: null,
        };

        // Include reply data if replying
        if (replyTo) {
            messageData.replyTo = replyTo;
        }

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
        onCancelReply?.();

        // Clear typing indicator
        if (user && channelId) {
            typingService.clearTyping(channelId, user.uid);
        }

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
                    userId: user.uid,
                    ...(imageUrl && { imageUrl }),
                    ...(messageData.replyTo && { replyTo: messageData.replyTo }),
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

    // Voice recording handlers (placeholder functionality)
    const startRecording = () => {
        setIsRecording(true);
        setRecordingTime(0);
        recordingIntervalRef.current = setInterval(() => {
            setRecordingTime(prev => prev + 1);
        }, 1000);
    };

    const stopRecording = () => {
        setIsRecording(false);
        setRecordingTime(0);
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
        }
        // Placeholder: In a real implementation, this would send the audio
        // For now, just show a toast or do nothing
    };

    const cancelRecording = () => {
        setIsRecording(false);
        setRecordingTime(0);
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
        }
    };

    const formatRecordingTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }
        };
    }, []);

    const hasContent = !!(input.trim() || imageFile);

    return (
        <InputWrapper>
            {!isOnline && (
                <OfflineBanner>
                    <CloudOffIcon />
                    <span>You're offline. Messages will be sent when you reconnect.</span>
                </OfflineBanner>
            )}

            <InputContainer $isOffline={!isOnline} $isFocused={isFocused}>
                {/* Reply Preview */}
                {replyTo && (
                    <ReplyPreviewContainer>
                        <ReplyPreviewBar />
                        <ReplyPreviewContent>
                            <ReplyPreviewIcon>
                                <ReplyIcon />
                            </ReplyPreviewIcon>
                            <ReplyPreviewText>
                                <ReplyPreviewUser>Replying to {replyTo.users}</ReplyPreviewUser>
                                <ReplyPreviewMessage>
                                    {replyTo.imageUrl ? '📷 Photo' : replyTo.message.slice(0, 50)}
                                    {replyTo.message.length > 50 && '...'}
                                </ReplyPreviewMessage>
                            </ReplyPreviewText>
                            {replyTo.imageUrl && (
                                <ReplyPreviewImage src={replyTo.imageUrl} alt="" />
                            )}
                        </ReplyPreviewContent>
                        <ReplyPreviewClose onClick={onCancelReply} title="Cancel reply">
                            <CloseIcon />
                        </ReplyPreviewClose>
                    </ReplyPreviewContainer>
                )}

                {imagePreview && (
                    <ImagePreviewContainer>
                        <PreviewWrapper>
                            <PreviewImage src={imagePreview} alt="Preview" />
                            <RemoveButton onClick={removeImage} title="Remove image">
                                <CloseIcon />
                            </RemoveButton>
                        </PreviewWrapper>
                        <PreviewFileName>{imageFile?.name}</PreviewFileName>
                    </ImagePreviewContainer>
                )}

                <InputRow>
                    {isRecording ? (
                        <>
                            {/* Recording UI */}
                            <RecordingContainer>
                                <CancelRecordingButton onClick={cancelRecording} title="Cancel">
                                    <DeleteOutlineIcon />
                                </CancelRecordingButton>
                                <RecordingIndicator>
                                    <RecordingPulse />
                                    <RecordingTime>{formatRecordingTime(recordingTime)}</RecordingTime>
                                </RecordingIndicator>
                                <RecordingWave>
                                    <WaveBar style={{ animationDelay: '0s' }} />
                                    <WaveBar style={{ animationDelay: '0.1s' }} />
                                    <WaveBar style={{ animationDelay: '0.2s' }} />
                                    <WaveBar style={{ animationDelay: '0.3s' }} />
                                    <WaveBar style={{ animationDelay: '0.4s' }} />
                                </RecordingWave>
                            </RecordingContainer>
                            <SendButton
                                type="button"
                                onClick={stopRecording}
                                $hasContent={true}
                                title="Send voice message"
                            >
                                <SendIcon />
                            </SendButton>
                        </>
                    ) : (
                        <>
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

                            <InputField>
                                <StyledInput
                                    ref={inputRef}
                                    value={input}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    placeholder={`Message #${channelName || 'channel'}`}
                                    disabled={uploading}
                                />
                            </InputField>

                            {hasContent ? (
                                <SendButton
                                    type="submit"
                                    onClick={sendMessage}
                                    disabled={uploading}
                                    $hasContent={hasContent}
                                    title="Send message"
                                >
                                    {uploading ? <LoadingSpinner /> : <SendIcon />}
                                </SendButton>
                            ) : (
                                <MicButton
                                    type="button"
                                    onClick={startRecording}
                                    title="Hold to record voice message"
                                >
                                    <MicIcon />
                                </MicButton>
                            )}
                        </>
                    )}
                </InputRow>

                {showEmoji && (
                    <EmojiPicker>
                        <EmojiHeader>
                            <span>Quick reactions</span>
                        </EmojiHeader>
                        <EmojiGrid>
                            {EMOJI_LIST.map((emoji) => (
                                <EmojiButton key={emoji} type="button" onClick={() => addEmoji(emoji)}>
                                    {emoji}
                                </EmojiButton>
                            ))}
                        </EmojiGrid>
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
                <HintText>
                    Press <kbd>Enter</kbd> to send
                </HintText>
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

const slideDown = keyframes`
    from {
        opacity: 0;
        transform: translateY(-10px);
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

const pulse = keyframes`
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.7;
    }
`;

// Styled Components
const InputWrapper = styled.div`
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--bg-primary);
    border-top: 1px solid var(--border-light);

    @media (max-width: 768px) {
        padding: var(--spacing-sm) var(--spacing-md);
    }
`;

const OfflineBanner = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    margin-bottom: var(--spacing-sm);
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: var(--radius-md);
    color: var(--accent-danger);
    font-size: 0.85rem;
    animation: ${slideDown} 0.3s ease-out;

    svg {
        font-size: 1.1rem;
    }

    @media (max-width: 480px) {
        font-size: 0.8rem;
        padding: var(--spacing-xs) var(--spacing-sm);
    }
`;

const InputContainer = styled.div<{ $isOffline?: boolean; $isFocused?: boolean }>`
    background: var(--bg-secondary);
    border: 2px solid ${(props) => {
        if (props.$isOffline) return 'rgba(239, 68, 68, 0.3)';
        if (props.$isFocused) return 'var(--accent-primary)';
        return 'var(--border-light)';
    }};
    border-radius: var(--radius-xl);
    overflow: hidden;
    transition: all var(--transition-fast);
    box-shadow: ${(props) => props.$isFocused ? 'var(--shadow-glow)' : 'var(--shadow-sm)'};
`;

const ImagePreviewContainer = styled.div`
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--border-light);
    background: var(--bg-tertiary);
    animation: ${fadeIn} 0.2s ease-out;
`;

const PreviewWrapper = styled.div`
    position: relative;
    display: inline-block;
`;

const PreviewImage = styled.img`
    max-width: 200px;
    max-height: 150px;
    border-radius: var(--radius-lg);
    object-fit: cover;
    box-shadow: var(--shadow-md);

    @media (max-width: 480px) {
        max-width: 150px;
        max-height: 100px;
    }
`;

const RemoveButton = styled.button`
    position: absolute;
    top: -8px;
    right: -8px;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    background: var(--bg-primary);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-md);
    transition: all var(--transition-fast);
    border: 2px solid var(--border-light);

    svg {
        font-size: 1rem;
    }

    &:hover {
        background: var(--accent-danger);
        border-color: var(--accent-danger);
        color: white;
        transform: scale(1.1);
    }
`;

const PreviewFileName = styled.span`
    display: block;
    margin-top: var(--spacing-sm);
    font-size: 0.8rem;
    color: var(--text-muted);
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const InputRow = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);

    @media (max-width: 480px) {
        padding: var(--spacing-xs);
    }
`;

const ActionButtons = styled.div`
    display: flex;
    gap: 2px;
    flex-shrink: 0;

    @media (max-width: 380px) {
        /* Hide action buttons on very small screens */
        display: none;
    }
`;

const ActionButton = styled.button<{ $isActive?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    color: ${(props) => (props.$isActive ? 'var(--accent-primary)' : 'var(--text-muted)')};
    background: ${(props) => (props.$isActive ? 'var(--purple-50)' : 'transparent')};
    transition: all var(--transition-fast);

    svg {
        font-size: 1.4rem;
    }

    &:hover {
        background: var(--purple-50);
        color: var(--accent-primary);
    }

    @media (max-width: 480px) {
        width: 36px;
        height: 36px;

        svg {
            font-size: 1.2rem;
        }
    }
`;

const InputField = styled.div`
    flex: 1;
    min-width: 0;
`;

const StyledInput = styled.input`
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: 1rem;
    background: transparent;
    color: var(--text-primary);
    border: none;
    outline: none;

    &::placeholder {
        color: var(--text-muted);
    }

    &:disabled {
        opacity: 0.6;
    }

    @media (max-width: 480px) {
        font-size: 0.95rem;
        padding: var(--spacing-sm);
    }
`;

const SendButton = styled.button<{ $hasContent?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: var(--radius-lg);
    background: ${(props) => (props.$hasContent ? 'var(--gradient-primary)' : 'var(--bg-tertiary)')};
    color: ${(props) => (props.$hasContent ? 'white' : 'var(--text-muted)')};
    transition: all var(--transition-fast);
    flex-shrink: 0;
    box-shadow: ${(props) => (props.$hasContent ? 'var(--shadow-glow)' : 'none')};

    svg {
        font-size: 1.3rem;
    }

    &:hover:not(:disabled) {
        transform: ${(props) => (props.$hasContent ? 'scale(1.05)' : 'none')};
        background: ${(props) => (props.$hasContent ? 'var(--gradient-primary)' : 'var(--bg-tertiary)')};
    }

    &:active:not(:disabled) {
        transform: scale(0.95);
    }

    &:disabled {
        cursor: not-allowed;
        opacity: 0.6;
    }

    @media (max-width: 480px) {
        width: 40px;
        height: 40px;

        svg {
            font-size: 1.2rem;
        }
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
    border-top: 1px solid var(--border-light);
    background: var(--bg-tertiary);
    animation: ${fadeIn} 0.2s ease-out;
`;

const EmojiHeader = styled.div`
    padding: var(--spacing-sm) var(--spacing-md);
    border-bottom: 1px solid var(--border-light);

    span {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
`;

const EmojiGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 4px;
    padding: var(--spacing-sm);

    @media (max-width: 480px) {
        grid-template-columns: repeat(6, 1fr);
    }
`;

const EmojiButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    border-radius: var(--radius-md);
    font-size: 1.4rem;
    transition: all var(--transition-fast);

    &:hover {
        background: var(--purple-50);
        transform: scale(1.2);
    }

    &:active {
        transform: scale(0.9);
    }

    @media (max-width: 480px) {
        height: 36px;
        font-size: 1.2rem;
    }
`;

const InputHint = styled.div`
    display: flex;
    justify-content: flex-end;
    padding-top: var(--spacing-xs);
`;

const HintText = styled.span`
    font-size: 0.75rem;
    color: var(--text-muted);

    kbd {
        display: inline-block;
        padding: 2px 6px;
        background: var(--bg-tertiary);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-sm);
        font-size: 0.7rem;
        font-family: inherit;
        margin: 0 2px;
        color: var(--text-secondary);
    }

    @media (max-width: 480px) {
        display: none;
    }
`;

// Reply Preview Styles
const ReplyPreviewContainer = styled.div`
    display: flex;
    align-items: stretch;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--bg-tertiary);
    border-bottom: 1px solid var(--border-light);
    animation: ${slideDown} 0.2s ease-out;
    gap: var(--spacing-sm);
`;

const ReplyPreviewBar = styled.div`
    width: 4px;
    background: var(--gradient-primary);
    border-radius: 2px;
    flex-shrink: 0;
`;

const ReplyPreviewContent = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    min-width: 0;
`;

const ReplyPreviewIcon = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-md);
    background: var(--purple-50);
    flex-shrink: 0;

    svg {
        font-size: 1rem;
        color: var(--accent-primary);
    }
`;

const ReplyPreviewText = styled.div`
    flex: 1;
    min-width: 0;
`;

const ReplyPreviewUser = styled.span`
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--accent-primary);
    margin-bottom: 2px;
`;

const ReplyPreviewMessage = styled.span`
    display: block;
    font-size: 0.85rem;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const ReplyPreviewImage = styled.img`
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    object-fit: cover;
    flex-shrink: 0;
`;

const ReplyPreviewClose = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    color: var(--text-muted);
    transition: all var(--transition-fast);
    flex-shrink: 0;

    svg {
        font-size: 1rem;
    }

    &:hover {
        background: rgba(239, 68, 68, 0.1);
        color: var(--accent-danger);
    }
`;

// Voice Recording Styles
const recordingPulse = keyframes`
    0%, 100% {
        transform: scale(1);
        opacity: 1;
    }
    50% {
        transform: scale(1.2);
        opacity: 0.7;
    }
`;

const waveAnimation = keyframes`
    0%, 100% {
        height: 8px;
    }
    50% {
        height: 24px;
    }
`;

const MicButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: var(--radius-lg);
    background: var(--bg-tertiary);
    color: var(--text-muted);
    transition: all var(--transition-fast);
    flex-shrink: 0;

    svg {
        font-size: 1.3rem;
    }

    &:hover {
        background: var(--purple-50);
        color: var(--accent-primary);
    }

    &:active {
        background: var(--accent-primary);
        color: white;
        transform: scale(0.95);
    }

    @media (max-width: 480px) {
        width: 40px;
        height: 40px;

        svg {
            font-size: 1.2rem;
        }
    }
`;

const RecordingContainer = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: 0 var(--spacing-sm);
    animation: ${fadeIn} 0.2s ease-out;
`;

const CancelRecordingButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-full);
    background: rgba(239, 68, 68, 0.1);
    color: var(--accent-danger);
    transition: all var(--transition-fast);

    svg {
        font-size: 1.2rem;
    }

    &:hover {
        background: var(--accent-danger);
        color: white;
    }
`;

const RecordingIndicator = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
`;

const RecordingPulse = styled.div`
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--accent-danger);
    animation: ${recordingPulse} 1s ease-in-out infinite;
`;

const RecordingTime = styled.span`
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
    min-width: 45px;
`;

const RecordingWave = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: 32px;
`;

const WaveBar = styled.div`
    width: 4px;
    height: 16px;
    border-radius: 2px;
    background: var(--accent-primary);
    animation: ${waveAnimation} 0.8s ease-in-out infinite;
`;
