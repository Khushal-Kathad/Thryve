import React from 'react';
import type { TypingUser } from '../../../../services/typingService';
import { formatTypingText } from '../../hooks/useTypingIndicator';
import {
    TypingIndicatorContainer,
    TypingDots,
    TypingText,
} from './Chat.styles';

interface TypingIndicatorProps {
    typingUsers: TypingUser[];
    dmUserName?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers, dmUserName }) => {
    if (typingUsers.length === 0) return null;

    return (
        <TypingIndicatorContainer>
            <TypingDots>
                <span></span>
                <span></span>
                <span></span>
            </TypingDots>
            <TypingText>{formatTypingText(typingUsers, dmUserName)}</TypingText>
        </TypingIndicatorContainer>
    );
};

export default TypingIndicator;
