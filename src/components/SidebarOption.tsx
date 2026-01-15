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
import GroupsIcon from '@mui/icons-material/Groups';
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

    // Get initials from group name
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || '#';
    };

    return (
        <OptionContainer
            onClick={handleClick}
            $isActive={!!isActive}
            $isAddChannel={!!addChannelOption}
        >
            <GroupAvatar $isActive={!!isActive}>
                {getInitials(title)}
            </GroupAvatar>
            <OptionInfo>
                <OptionTitle>{title}</OptionTitle>
                <OptionSubtitle>
                    {hasPassword ? 'Private group' : 'Public group'}
                </OptionSubtitle>
            </OptionInfo>
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
        </OptionContainer>
    );
};

export default SidebarOption;

// Styled Components
const OptionContainer = styled.div<{ $isActive?: boolean; $isAddChannel?: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    margin: 2px 0;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: ${props => props.$isActive
        ? 'linear-gradient(135deg, #F0EBFF 0%, #E8E0FF 100%)'
        : 'white'};
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    border: 1px solid ${props => props.$isActive ? '#6338F6' : 'transparent'};

    &:hover {
        background: linear-gradient(135deg, #FAFBFC 0%, #F0EBFF 100%);
        transform: translateX(4px);
        border-color: #6338F6;
    }

    &:active {
        transform: scale(0.98);
    }

    ${props => props.$isAddChannel && `
        background: linear-gradient(135deg, var(--purple-50) 0%, rgba(124, 58, 237, 0.1) 100%);
        border: 1px dashed var(--purple-200);

        &:hover {
            background: var(--purple-100);
            border-style: solid;
        }
    `}
`;

const GroupAvatar = styled.div<{ $isActive?: boolean }>`
    width: 36px;
    height: 36px;
    border-radius: var(--radius-full);
    background: ${props => props.$isActive
        ? 'linear-gradient(135deg, #6338F6 0%, #855CFF 100%)'
        : 'linear-gradient(135deg, #60CBFF 0%, #6338F6 100%)'};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 0.75rem;
    font-weight: 700;
    color: white;
    text-transform: uppercase;
`;

const OptionInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const OptionTitle = styled.div`
    font-size: 0.85rem;
    font-weight: 600;
    color: #6338F6;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.2;
`;

const OptionSubtitle = styled.div`
    font-size: 0.7rem;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.2;
`;

const LockIndicator = styled.span`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    background: rgba(255, 193, 7, 0.1);

    svg {
        font-size: 0.8rem !important;
        color: #FFC107 !important;
    }
`;

const LockToggleButton = styled.button<{ $isLocked: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    background: ${({ $isLocked }) => $isLocked ? 'rgba(255, 193, 7, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: all 0.2s ease;

    svg {
        font-size: 0.8rem !important;
        color: ${({ $isLocked }) => $isLocked ? '#FFC107' : 'var(--text-muted)'} !important;
    }

    &:hover {
        background: ${({ $isLocked }) => $isLocked ? 'rgba(12, 198, 140, 0.1)' : 'rgba(255, 193, 7, 0.1)'};

        svg {
            color: ${({ $isLocked }) => $isLocked ? '#0CC68C' : '#FFC107'} !important;
        }
    }

    &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }
`;
