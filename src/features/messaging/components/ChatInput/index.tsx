import React, { useState, useRef, useEffect, useCallback, ChangeEvent, FormEvent, KeyboardEvent, RefObject } from 'react';
import SendIcon from '@mui/icons-material/Send';
import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import MicIcon from '@mui/icons-material/Mic';
import { db } from '../../../../firebase';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth } from 'firebase/auth';
import { useSelector, useDispatch } from 'react-redux';
import { selectIsOnline, setPendingCount } from '../../../../features/appSlice';
import { uploadToCloudinary } from '../../../../cloudinary';
import { offlineService } from '../../../../services/offlineService';
import { typingService } from '../../../../services/typingService';

// Sub-components
import EmojiPicker from './EmojiPicker';
import ImagePreview from './ImagePreview';
import ReplyPreview from './ReplyPreview';
import VoiceRecorder from './VoiceRecorder';

// Styles
import {
    InputWrapper,
    OfflineBanner,
    InputContainer,
    InputRow,
    ActionButtons,
    ActionButton,
    InputField,
    StyledInput,
    SendButton,
    LoadingSpinner,
    MicButton,
    InputHint,
    HintText,
} from './ChatInput.styles';

// Types
import type { ReplyData } from '../../hooks/useReplyState';

interface ImageData {
    base64: string;
    mimeType: string;
    fileName: string;
}

interface ChatInputProps {
    channelName?: string;
    channelId: string;
    chatRef: RefObject<HTMLDivElement | null>;
    onPendingUpdate?: () => void;
    replyTo?: ReplyData | null;
    onCancelReply?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
    channelName,
    channelId,
    chatRef,
    onPendingUpdate,
    replyTo,
    onCancelReply
}) => {
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

        if (!channelId || (!input.trim() && !imageFile) || !user) {
            console.warn('Cannot send message: missing channelId, content, or user');
            return;
        }

        const messageText = input.trim();
        const hasImage = imageFile && imagePreview;

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
            message: messageText,
            users: user.displayName || 'Anonymous',
            userImage: user.photoURL || '',
            userId: user.uid,
            imageData: null,
        };

        if (replyTo) {
            messageData.replyTo = replyTo;
        }

        if (hasImage) {
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
            console.log('Offline mode: queueing message');
            try {
                await offlineService.addPendingMessage(messageData);
                await updatePendingCount();
            } catch (error) {
                console.error('Error queueing message:', error);
            }
        } else {
            setUploading(true);
            console.log('Sending message to channel:', channelId);
            try {
                let imageUrl: string | null = null;

                if (messageData.imageData) {
                    console.log('Uploading image to Cloudinary...');
                    const response = await fetch(messageData.imageData.base64);
                    const blob = await response.blob();
                    const file = new File([blob], messageData.imageData.fileName, {
                        type: messageData.imageData.mimeType,
                    });
                    const result = await uploadToCloudinary(file);
                    imageUrl = result.url;
                    console.log('Image uploaded successfully');
                }

                const chatDoc = doc(db, 'rooms', channelId);
                const messageDoc = doc(collection(chatDoc, 'messages'));

                const firestoreData = {
                    message: messageData.message,
                    timestamp: Timestamp.fromDate(new Date()),
                    users: messageData.users,
                    userImage: messageData.userImage,
                    userId: user.uid,
                    ...(imageUrl && { imageUrl }),
                    ...(messageData.replyTo && { replyTo: messageData.replyTo }),
                };

                console.log('Saving message to Firestore...');
                await setDoc(messageDoc, firestoreData);
                console.log('Message saved successfully');
            } catch (error: unknown) {
                console.error('Send failed:', error);
                console.log('Adding failed message to offline queue...');
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

        chatRef?.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(e);
        }
    };

    // Voice recording handlers
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
    };

    const cancelRecording = () => {
        setIsRecording(false);
        setRecordingTime(0);
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
        }
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
                {replyTo && (
                    <ReplyPreview replyTo={replyTo} onCancel={() => onCancelReply?.()} />
                )}

                {imagePreview && (
                    <ImagePreview
                        imagePreview={imagePreview}
                        fileName={imageFile?.name}
                        onRemove={removeImage}
                    />
                )}

                <InputRow>
                    {isRecording ? (
                        <VoiceRecorder
                            recordingTime={recordingTime}
                            onCancel={cancelRecording}
                            onSend={stopRecording}
                        />
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

                {showEmoji && <EmojiPicker onSelectEmoji={addEmoji} />}

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
