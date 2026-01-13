import React from 'react';
import styled from 'styled-components';
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
        // Note: Actual theme switching would require CSS variable updates
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
                <Title>
                    <SettingsIcon />
                    Settings
                </Title>
                <CloseButton onClick={handleClose}>
                    <CloseIcon />
                </CloseButton>
            </Header>

            <SettingsContent>
                <Section>
                    <SectionTitle>Appearance</SectionTitle>

                    <SettingItem onClick={toggleTheme}>
                        <SettingIcon $active={settings.theme === 'dark'}>
                            {settings.theme === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
                        </SettingIcon>
                        <SettingInfo>
                            <SettingName>Theme</SettingName>
                            <SettingDescription>
                                {settings.theme === 'dark' ? 'Dark mode' : 'Light mode'}
                            </SettingDescription>
                        </SettingInfo>
                        <Toggle $active={settings.theme === 'dark'}>
                            <ToggleKnob $active={settings.theme === 'dark'} />
                        </Toggle>
                    </SettingItem>

                    <SettingItem onClick={toggleCompactMode}>
                        <SettingIcon $active={settings.compactMode}>
                            {settings.compactMode ? <ViewCompactIcon /> : <ViewAgendaIcon />}
                        </SettingIcon>
                        <SettingInfo>
                            <SettingName>Compact Mode</SettingName>
                            <SettingDescription>
                                {settings.compactMode ? 'Smaller message spacing' : 'Normal spacing'}
                            </SettingDescription>
                        </SettingInfo>
                        <Toggle $active={settings.compactMode}>
                            <ToggleKnob $active={settings.compactMode} />
                        </Toggle>
                    </SettingItem>
                </Section>

                <Section>
                    <SectionTitle>Notifications</SectionTitle>

                    <SettingItem onClick={toggleNotifications}>
                        <SettingIcon $active={settings.notifications}>
                            {settings.notifications ? <NotificationsIcon /> : <NotificationsOffIcon />}
                        </SettingIcon>
                        <SettingInfo>
                            <SettingName>Push Notifications</SettingName>
                            <SettingDescription>
                                {settings.notifications ? 'Enabled' : 'Disabled'}
                            </SettingDescription>
                        </SettingInfo>
                        <Toggle $active={settings.notifications}>
                            <ToggleKnob $active={settings.notifications} />
                        </Toggle>
                    </SettingItem>

                    <SettingItem onClick={toggleSound}>
                        <SettingIcon $active={settings.soundEnabled}>
                            {settings.soundEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
                        </SettingIcon>
                        <SettingInfo>
                            <SettingName>Sound Effects</SettingName>
                            <SettingDescription>
                                {settings.soundEnabled ? 'Play sounds for messages' : 'Muted'}
                            </SettingDescription>
                        </SettingInfo>
                        <Toggle $active={settings.soundEnabled}>
                            <ToggleKnob $active={settings.soundEnabled} />
                        </Toggle>
                    </SettingItem>
                </Section>

                <Section>
                    <SectionTitle>About</SectionTitle>
                    <AboutCard>
                        <AboutTitle>Thryve Chat</AboutTitle>
                        <AboutVersion>Version 1.0.0</AboutVersion>
                        <AboutDescription>
                            A modern real-time chat application with audio/video calling.
                        </AboutDescription>
                        <TechStack>
                            <TechBadge>React</TechBadge>
                            <TechBadge>TypeScript</TechBadge>
                            <TechBadge>Firebase</TechBadge>
                            <TechBadge>Agora</TechBadge>
                        </TechStack>
                    </AboutCard>
                </Section>
            </SettingsContent>
        </Container>
    );
};

export default SettingsPanel;

const Container = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    height: calc(100vh - var(--header-height));
    margin-top: var(--header-height);
    background: var(--bg-chat);
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--glass-border);
    background: var(--glass-bg);
`;

const Title = styled.h2`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;

    svg {
        color: var(--accent-primary);
    }
`;

const CloseButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    color: var(--text-muted);
    transition: all var(--transition-fast);

    &:hover {
        background: var(--glass-bg-hover);
        color: var(--text-primary);
    }
`;

const SettingsContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-lg);
`;

const Section = styled.div`
    margin-bottom: var(--spacing-xl);
`;

const SectionTitle = styled.h3`
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: var(--spacing-md);
`;

const SettingItem = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
        background: var(--glass-bg-hover);
    }
`;

const SettingIcon = styled.div<{ $active: boolean }>`
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    background: ${(props) => (props.$active ? 'var(--accent-primary)' : 'var(--glass-bg)')};
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);

    svg {
        color: ${(props) => (props.$active ? 'white' : 'var(--text-muted)')};
    }
`;

const SettingInfo = styled.div`
    flex: 1;
`;

const SettingName = styled.div`
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--text-primary);
`;

const SettingDescription = styled.div`
    font-size: 0.8rem;
    color: var(--text-muted);
`;

const Toggle = styled.div<{ $active: boolean }>`
    width: 44px;
    height: 24px;
    border-radius: var(--radius-full);
    background: ${(props) => (props.$active ? 'var(--accent-primary)' : 'var(--glass-border)')};
    padding: 2px;
    transition: all var(--transition-fast);
`;

const ToggleKnob = styled.div<{ $active: boolean }>`
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    transition: all var(--transition-fast);
    transform: translateX(${(props) => (props.$active ? '20px' : '0')});
`;

const AboutCard = styled.div`
    padding: var(--spacing-lg);
    background: var(--glass-bg);
    border-radius: var(--radius-lg);
    border: 1px solid var(--glass-border);
`;

const AboutTitle = styled.h4`
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
`;

const AboutVersion = styled.div`
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-bottom: var(--spacing-md);
`;

const AboutDescription = styled.p`
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin: 0 0 var(--spacing-md) 0;
`;

const TechStack = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
`;

const TechBadge = styled.span`
    font-size: 0.75rem;
    padding: 4px 8px;
    background: var(--accent-primary);
    color: white;
    border-radius: var(--radius-full);
`;
