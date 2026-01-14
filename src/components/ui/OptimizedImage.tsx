import React, { useState, useCallback, memo } from 'react';
import styled, { keyframes, css } from 'styled-components';

interface OptimizedImageProps {
    src: string;
    alt: string;
    width?: number | string;
    height?: number | string;
    className?: string;
    borderRadius?: string;
    objectFit?: 'cover' | 'contain' | 'fill' | 'none';
    placeholder?: string;
    onLoad?: () => void;
    onError?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = memo(({
    src,
    alt,
    width = '100%',
    height = '100%',
    className,
    borderRadius = '0',
    objectFit = 'cover',
    placeholder,
    onLoad,
    onError,
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    const handleLoad = useCallback(() => {
        setIsLoaded(true);
        onLoad?.();
    }, [onLoad]);

    const handleError = useCallback(() => {
        setHasError(true);
        onError?.();
    }, [onError]);

    if (hasError) {
        return (
            <PlaceholderContainer
                style={{ width, height, borderRadius }}
                className={className}
            >
                <PlaceholderText>Failed to load</PlaceholderText>
            </PlaceholderContainer>
        );
    }

    return (
        <ImageContainer style={{ width, height, borderRadius }} className={className}>
            {!isLoaded && (
                <Placeholder $borderRadius={borderRadius}>
                    {placeholder ? (
                        <BlurredPlaceholder src={placeholder} alt="" />
                    ) : (
                        <ShimmerPlaceholder />
                    )}
                </Placeholder>
            )}
            <StyledImage
                src={src}
                alt={alt}
                loading="lazy"
                decoding="async"
                onLoad={handleLoad}
                onError={handleError}
                $isLoaded={isLoaded}
                $objectFit={objectFit}
                $borderRadius={borderRadius}
            />
        </ImageContainer>
    );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;

// Animations
const shimmer = keyframes`
    0% {
        background-position: -200% 0;
    }
    100% {
        background-position: 200% 0;
    }
`;

const fadeIn = keyframes`
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
`;

// Styled Components
const ImageContainer = styled.div`
    position: relative;
    overflow: hidden;
    background: var(--bg-tertiary);
`;

const Placeholder = styled.div<{ $borderRadius: string }>`
    position: absolute;
    inset: 0;
    z-index: 1;
    border-radius: ${props => props.$borderRadius};
    overflow: hidden;
`;

const ShimmerPlaceholder = styled.div`
    width: 100%;
    height: 100%;
    background: linear-gradient(
        90deg,
        var(--bg-tertiary) 25%,
        var(--bg-secondary) 50%,
        var(--bg-tertiary) 75%
    );
    background-size: 200% 100%;
    animation: ${shimmer} 1.5s ease-in-out infinite;
`;

const BlurredPlaceholder = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: blur(10px);
    transform: scale(1.1);
`;

const StyledImage = styled.img<{
    $isLoaded: boolean;
    $objectFit: string;
    $borderRadius: string;
}>`
    width: 100%;
    height: 100%;
    object-fit: ${props => props.$objectFit};
    border-radius: ${props => props.$borderRadius};
    opacity: ${props => props.$isLoaded ? 1 : 0};
    transition: opacity 0.3s ease-out;
    ${props => props.$isLoaded && css`
        animation: ${fadeIn} 0.3s ease-out;
    `}
`;

const PlaceholderContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-tertiary);
`;

const PlaceholderText = styled.span`
    font-size: 0.75rem;
    color: var(--text-muted);
`;
