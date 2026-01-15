import React from 'react';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import {
    ImagePreviewOverlay,
    ImagePreviewContent,
    ClosePreviewBtn,
    PreviewImage,
    PreviewInfo,
    PreviewSender,
    PreviewTime,
} from './Message.styles';

interface ImagePreviewModalProps {
    imageUrl: string;
    senderName: string;
    timestamp: Timestamp | null;
    onClose: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
    imageUrl,
    senderName,
    timestamp,
    onClose,
}) => {
    const formatFullDate = (ts: Timestamp | null): string => {
        if (!ts) return '';
        try {
            const date = ts.toDate();
            return format(date, 'MMM d, yyyy h:mm a');
        } catch {
            return '';
        }
    };

    return (
        <ImagePreviewOverlay onClick={onClose}>
            <ImagePreviewContent onClick={(e) => e.stopPropagation()}>
                <ClosePreviewBtn onClick={onClose}>
                    &times;
                </ClosePreviewBtn>
                <PreviewImage src={imageUrl} alt="Preview" />
                <PreviewInfo>
                    <PreviewSender>{senderName}</PreviewSender>
                    <PreviewTime>{formatFullDate(timestamp)}</PreviewTime>
                </PreviewInfo>
            </ImagePreviewContent>
        </ImagePreviewOverlay>
    );
};

export default ImagePreviewModal;
