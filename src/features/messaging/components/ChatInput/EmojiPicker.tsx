import React from 'react';
import { EMOJI_CATEGORIES } from '../../../../shared/constants';
import {
    EmojiPicker as EmojiPickerContainer,
    EmojiSection,
    EmojiHeader,
    EmojiGrid,
    EmojiButton,
} from './ChatInput.styles';

interface EmojiPickerProps {
    onSelectEmoji: (emoji: string) => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelectEmoji }) => {
    return (
        <EmojiPickerContainer>
            <EmojiSection>
                <EmojiHeader>
                    <span>Smileys</span>
                </EmojiHeader>
                <EmojiGrid>
                    {EMOJI_CATEGORIES.smileys.map((emoji) => (
                        <EmojiButton key={emoji} type="button" onClick={() => onSelectEmoji(emoji)}>
                            {emoji}
                        </EmojiButton>
                    ))}
                </EmojiGrid>
            </EmojiSection>
            <EmojiSection>
                <EmojiHeader>
                    <span>Gestures</span>
                </EmojiHeader>
                <EmojiGrid>
                    {EMOJI_CATEGORIES.gestures.map((emoji) => (
                        <EmojiButton key={emoji} type="button" onClick={() => onSelectEmoji(emoji)}>
                            {emoji}
                        </EmojiButton>
                    ))}
                </EmojiGrid>
            </EmojiSection>
            <EmojiSection>
                <EmojiHeader>
                    <span>Symbols</span>
                </EmojiHeader>
                <EmojiGrid>
                    {EMOJI_CATEGORIES.symbols.map((emoji) => (
                        <EmojiButton key={emoji} type="button" onClick={() => onSelectEmoji(emoji)}>
                            {emoji}
                        </EmojiButton>
                    ))}
                </EmojiGrid>
            </EmojiSection>
        </EmojiPickerContainer>
    );
};

export default EmojiPicker;
