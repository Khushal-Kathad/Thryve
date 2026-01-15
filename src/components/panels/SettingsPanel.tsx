import React from 'react';
import styled, { keyframes } from 'styled-components';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import ViewCompactIcon from '@mui/icons-material/ViewCompact';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import SecurityIcon from '@mui/icons-material/Security';
import InfoIcon from '@mui/icons-material/Info';
import { useDispatch, useSelector } from 'react-redux';
import { setActivePanel, updateSettings, selectSettings } from '../../features/appSlice';
import { useToast } from '../../context/ToastContext';

const SettingsPanel: React.FC = () => {
    const dispatch = useDispatch();
    const settings = useSelector(selectSettings);
    const { showToast } = useToast();

    const handleClose = () => {
        dispatch(setActivePanel('none'));
    };

    const toggleTheme = () => {
        const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
        dispatch(updateSettings({ theme: newTheme }));
        showToast(`Theme changed to ${newTheme} mode`, 'success');
    };

    const toggleNotifications = () => {
        dispatch(updateSettings({ notifications: !settings.notifications }));
        showToast(
            settings.notifications ? 'Notifications disabled' : 'Notifications enabled',
            'info'
        );
    };

    const toggleSound = () => {
        dispatch(updateSettings({ soundEnabled: !settings.soundEnabled }));
        showToast(
            settings.soundEnabled ? 'Sound disabled' : 'Sound enabled',
            'info'
        );
    };

    const toggleCompactMode = () => {
        dispatch(updateSettings({ compactMode: !settings.compactMode }));
        showToast(
            settings.compactMode ? 'Compact mode disabled' : 'Compact mode enabled',
            'info'
        );
    };

    return (
        <Container>
            <Header>
                <HeaderContent>
                    <IconWrapper>
                        <SettingsIcon />
                    </IconWrapper>
                    <HeaderText>
                        <Title>Settings</Title>
                        <Subtitle>Customize your experience</Subtitle>
                    </HeaderText>
                </HeaderContent>
                <CloseButton onClick={handleClose}>
                    <CloseIcon />
                </CloseButton>
            </Header>

            <SettingsContent>
                <SectionCard>
                    <SectionHeader>
                        <SectionIcon><ColorLensIcon /></SectionIcon>
                        <SectionTitle>Appearance</SectionTitle>
                    </SectionHeader>

                    <SettingItem onClick={toggleTheme}>
                        <SettingLeft>
                            <SettingIconBox $active={settings.theme === 'dark'}>
                                {settings.theme === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
                            </SettingIconBox>
                            <SettingInfo>
                                <SettingName>Theme</SettingName>
                                <SettingDescription>
                                    {settings.theme === 'dark' ? 'Dark mode enabled' : 'Light mode enabled'}
                                </SettingDescription>
                            </SettingInfo>
                        </SettingLeft>
                        <Toggle $active={settings.theme === 'dark'}>
                            <ToggleKnob $active={settings.theme === 'dark'} />
                        </Toggle>
                    </SettingItem>

                    <SettingItem onClick={toggleCompactMode}>
                        <SettingLeft>
                            <SettingIconBox $active={settings.compactMode}>
                                {settings.compactMode ? <ViewCompactIcon /> : <ViewAgendaIcon />}
                            </SettingIconBox>
                            <SettingInfo>
                                <SettingName>Compact Mode</SettingName>
                                <SettingDescription>
                                    {settings.compactMode ? 'Smaller message spacing' : 'Normal spacing'}
                                </SettingDescription>
                            </SettingInfo>
                        </SettingLeft>
                        <Toggle $active={settings.compactMode}>
                            <ToggleKnob $active={settings.compactMode} />
                        </Toggle>
                    </SettingItem>
                </SectionCard>

                <SectionCard>
                    <SectionHeader>
                        <SectionIcon><NotificationsIcon /></SectionIcon>
                        <SectionTitle>Notifications</SectionTitle>
                    </SectionHeader>

                    <SettingItem onClick={toggleNotifications}>
                        <SettingLeft>
                            <SettingIconBox $active={settings.notifications}>
                                {settings.notifications ? <NotificationsIcon /> : <NotificationsOffIcon />}
                            </SettingIconBox>
                            <SettingInfo>
                                <SettingName>Push Notifications</SettingName>
                                <SettingDescription>
                                    {settings.notifications ? 'Get notified of new messages' : 'Notifications are off'}
                                </SettingDescription>
                            </SettingInfo>
                        </SettingLeft>
                        <Toggle $active={settings.notifications}>
                            <ToggleKnob $active={settings.notifications} />
                        </Toggle>
                    </SettingItem>

                    <SettingItem onClick={toggleSound}>
                        <SettingLeft>
                            <SettingIconBox $active={settings.soundEnabled}>
                                {settings.soundEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
                            </SettingIconBox>
                            <SettingInfo>
                                <SettingName>Sound Effects</SettingName>
                                <SettingDescription>
                                    {settings.soundEnabled ? 'Play sounds for messages' : 'Sounds are muted'}
                                </SettingDescription>
                            </SettingInfo>
                        </SettingLeft>
                        <Toggle $active={settings.soundEnabled}>
                            <ToggleKnob $active={settings.soundEnabled} />
                        </Toggle>
                    </SettingItem>
                </SectionCard>

                <SectionCard>
                    <SectionHeader>
                        <SectionIcon><InfoIcon /></SectionIcon>
                        <SectionTitle>About</SectionTitle>
                    </SectionHeader>

                    <AboutCard>
                        <AppLogo>
                            <LogoGradient>TC</LogoGradient>
                        </AppLogo>
                        <AppInfo>
                            <AppName>Thryve Chat</AppName>
                            <AppVersion>Version 1.0.0</AppVersion>
                        </AppInfo>
                    </AboutCard>

                    <AboutDescription>
                        A modern real-time chat application with audio/video calling capabilities.
                    </AboutDescription>

                    <TechStack>
                        <TechBadge $variant="react">React</TechBadge>
                        <TechBadge $variant="typescript">TypeScript</TechBadge>
                        <TechBadge $variant="firebase">Firebase</TechBadge>
                        <TechBadge $variant="agora">Agora</TechBadge>
                    </TechStack>
                </SectionCard>
            </SettingsContent>
        </Container>
    );
};

export default SettingsPanel;

const fadeIn = keyframes`
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
`;

const Container = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    height: calc(100vh - var(--header-height));
    margin-top: var(--header-height);
    background: linear-gradient(180deg, #FAFBFC 0%, #F0F2F5 100%);
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px;
    background: linear-gradient(135deg, #6338F6 0%, #855CFF 100%);
    color: white;
`;

const HeaderContent = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
`;

const IconWrapper = styled.div`
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.3);

    svg {
        font-size: 1.5rem;
        color: white;
    }
`;

const HeaderText = styled.div``;

const Title = styled.h2`
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
`;

const Subtitle = styled.p`
    font-size: 0.9rem;
    opacity: 0.85;
    margin: 4px 0 0 0;
`;

const CloseButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.15);
    color: white;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(255, 255, 255, 0.25);
        transform: rotate(90deg);
    }
`;

const SettingsContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const SectionCard = styled.div`
    background: white;
    border-radius: 20px;
    padding: 20px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
    animation: ${fadeIn} 0.4s ease-out;
    animation-fill-mode: backwards;

    &:nth-child(1) { animation-delay: 0.1s; }
    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.3s; }
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 2px solid #F0F2F5;
`;

const SectionIcon = styled.div`
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: linear-gradient(135deg, #F0EBFF 0%, #E8E0FF 100%);
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
        font-size: 1.1rem;
        color: #6338F6;
    }
`;

const SectionTitle = styled.h3`
    font-size: 1rem;
    font-weight: 700;
    color: #141B27;
    margin: 0;
`;

const SettingItem = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 8px;
    background: #FAFBFC;
    border: 2px solid transparent;

    &:last-child {
        margin-bottom: 0;
    }

    &:hover {
        background: linear-gradient(135deg, #F0EBFF 0%, #FAFBFC 100%);
        border-color: #6338F6;
        transform: translateX(4px);
    }
`;

const SettingLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
`;

const SettingIconBox = styled.div<{ $active: boolean }>`
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: ${props => props.$active
        ? 'linear-gradient(135deg, #6338F6 0%, #855CFF 100%)'
        : 'linear-gradient(135deg, #F0EBFF 0%, #E8E0FF 100%)'
    };
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    box-shadow: ${props => props.$active ? '0 4px 12px rgba(99, 56, 246, 0.3)' : 'none'};

    svg {
        color: ${props => props.$active ? 'white' : '#6338F6'};
        font-size: 1.3rem;
    }
`;

const SettingInfo = styled.div``;

const SettingName = styled.div`
    font-size: 0.95rem;
    font-weight: 600;
    color: #141B27;
    margin-bottom: 2px;
`;

const SettingDescription = styled.div`
    font-size: 0.8rem;
    color: #72767D;
`;

const Toggle = styled.div<{ $active: boolean }>`
    width: 52px;
    height: 28px;
    border-radius: 14px;
    background: ${props => props.$active
        ? 'linear-gradient(135deg, #6338F6 0%, #855CFF 100%)'
        : '#E8E8E9'
    };
    padding: 3px;
    transition: all 0.2s ease;
    box-shadow: ${props => props.$active ? '0 2px 8px rgba(99, 56, 246, 0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'};
`;

const ToggleKnob = styled.div<{ $active: boolean }>`
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
    transition: all 0.2s ease;
    transform: translateX(${props => props.$active ? '24px' : '0'});
`;

const AboutCard = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: linear-gradient(135deg, #F0EBFF 0%, #E8E0FF 100%);
    border-radius: 14px;
    margin-bottom: 16px;
`;

const AppLogo = styled.div`
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: linear-gradient(135deg, #6338F6 0%, #855CFF 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 24px rgba(99, 56, 246, 0.3);
`;

const LogoGradient = styled.span`
    font-size: 1.4rem;
    font-weight: 800;
    color: white;
`;

const AppInfo = styled.div``;

const AppName = styled.h4`
    font-size: 1.2rem;
    font-weight: 700;
    color: #141B27;
    margin: 0;
`;

const AppVersion = styled.span`
    font-size: 0.85rem;
    color: #6338F6;
    font-weight: 500;
`;

const AboutDescription = styled.p`
    font-size: 0.9rem;
    color: #72767D;
    line-height: 1.6;
    margin: 0 0 16px 0;
`;

const TechStack = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

const TechBadge = styled.span<{ $variant: 'react' | 'typescript' | 'firebase' | 'agora' }>`
    font-size: 0.75rem;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 20px;
    background: ${props => {
        switch (props.$variant) {
            case 'react': return 'linear-gradient(135deg, #61DAFB 0%, #00C4FF 100%)';
            case 'typescript': return 'linear-gradient(135deg, #3178C6 0%, #235A97 100%)';
            case 'firebase': return 'linear-gradient(135deg, #FFCA28 0%, #FFA000 100%)';
            case 'agora': return 'linear-gradient(135deg, #099DFD 0%, #0066CC 100%)';
        }
    }};
    color: ${props => props.$variant === 'firebase' ? '#333' : 'white'};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;
