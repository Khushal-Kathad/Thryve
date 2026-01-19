import React, { useState, MouseEvent } from 'react';
import styled, { keyframes } from 'styled-components';
import { provider } from '../firebase';
import { getAuth, signInWithPopup, AuthError } from "firebase/auth";
import GoogleIcon from '@mui/icons-material/Google';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import GroupsIcon from '@mui/icons-material/Groups';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import SecurityIcon from '@mui/icons-material/Security';
import { useToast } from '../context/ToastContext';

const getErrorMessage = (errorCode: string): string => {
    const errorMessages: Record<string, string> = {
        'auth/popup-closed-by-user': 'Sign-in was cancelled. Please try again.',
        'auth/popup-blocked': 'Pop-up was blocked. Please allow pop-ups for this site.',
        'auth/network-request-failed': 'Network error. Please check your connection.',
        'auth/cancelled-popup-request': 'Another sign-in attempt is in progress.',
        'auth/account-exists-with-different-credential': 'An account already exists with this email.',
    };
    return errorMessages[errorCode] || 'Sign-in failed. Please try again.';
};

const Login: React.FC = () => {
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const signIn = (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (isLoading) return;

        setIsLoading(true);
        const auth = getAuth();
        signInWithPopup(auth, provider)
            .then(() => {
                // Authentication successful - useAuthState will handle the state update
            })
            .catch((error: AuthError) => {
                console.error('Login error:', error.message);
                showToast(getErrorMessage(error.code), 'error');
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    return (
        <LoginContainer>
            <BackgroundPattern>
                <PatternCircle className="circle1" />
                <PatternCircle className="circle2" />
                <PatternCircle className="circle3" />
                <PatternDot className="dots1" />
                <PatternDot className="dots2" />
            </BackgroundPattern>

            {/* Desktop Left Panel - Branding & Features */}
            <LeftPanel>
                <DesktopBranding>
                    <DesktopLogoWrapper>
                        <ChatBubbleOutlineIcon />
                    </DesktopLogoWrapper>
                    <DesktopTitle>Thryve</DesktopTitle>
                    <DesktopSubtitle>
                        Connect with your team in real-time. Collaborate seamlessly. Create together.
                    </DesktopSubtitle>

                    <DesktopFeatures>
                        <DesktopFeatureItem>
                            <DesktopFeatureIcon>
                                <ChatBubbleOutlineIcon />
                            </DesktopFeatureIcon>
                            <DesktopFeatureText>
                                <h4>Real-time Messaging</h4>
                                <p>Instant chat with rich media support</p>
                            </DesktopFeatureText>
                        </DesktopFeatureItem>

                        <DesktopFeatureItem>
                            <DesktopFeatureIcon>
                                <VideocamOutlinedIcon />
                            </DesktopFeatureIcon>
                            <DesktopFeatureText>
                                <h4>HD Video Calls</h4>
                                <p>Crystal clear video and voice calls</p>
                            </DesktopFeatureText>
                        </DesktopFeatureItem>

                        <DesktopFeatureItem>
                            <DesktopFeatureIcon>
                                <GroupsIcon />
                            </DesktopFeatureIcon>
                            <DesktopFeatureText>
                                <h4>Group Channels</h4>
                                <p>Public and private team spaces</p>
                            </DesktopFeatureText>
                        </DesktopFeatureItem>
                    </DesktopFeatures>
                </DesktopBranding>
            </LeftPanel>

            {/* Right Panel - Login Form */}
            <RightPanel>
                <LoginContent>
                    {/* Mobile/Tablet Branding - Hidden on Desktop */}
                    <BrandingSection>
                        <LogoWrapper>
                            <ChatBubbleOutlineIcon />
                        </LogoWrapper>
                        <AppTitle>Thryve</AppTitle>
                        <AppSubtitle>Connect. Collaborate. Create.</AppSubtitle>
                    </BrandingSection>

                    <LoginCard>
                        <CardHeader>
                            <WelcomeTitle>Welcome Back</WelcomeTitle>
                            <WelcomeSubtitle>Sign in to continue to your workspace</WelcomeSubtitle>
                        </CardHeader>

                        <GoogleButton onClick={signIn} disabled={isLoading}>
                            <GoogleIconWrapper>
                                <GoogleIcon />
                            </GoogleIconWrapper>
                            <ButtonText>{isLoading ? 'Signing in...' : 'Continue with Google'}</ButtonText>
                            {isLoading && <LoadingSpinner />}
                        </GoogleButton>

                        <SecurityNote>
                            <SecurityIcon />
                            <span>Secured with Google Authentication</span>
                        </SecurityNote>
                    </LoginCard>

                    {/* Mobile/Tablet Features Grid - Hidden on Desktop */}
                    <FeaturesGrid>
                        <FeatureCard>
                            <FeatureIconWrapper>
                                <ChatBubbleOutlineIcon />
                            </FeatureIconWrapper>
                            <FeatureTitle>Real-time Chat</FeatureTitle>
                            <FeatureDescription>Instant messaging with your team</FeatureDescription>
                        </FeatureCard>

                        <FeatureCard>
                            <FeatureIconWrapper>
                                <VideocamOutlinedIcon />
                            </FeatureIconWrapper>
                            <FeatureTitle>Video Calls</FeatureTitle>
                            <FeatureDescription>HD video & voice calls</FeatureDescription>
                        </FeatureCard>

                        <FeatureCard>
                            <FeatureIconWrapper>
                                <GroupsIcon />
                            </FeatureIconWrapper>
                            <FeatureTitle>Group Channels</FeatureTitle>
                            <FeatureDescription>Create public & private groups</FeatureDescription>
                        </FeatureCard>
                    </FeaturesGrid>

                    <Footer>
                        <FooterText>Built with React & Firebase</FooterText>
                    </Footer>
                </LoginContent>
            </RightPanel>
        </LoginContainer>
    );
};

export default Login;

// Animations
const float = keyframes`
    0%, 100% {
        transform: translateY(0) rotate(0deg);
    }
    50% {
        transform: translateY(-30px) rotate(5deg);
    }
`;

const float2 = keyframes`
    0%, 100% {
        transform: translateY(0) rotate(0deg);
    }
    50% {
        transform: translateY(-20px) rotate(-5deg);
    }
`;

const pulse = keyframes`
    0%, 100% {
        opacity: 0.4;
        transform: scale(1);
    }
    50% {
        opacity: 0.8;
        transform: scale(1.1);
    }
`;

const glow = keyframes`
    0%, 100% {
        box-shadow: 0 0 40px rgba(139, 92, 246, 0.5), 0 0 80px rgba(236, 72, 153, 0.3);
    }
    50% {
        box-shadow: 0 0 60px rgba(139, 92, 246, 0.7), 0 0 120px rgba(236, 72, 153, 0.5);
    }
`;

const fadeInUp = keyframes`
    from {
        opacity: 0;
        transform: translateY(40px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

const spin = keyframes`
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
`;

const shimmer = keyframes`
    0% {
        background-position: -200% 0;
    }
    100% {
        background-position: 200% 0;
    }
`;

const gradientShift = keyframes`
    0% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
    100% {
        background-position: 0% 50%;
    }
`;

const twinkle = keyframes`
    0%, 100% {
        opacity: 0.3;
        transform: scale(1);
    }
    50% {
        opacity: 1;
        transform: scale(1.5);
    }
`;

// Styled Components
const LoginContainer = styled.div`
    min-height: 100vh;
    display: flex;
    background: linear-gradient(135deg, #0F0F1A 0%, #1A1A2E 50%, #0F0F1A 100%);
    position: relative;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background:
            radial-gradient(circle at 20% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(236, 72, 153, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.1) 0%, transparent 50%);
        pointer-events: none;
    }

    /* Desktop: Side-by-side layout */
    @media (min-width: 1024px) {
        flex-direction: row;
    }

    /* Mobile/Tablet: Centered stack */
    @media (max-width: 1023px) {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--spacing-lg);
    }

    @media (max-width: 480px) {
        padding: var(--spacing-md);
    }
`;

const LeftPanel = styled.div`
    display: none;

    @media (min-width: 1024px) {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        width: 50%;
        min-height: 100vh;
        padding: 60px;
        background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%);
        position: relative;
        overflow: hidden;

        &::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 50%);
            animation: ${pulse} 8s ease-in-out infinite;
        }
    }

    @media (min-width: 1280px) {
        padding: 80px;
    }
`;

const RightPanel = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xl);

    @media (min-width: 1024px) {
        width: 50%;
        min-height: 100vh;
        padding: 60px;
    }

    @media (min-width: 1280px) {
        padding: 80px;
    }
`;

const DesktopBranding = styled.div`
    text-align: center;
    max-width: 500px;
    z-index: 1;
`;

const DesktopLogoWrapper = styled.div`
    width: 120px;
    height: 120px;
    border-radius: 32px;
    background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #06B6D4 100%);
    background-size: 200% 200%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto var(--spacing-xl);
    animation: ${float} 6s ease-in-out infinite, ${glow} 3s ease-in-out infinite, ${gradientShift} 8s ease infinite;
    position: relative;

    &::before {
        content: '';
        position: absolute;
        inset: -4px;
        border-radius: 36px;
        background: linear-gradient(135deg, #8B5CF6, #EC4899, #06B6D4, #8B5CF6);
        background-size: 400% 400%;
        animation: ${gradientShift} 4s ease infinite;
        z-index: -1;
        filter: blur(20px);
        opacity: 0.7;
    }

    svg {
        font-size: 60px;
        color: white;
        filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.5));
    }
`;

const DesktopTitle = styled.h1`
    font-size: 4rem;
    font-weight: 800;
    background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #06B6D4 100%);
    background-size: 200% 200%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: var(--spacing-md);
    letter-spacing: -2px;
    animation: ${gradientShift} 6s ease infinite;

    @media (min-width: 1280px) {
        font-size: 5rem;
    }
`;

const DesktopSubtitle = styled.p`
    color: rgba(255, 255, 255, 0.8);
    font-size: 1.4rem;
    font-weight: 500;
    letter-spacing: 0.5px;
    margin-bottom: var(--spacing-xl);
    line-height: 1.6;

    @media (min-width: 1280px) {
        font-size: 1.6rem;
    }
`;

const DesktopFeatures = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    margin-top: var(--spacing-xl);
`;

const DesktopFeatureItem = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
    padding: var(--spacing-lg) var(--spacing-xl);
    background: rgba(30, 30, 58, 0.5);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    transition: all 0.3s ease;

    &:hover {
        transform: translateX(10px);
        border-color: rgba(139, 92, 246, 0.5);
        box-shadow: 0 8px 32px rgba(139, 92, 246, 0.2);
    }
`;

const DesktopFeatureIcon = styled.div`
    width: 56px;
    height: 56px;
    border-radius: 14px;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(236, 72, 153, 0.3) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    svg {
        font-size: 1.8rem;
        color: #8B5CF6;
    }

    ${DesktopFeatureItem}:hover & {
        background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);

        svg {
            color: white;
        }
    }
`;

const DesktopFeatureText = styled.div`
    h4 {
        font-size: 1.1rem;
        font-weight: 600;
        color: white;
        margin-bottom: 4px;
    }

    p {
        font-size: 0.95rem;
        color: rgba(255, 255, 255, 0.6);
    }
`;

const BackgroundPattern = styled.div`
    position: absolute;
    inset: 0;
    overflow: hidden;
    z-index: 0;
`;

const PatternCircle = styled.div`
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);

    &.circle1 {
        width: 500px;
        height: 500px;
        top: -150px;
        right: -150px;
        background: linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(236, 72, 153, 0.3) 100%);
        animation: ${pulse} 8s ease-in-out infinite, ${float} 12s ease-in-out infinite;
    }

    &.circle2 {
        width: 400px;
        height: 400px;
        bottom: -100px;
        left: -100px;
        background: linear-gradient(135deg, rgba(236, 72, 153, 0.3) 0%, rgba(6, 182, 212, 0.4) 100%);
        animation: ${pulse} 6s ease-in-out infinite, ${float2} 10s ease-in-out infinite;
        animation-delay: -2s;
    }

    &.circle3 {
        width: 300px;
        height: 300px;
        top: 40%;
        left: 5%;
        background: linear-gradient(135deg, rgba(6, 182, 212, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%);
        animation: ${float} 15s ease-in-out infinite;
    }
`;

const PatternDot = styled.div`
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: white;

    &.dots1 {
        top: 15%;
        right: 20%;
        animation: ${twinkle} 2s ease-in-out infinite;
        box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
    }

    &.dots2 {
        bottom: 25%;
        left: 15%;
        animation: ${twinkle} 3s ease-in-out infinite;
        animation-delay: -1s;
        box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
    }

    &::before, &::after {
        content: '';
        position: absolute;
        width: 3px;
        height: 3px;
        border-radius: 50%;
        background: white;
        opacity: 0.5;
    }

    &::before {
        top: 100px;
        left: 50px;
        animation: ${twinkle} 2.5s ease-in-out infinite;
        animation-delay: -0.5s;
    }

    &::after {
        top: -80px;
        left: 120px;
        animation: ${twinkle} 3.5s ease-in-out infinite;
        animation-delay: -1.5s;
    }
`;

const LoginContent = styled.div`
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 480px;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);
    animation: ${fadeInUp} 0.6s ease-out;

    @media (min-width: 1024px) {
        max-width: 440px;
    }
`;

const BrandingSection = styled.div`
    text-align: center;

    @media (min-width: 1024px) {
        display: none;
    }
`;

const LogoWrapper = styled.div`
    width: 90px;
    height: 90px;
    border-radius: 24px;
    background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #06B6D4 100%);
    background-size: 200% 200%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto var(--spacing-md);
    animation: ${float} 6s ease-in-out infinite, ${glow} 3s ease-in-out infinite, ${gradientShift} 8s ease infinite;
    position: relative;

    &::before {
        content: '';
        position: absolute;
        inset: -3px;
        border-radius: 27px;
        background: linear-gradient(135deg, #8B5CF6, #EC4899, #06B6D4, #8B5CF6);
        background-size: 400% 400%;
        animation: ${gradientShift} 4s ease infinite;
        z-index: -1;
        filter: blur(15px);
        opacity: 0.7;
    }

    svg {
        font-size: 44px;
        color: white;
        filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.5));
    }

    @media (max-width: 480px) {
        width: 72px;
        height: 72px;

        svg {
            font-size: 36px;
        }
    }
`;

const AppTitle = styled.h1`
    font-size: 3rem;
    font-weight: 800;
    background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #06B6D4 100%);
    background-size: 200% 200%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: var(--spacing-xs);
    letter-spacing: -1px;
    animation: ${gradientShift} 6s ease infinite;

    @media (max-width: 480px) {
        font-size: 2.2rem;
    }
`;

const AppSubtitle = styled.p`
    color: rgba(255, 255, 255, 0.7);
    font-size: 1.1rem;
    font-weight: 500;
    letter-spacing: 0.5px;

    @media (max-width: 480px) {
        font-size: 0.95rem;
    }
`;

const LoginCard = styled.div`
    background: rgba(30, 30, 58, 0.6);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    padding: var(--spacing-xl);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3),
                0 0 0 1px rgba(255, 255, 255, 0.05) inset;

    @media (min-width: 1024px) {
        padding: 40px;
        border-radius: 24px;
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4),
                    0 0 0 1px rgba(255, 255, 255, 0.08) inset,
                    0 0 60px rgba(139, 92, 246, 0.15);
    }

    @media (max-width: 480px) {
        padding: var(--spacing-lg);
    }
`;

const CardHeader = styled.div`
    text-align: center;
    margin-bottom: var(--spacing-xl);

    @media (min-width: 1024px) {
        margin-bottom: 32px;
    }
`;

const WelcomeTitle = styled.h2`
    font-size: 1.6rem;
    font-weight: 700;
    color: white;
    margin-bottom: var(--spacing-xs);

    @media (min-width: 1024px) {
        font-size: 2rem;
        background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }

    @media (max-width: 480px) {
        font-size: 1.4rem;
    }
`;

const WelcomeSubtitle = styled.p`
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.95rem;

    @media (min-width: 1024px) {
        font-size: 1.05rem;
    }
`;

const GoogleButton = styled.button`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-md);
    padding: 16px var(--spacing-lg);
    background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
    border: none;
    border-radius: 14px;
    color: white;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        transition: left 0.5s ease;
    }

    &:hover:not(:disabled) {
        box-shadow: 0 8px 30px rgba(139, 92, 246, 0.5), 0 0 60px rgba(236, 72, 153, 0.3);
        transform: translateY(-3px);

        &::before {
            left: 100%;
        }
    }

    &:active:not(:disabled) {
        transform: translateY(-1px);
    }

    &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }
`;

const GoogleIconWrapper = styled.div`
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
        font-size: 1.4rem;
        color: white;
    }
`;

const ButtonText = styled.span`
    flex: 1;
    text-align: center;
`;

const LoadingSpinner = styled.div`
    width: 22px;
    height: 22px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: ${spin} 0.8s linear infinite;
`;

const SecurityNote = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-lg);
    padding-top: var(--spacing-lg);
    border-top: 1px solid rgba(255, 255, 255, 0.1);

    svg {
        font-size: 1rem;
        color: #0CC68C;
    }

    span {
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.5);
    }
`;

const FeaturesGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-md);

    @media (min-width: 1024px) {
        display: none;
    }

    @media (max-width: 480px) {
        grid-template-columns: 1fr;
        gap: var(--spacing-sm);
    }
`;

const FeatureCard = styled.div`
    background: rgba(30, 30, 58, 0.4);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: var(--spacing-lg);
    text-align: center;
    transition: all 0.3s ease;

    &:hover {
        border-color: rgba(139, 92, 246, 0.5);
        transform: translateY(-6px);
        box-shadow: 0 12px 40px rgba(139, 92, 246, 0.2);
        background: rgba(30, 30, 58, 0.6);
    }

    @media (max-width: 480px) {
        padding: var(--spacing-md);
        display: flex;
        align-items: center;
        text-align: left;
        gap: var(--spacing-md);
    }
`;

const FeatureIconWrapper = styled.div`
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto var(--spacing-md);
    transition: all 0.3s ease;

    svg {
        font-size: 1.6rem;
        color: #8B5CF6;
    }

    ${FeatureCard}:hover & {
        background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);

        svg {
            color: white;
        }
    }

    @media (max-width: 480px) {
        margin: 0;
        flex-shrink: 0;
    }
`;

const FeatureTitle = styled.h3`
    font-size: 0.95rem;
    font-weight: 600;
    color: white;
    margin-bottom: var(--spacing-xs);

    @media (max-width: 480px) {
        margin-bottom: 2px;
    }
`;

const FeatureDescription = styled.p`
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
    line-height: 1.4;
`;

const Footer = styled.footer`
    z-index: 1;
    text-align: center;
    margin-top: var(--spacing-lg);

    @media (min-width: 1024px) {
        margin-top: var(--spacing-xl);
    }
`;

const FooterText = styled.p`
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.85rem;
`;
