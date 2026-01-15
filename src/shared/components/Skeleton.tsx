import React, { memo } from 'react';
import styled from 'styled-components';
import { shimmer } from '../styles/animations';

interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    borderRadius?: string;
    variant?: 'text' | 'circular' | 'rectangular';
}

const Skeleton: React.FC<SkeletonProps> = memo(({
    width = '100%',
    height = 16,
    borderRadius,
    variant = 'rectangular',
}) => {
    const getRadius = () => {
        if (borderRadius) return borderRadius;
        switch (variant) {
            case 'circular': return '50%';
            case 'text': return '4px';
            default: return 'var(--radius-md)';
        }
    };

    return (
        <SkeletonBase
            $width={typeof width === 'number' ? `${width}px` : width}
            $height={typeof height === 'number' ? `${height}px` : height}
            $borderRadius={getRadius()}
        />
    );
});

Skeleton.displayName = 'Skeleton';

export default Skeleton;

// Preset skeleton components
export const UserSkeleton: React.FC = memo(() => (
    <SkeletonContainer>
        <Skeleton variant="circular" width={40} height={40} />
        <SkeletonContent>
            <Skeleton width="70%" height={12} />
            <Skeleton width="40%" height={10} />
        </SkeletonContent>
    </SkeletonContainer>
));

UserSkeleton.displayName = 'UserSkeleton';

export const MessageSkeleton: React.FC = memo(() => (
    <MessageSkeletonContainer>
        <Skeleton variant="circular" width={28} height={28} />
        <SkeletonContent>
            <Skeleton width="30%" height={10} />
            <Skeleton width="80%" height={14} />
        </SkeletonContent>
    </MessageSkeletonContainer>
));

MessageSkeleton.displayName = 'MessageSkeleton';

// Styled Components
const SkeletonBase = styled.div<{
    $width: string;
    $height: string;
    $borderRadius: string;
}>`
    width: ${props => props.$width};
    height: ${props => props.$height};
    border-radius: ${props => props.$borderRadius};
    background: linear-gradient(
        90deg,
        var(--bg-tertiary) 25%,
        var(--bg-secondary) 50%,
        var(--bg-tertiary) 75%
    );
    background-size: 200% 100%;
    animation: ${shimmer} 1.5s ease-in-out infinite;
`;

const SkeletonContainer = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
`;

const SkeletonContent = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const MessageSkeletonContainer = styled.div`
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
`;
