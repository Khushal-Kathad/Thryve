import React, { useState } from 'react';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import {
    enterRoom,
    selectRoomId,
    selectVerifiedRooms,
    setPendingRoom,
    setShowCreateChannelModal,
    addVerifiedRoom,
} from '../features/appSlice';
import TagIcon from '@mui/icons-material/Tag';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { SvgIconComponent } from '@mui/icons-material';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '../context/ToastContext';

interface SidebarOptionProps {
    Icon?: SvgIconComponent;
    title: string;
    addChannelOption?: boolean;
    id?: string;
    hasPassword?: boolean;
    isPrivate?: boolean;
    createdBy?: string;
    currentUserId?: string;
    members?: string[];  // List of member userIds who can bypass password
    onClick?: () => void;
}

const SidebarOption: React.FC<SidebarOptionProps> = ({
    Icon,
    title,
    addChannelOption,
    id,
    hasPassword,
    isPrivate,
    createdBy,
    currentUserId,
    members = [],
    onClick,
}) => {
    const dispatch = useDispatch();
    const { showToast } = useToast();
    const currentRoomId = useSelector(selectRoomId);
    const verifiedRooms = useSelector(selectVerifiedRooms);
    const isActive = id && id === currentRoomId;
    const isCreator = createdBy && currentUserId && createdBy === currentUserId;
    const [isToggling, setIsToggling] = useState(false);

    const openCreateChannelModal = () => {
        dispatch(setShowCreateChannelModal(true));
    };

    const selectChannel = () => {
        if (id) {
            // Check if user is the creator or a member added by creator
            const isMember = currentUserId && members.includes(currentUserId);
            const canBypassPassword = isCreator || isMember || verifiedRooms.includes(id);

            // If no password, user is creator/member, or already verified - enter directly
            if (!hasPassword || canBypassPassword) {
                if (!verifiedRooms.includes(id)) {
                    dispatch(addVerifiedRoom({ roomId: id }));
                }
                dispatch(enterRoom({ roomId: id }));
            } else {
                // Password protected and not verified/member - show password modal
                dispatch(setPendingRoom({ roomId: id, roomName: title }));
            }
        }
    };

    const toggleChannelLock = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent channel selection

        if (!id || !isCreator || isToggling) return;

        setIsToggling(true);
        try {
            const roomRef = doc(db, 'rooms', id);
            if (hasPassword) {
                // Remove password protection
                await updateDoc(roomRef, {
                    passwordHash: null,
                });
                showToast(`Channel "${title}" is now public`, 'success');
            } else {
                // For now, just mark as private (user would need to set password separately)
                // We'll prompt for a password using a simple approach
                const password = window.prompt('Enter a password to lock this channel:');
                if (password && password.trim()) {
                    // Import hashPassword dynamically to avoid circular deps
                    const { hashPassword } = await import('../utils/passwordUtils');
                    const hash = await hashPassword(password.trim());
                    await updateDoc(roomRef, {
                        passwordHash: hash,
                    });
                    showToast(`Channel "${title}" is now password protected`, 'success');
                }
            }
        } catch (error) {
            console.error('Error toggling channel lock:', error);
            showToast('Failed to update channel settings', 'error');
        } finally {
            setIsToggling(false);
        }
    };

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else if (addChannelOption) {
            openCreateChannelModal();
        } else {
            selectChannel();
        }
    };

    return (
        <OptionContainer
            onClick={handleClick}
            $isActive={!!isActive}
            $isAddChannel={!!addChannelOption}
        >
            {Icon ? (
                <Icon />
            ) : (
                <TagIcon />
            )}
            <OptionTitle>{title}</OptionTitle>
            {!Icon && !addChannelOption && (
                <>
                    {isCreator ? (
                        <LockToggleButton
                            onClick={toggleChannelLock}
                            title={hasPassword ? 'Remove password protection' : 'Add password protection'}
                            $isLocked={!!hasPassword}
                            disabled={isToggling}
                        >
                            {hasPassword ? <LockIcon /> : <LockOpenIcon />}
                        </LockToggleButton>
                    ) : (
                        hasPassword && (
                            <LockIndicator title="Password protected">
                                <LockIcon />
                            </LockIndicator>
                        )
                    )}
                </>
            )}
            {isActive && <ActiveIndicator />}
        </OptionContainer>
    );
};

export default SidebarOption;

// Styled Components
const OptionContainer = styled.div<{ $isActive?: boolean; $isAddChannel?: boolean }>`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    margin: 2px var(--spacing-sm);
    border-radius: var(--radius-md);
    color: ${props => props.$isActive ? 'var(--text-primary)' : 'var(--text-secondary)'};
    font-size: 0.9rem;
    cursor: pointer;
    position: relative;
    transition: all var(--transition-fast);
    background: ${props => props.$isActive ? 'var(--glass-bg-hover)' : 'transparent'};

    svg {
        font-size: 1.1rem;
        color: ${props => props.$isAddChannel
            ? 'var(--accent-primary)'
            : props.$isActive
                ? 'var(--accent-primary)'
                : 'var(--text-muted)'};
        transition: color var(--transition-fast);
    }

    &:hover {
        background: var(--glass-bg-hover);
        color: var(--text-primary);

        svg {
            color: ${props => props.$isAddChannel
                ? 'var(--accent-primary)'
                : 'var(--text-primary)'};
        }
    }

    ${props => props.$isAddChannel && `
        color: var(--accent-primary);
        font-weight: 500;

        &:hover {
            color: var(--accent-primary);
        }
    `}
`;

const OptionTitle = styled.span`
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const LockIndicator = styled.span`
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.5;
    transition: opacity var(--transition-fast);

    svg {
        font-size: 0.9rem !important;
        color: var(--text-muted) !important;
    }

    ${OptionContainer}:hover & {
        opacity: 0.8;
    }
`;

const LockToggleButton = styled.button<{ $isLocked: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border: none;
    background: transparent;
    border-radius: var(--radius-sm);
    cursor: pointer;
    opacity: 0.6;
    transition: all var(--transition-fast);

    svg {
        font-size: 0.9rem !important;
        color: ${({ $isLocked }) => $isLocked ? 'var(--accent-warning)' : 'var(--text-muted)'} !important;
    }

    &:hover {
        opacity: 1;
        background: var(--glass-bg);

        svg {
            color: ${({ $isLocked }) => $isLocked ? 'var(--accent-success)' : 'var(--accent-warning)'} !important;
        }
    }

    &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    ${OptionContainer}:hover & {
        opacity: 0.8;
    }
`;

const ActiveIndicator = styled.span`
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 60%;
    background: var(--accent-primary);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
`;
