import React from 'react';
import {
    QuotedReply as QuotedReplyContainer,
    QuotedBar,
    QuotedContent,
    QuotedUser,
    QuotedText,
    QuotedImage,
} from './Message.styles';

interface ReplyData {
    id: string;
    message: string;
    users: string;
    imageUrl?: string;
}

interface QuotedReplyProps {
    replyTo: ReplyData;
    isSent: boolean;
}

const QuotedReply: React.FC<QuotedReplyProps> = ({ replyTo, isSent }) => {
    return (
        <QuotedReplyContainer $isSent={isSent}>
            <QuotedBar $isSent={isSent} />
            <QuotedContent>
                <QuotedUser $isSent={isSent}>{replyTo.users}</QuotedUser>
                <QuotedText $isSent={isSent}>
                    {replyTo.imageUrl ? '📷 Photo' : replyTo.message.slice(0, 60)}
                    {replyTo.message.length > 60 && '...'}
                </QuotedText>
            </QuotedContent>
            {replyTo.imageUrl && (
                <QuotedImage src={replyTo.imageUrl} alt="" />
            )}
        </QuotedReplyContainer>
    );
};

export default QuotedReply;
