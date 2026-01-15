import React from 'react';
import ReplyIcon from '@mui/icons-material/Reply';
import CloseIcon from '@mui/icons-material/Close';
import type { ReplyData } from '../../hooks/useReplyState';
import {
    ReplyPreviewContainer,
    ReplyPreviewBar,
    ReplyPreviewContent,
    ReplyPreviewIcon,
    ReplyPreviewText,
    ReplyPreviewUser,
    ReplyPreviewMessage,
    ReplyPreviewImage,
    ReplyPreviewClose,
} from './ChatInput.styles';

interface ReplyPreviewProps {
    replyTo: ReplyData;
    onCancel: () => void;
}

const ReplyPreview: React.FC<ReplyPreviewProps> = ({ replyTo, onCancel }) => {
    return (
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
            <ReplyPreviewClose onClick={onCancel} title="Cancel reply">
                <CloseIcon />
            </ReplyPreviewClose>
        </ReplyPreviewContainer>
    );
};

export default ReplyPreview;
