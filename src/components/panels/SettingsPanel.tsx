import React, { useEffect, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
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
import InfoIcon from '@mui/icons-material/Info';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useDispatch, useSelector } from 'react-redux';
import { setActivePanel, updateSettings, selectSettings } from '../../features/appSlice';
import { useToast } from '../../context/ToastContext';

const SettingsPanel: React.FC = () => {
    const dispatch = useDispatch();
    const settings = useSelector(selectSettings);
    const { showToast } = useToast();

    // Collapsible sections state - all expanded by default
    const [expandedSections, setExpandedSections] = useState({
        appearance: true,
        notifications: true,
        about: false,
    });

    // Apply theme to document when settings change
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', settings.theme);
        localStorage.setItem('theme', settings.theme);
    }, [settings.theme]);

    const handleClose = () => {
        dispatch(setActivePanel('none'));
    };

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const toggleTheme = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
        dispatch(updateSettings({ theme: newTheme }));
        showToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode`, 'success');
    };

    const toggleNotifications = (e: React.MouseEvent) => {
        e.stopPropagation();
        dispatch(updateSettings({ notifications: !settings.notifications }));
        showToast(settings.notifications ? 'Notifications off' : 'Notifications on', 'info');
    };

    const toggleSound = (e: React.MouseEvent) => {
        e.stopPropagation();
        dispatch(updateSettings({ soundEnabled: !settings.soundEnabled }));
        showToast(settings.soundEnabled ? 'Sound off' : 'Sound on', 'info');
    };

    const toggleCompactMode = (e: React.MouseEvent) => {
        e.stopPropagation();
        dispatch(updateSettings({ compactMode: !settings.compactMode }));
        showToast(settings.compactMode ? 'Normal mode' : 'Compact mode', 'info');
    };

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <LogoIcon>
                        <SettingsIcon />
                    </LogoIcon>
                    <HeaderTitle>Settings</HeaderTitle>
                </HeaderLeft>
                <CloseButton onClick={handleClose}>
                    <CloseIcon />
                </CloseButton>
            </Header>

            <SettingsContent>
                {/* Appearance Section */}
                <Section>
                    <SectionHeader onClick={() => toggleSection('appearance')}>
                        <SectionLeft>
                            <SectionIcon><ColorLensIcon /></SectionIcon>
                            <SectionTitle>Appearance</SectionTitle>
                        </SectionLeft>
                        <ChevronIcon $expanded={expandedSections.appearance}>
                            <ExpandMoreIcon />
                        </ChevronIcon>
                    </SectionHeader>

                    <SectionContent $expanded={expandedSections.appearance}>
                        <SettingsGrid>
                            <SettingCard onClick={toggleTheme}>
                                <SettingIconBox $active={settings.theme === 'dark'}>
                                    {settings.theme === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
                                </SettingIconBox>
                                <SettingLabel>
                                    {settings.theme === 'dark' ? 'Dark' : 'Light'}
                                </SettingLabel>
                                <MiniToggle $active={settings.theme === 'dark'} />
                            </SettingCard>

                            <SettingCard onClick={toggleCompactMode}>
                                <SettingIconBox $active={settings.compactMode}>
                                    {settings.compactMode ? <ViewCompactIcon /> : <ViewAgendaIcon />}
                                </SettingIconBox>
                                <SettingLabel>Compact</SettingLabel>
                                <MiniToggle $active={settings.compactMode} />
                            </SettingCard>
                        </SettingsGrid>
                    </SectionContent>
                </Section>

                {/* Notifications Section */}
                <Section>
                    <SectionHeader onClick={() => toggleSection('notifications')}>
                        <SectionLeft>
                            <SectionIcon><NotificationsIcon /></SectionIcon>
                            <SectionTitle>Notifications</SectionTitle>
                        </SectionLeft>
                        <ChevronIcon $expanded={expandedSections.notifications}>
                            <ExpandMoreIcon />
                        </ChevronIcon>
                    </SectionHeader>

                    <SectionContent $expanded={expandedSections.notifications}>
                        <SettingsGrid>
                            <SettingCard onClick={toggleNotifications}>
                                <SettingIconBox $active={settings.notifications}>
                                    {settings.notifications ? <NotificationsIcon /> : <NotificationsOffIcon />}
                                </SettingIconBox>
                                <SettingLabel>Push</SettingLabel>
                                <MiniToggle $active={settings.notifications} />
                            </SettingCard>

                            <SettingCard onClick={toggleSound}>
                                <SettingIconBox $active={settings.soundEnabled}>
                                    {settings.soundEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
                                </SettingIconBox>
                                <SettingLabel>Sound</SettingLabel>
                                <MiniToggle $active={settings.soundEnabled} />
                            </SettingCard>
                        </SettingsGrid>
                    </SectionContent>
                </Section>

                {/* About Section */}
                <Section>
                    <SectionHeader onClick={() => toggleSection('about')}>
                        <SectionLeft>
                            <SectionIcon><InfoIcon /></SectionIcon>
                            <SectionTitle>About</SectionTitle>
                        </SectionLeft>
                        <ChevronIcon $expanded={expandedSections.about}>
                            <ExpandMoreIcon />
                        </ChevronIcon>
                    </SectionHeader>

                    <SectionContent $expanded={expandedSections.about}>
                        <AboutRow>
                            <AppLogo>TC</AppLogo>
                            <AppInfo>
                                <AppName>Thryve Chat</AppName>
                                <AppVersion>v1.0.0</AppVersion>
                            </AppInfo>
                        </AboutRow>
                        <TechStack>
                            <TechBadge $color="#61DAFB">React</TechBadge>
                            <TechBadge $color="#3178C6">TS</TechBadge>
                            <TechBadge $color="#FFCA28">Firebase</TechBadge>
                            <TechBadge $color="#099DFD">Agora</TechBadge>
                        </TechStack>
                    </SectionContent>
                </Section>
            </SettingsContent>
        </Container>
    );
};

export default SettingsPanel;

// Animations
const fadeIn = keyframes`
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
`;

const gradientShift = keyframes`
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
`;

// Styled Components
const Container = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    height: calc(100vh - var(--header-height));
    margin-top: var(--header-height);
    background: linear-gradient(135deg, #0F0F1A 0%, #1A1A2E 100%);
    position: relative;
    overflow: hidden;

    @media (max-width: 768px) {
        height: calc(100vh - var(--header-height) - var(--bottom-nav-height, 70px));
    }
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
    background-size: 200% 200%;
    animation: ${gradientShift} 8s ease infinite;
    flex-shrink: 0;
`;

const HeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const LogoIcon = styled.div`
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
        font-size: 1.3rem;
        color: white;
    }
`;

const HeaderTitle = styled.h2`
    font-size: 1.3rem;
    font-weight: 700;
    color: white;
    margin: 0;
`;

const CloseButton = styled.button`
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.15);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    svg { font-size: 1.2rem; }

    &:hover {
        background: rgba(255, 255, 255, 0.25);
        transform: rotate(90deg);
    }
`;

const SettingsContent = styled.div`
    flex: 1;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
`;

const Section = styled.div`
    background: rgba(30, 30, 58, 0.5);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    overflow: hidden;
    animation: ${fadeIn} 0.3s ease-out;
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    cursor: pointer;
    transition: background 0.2s ease;

    &:hover {
        background: rgba(139, 92, 246, 0.1);
    }
`;

const SectionLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const SectionIcon = styled.div`
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%);
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
        font-size: 1rem;
        color: #8B5CF6;
    }
`;

const SectionTitle = styled.h3`
    font-size: 0.95rem;
    font-weight: 600;
    color: white;
    margin: 0;
`;

const ChevronIcon = styled.div<{ $expanded: boolean }>`
    color: rgba(255, 255, 255, 0.5);
    transition: transform 0.3s ease;
    transform: rotate(${props => props.$expanded ? '180deg' : '0deg'});

    svg { font-size: 1.3rem; }
`;

const SectionContent = styled.div<{ $expanded: boolean }>`
    max-height: ${props => props.$expanded ? '200px' : '0'};
    opacity: ${props => props.$expanded ? 1 : 0};
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    padding: ${props => props.$expanded ? '0 16px 16px' : '0 16px'};
`;

const SettingsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
`;

const SettingCard = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 14px 10px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(139, 92, 246, 0.1);
        border-color: rgba(139, 92, 246, 0.3);
        transform: translateY(-2px);
    }

    &:active {
        transform: scale(0.98);
    }
`;

const SettingIconBox = styled.div<{ $active: boolean }>`
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: ${props => props.$active
        ? 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)'
        : 'rgba(255, 255, 255, 0.05)'
    };
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    box-shadow: ${props => props.$active
        ? '0 4px 15px rgba(139, 92, 246, 0.4)'
        : 'none'};

    svg {
        font-size: 1.2rem;
        color: ${props => props.$active ? 'white' : 'rgba(255, 255, 255, 0.5)'};
    }
`;

const SettingLabel = styled.span`
    font-size: 0.8rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.8);
`;

const MiniToggle = styled.div<{ $active: boolean }>`
    width: 32px;
    height: 6px;
    border-radius: 3px;
    background: ${props => props.$active
        ? 'linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%)'
        : 'rgba(255, 255, 255, 0.15)'
    };
    transition: all 0.2s ease;
    box-shadow: ${props => props.$active
        ? '0 0 10px rgba(139, 92, 246, 0.5)'
        : 'none'};
`;

const AboutRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
`;

const AppLogo = styled.div`
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    font-weight: 800;
    color: white;
    box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
`;

const AppInfo = styled.div``;

const AppName = styled.h4`
    font-size: 1rem;
    font-weight: 700;
    color: white;
    margin: 0 0 2px 0;
`;

const AppVersion = styled.span`
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
`;

const TechStack = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const TechBadge = styled.span<{ $color: string }>`
    font-size: 0.7rem;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 12px;
    background: ${props => props.$color}20;
    color: ${props => props.$color};
    border: 1px solid ${props => props.$color}40;
`;
