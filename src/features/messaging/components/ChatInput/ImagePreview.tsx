import React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import {
    ImagePreviewContainer,
    PreviewWrapper,
    PreviewImage,
    RemoveButton,
    PreviewFileName,
} from './ChatInput.styles';

interface ImagePreviewProps {
    imagePreview: string;
    fileName?: string;
    onRemove: () => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ imagePreview, fileName, onRemove }) => {
    return (
        <ImagePreviewContainer>
            <PreviewWrapper>
                <PreviewImage src={imagePreview} alt="Preview" />
                <RemoveButton onClick={onRemove} title="Remove image">
                    <CloseIcon />
                </RemoveButton>
            </PreviewWrapper>
            {fileName && <PreviewFileName>{fileName}</PreviewFileName>}
        </ImagePreviewContainer>
    );
};

export default ImagePreview;
