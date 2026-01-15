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

            <LoginContent>
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
            </LoginContent>

            <Footer>
                <FooterText>Built with React & Firebase</FooterText>
            </Footer>
        </LoginContainer>
    );
};

export default Login;

// Animations
const float = keyframes`
    0%, 100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-20px);
    }
`;

const pulse = keyframes`
    0%, 100% {
        opacity: 0.5;
        transform: scale(1);
    }
    50% {
        opacity: 0.8;
        transform: scale(1.05);
    }
`;

const fadeInUp = keyframes`
    from {
        opacity: 0;
        transform: translateY(30px);
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

// Styled Components
const LoginContainer = styled.div`
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--bg-primary) 0%, var(--purple-50) 50%, var(--bg-primary) 100%);
    position: relative;
    overflow: hidden;
    padding: var(--spacing-lg);

    @media (max-width: 480px) {
        padding: var(--spacing-md);
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
    border: 1px solid var(--purple-100);
    opacity: 0.5;

    &.circle1 {
        width: 600px;
        height: 600px;
        top: -200px;
        right: -200px;
        animation: ${pulse} 8s ease-in-out infinite;
    }

    &.circle2 {
        width: 400px;
        height: 400px;
        bottom: -150px;
        left: -150px;
        animation: ${pulse} 6s ease-in-out infinite;
        animation-delay: -2s;
    }

    &.circle3 {
        width: 200px;
        height: 200px;
        top: 50%;
        left: 10%;
        animation: ${float} 10s ease-in-out infinite;
    }
`;

const PatternDot = styled.div`
    position: absolute;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent-primary);
    opacity: 0.3;

    &.dots1 {
        top: 20%;
        right: 15%;
        animation: ${pulse} 3s ease-in-out infinite;
    }

    &.dots2 {
        bottom: 30%;
        left: 20%;
        animation: ${pulse} 4s ease-in-out infinite;
        animation-delay: -1s;
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
`;

const BrandingSection = styled.div`
    text-align: center;
`;

const LogoWrapper = styled.div`
    width: 80px;
    height: 80px;
    border-radius: var(--radius-xl);
    background: var(--gradient-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto var(--spacing-md);
    box-shadow: var(--shadow-glow);
    animation: ${float} 6s ease-in-out infinite;

    svg {
        font-size: 40px;
        color: white;
    }

    @media (max-width: 480px) {
        width: 64px;
        height: 64px;

        svg {
            font-size: 32px;
        }
    }
`;

const AppTitle = styled.h1`
    font-size: 2.5rem;
    font-weight: 800;
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: var(--spacing-xs);
    letter-spacing: -0.5px;

    @media (max-width: 480px) {
        font-size: 2rem;
    }
`;

const AppSubtitle = styled.p`
    color: var(--text-secondary);
    font-size: 1rem;
    font-weight: 500;

    @media (max-width: 480px) {
        font-size: 0.9rem;
    }
`;

const LoginCard = styled.div`
    background: var(--bg-primary);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-lg);
    padding: var(--spacing-xl);
    box-shadow: var(--shadow-lg);

    @media (max-width: 480px) {
        padding: var(--spacing-lg);
    }
`;

const CardHeader = styled.div`
    text-align: center;
    margin-bottom: var(--spacing-xl);
`;

const WelcomeTitle = styled.h2`
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: var(--spacing-xs);

    @media (max-width: 480px) {
        font-size: 1.3rem;
    }
`;

const WelcomeSubtitle = styled.p`
    color: var(--text-muted);
    font-size: 0.95rem;
`;

const GoogleButton = styled.button`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--bg-primary);
    border: 2px solid var(--border-light);
    border-radius: var(--radius-lg);
    color: var(--text-primary);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
    position: relative;

    &:hover:not(:disabled) {
        border-color: var(--accent-primary);
        box-shadow: var(--shadow-glow);
        transform: translateY(-2px);
    }

    &:active:not(:disabled) {
        transform: translateY(0);
    }

    &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }
`;

const GoogleIconWrapper = styled.div`
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
        font-size: 1.3rem;
        color: var(--accent-primary);
    }
`;

const ButtonText = styled.span`
    flex: 1;
    text-align: center;
`;

const LoadingSpinner = styled.div`
    width: 20px;
    height: 20px;
    border: 2px solid var(--border-light);
    border-top-color: var(--accent-primary);
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
    border-top: 1px solid var(--border-light);

    svg {
        font-size: 1rem;
        color: var(--accent-success);
    }

    span {
        font-size: 0.8rem;
        color: var(--text-muted);
    }
`;

const FeaturesGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-md);

    @media (max-width: 480px) {
        grid-template-columns: 1fr;
        gap: var(--spacing-sm);
    }
`;

const FeatureCard = styled.div`
    background: var(--bg-primary);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    text-align: center;
    transition: all var(--transition-fast);

    &:hover {
        border-color: var(--accent-primary);
        transform: translateY(-4px);
        box-shadow: var(--shadow-lg);
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
    width: 48px;
    height: 48px;
    border-radius: var(--radius-lg);
    background: var(--purple-50);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto var(--spacing-md);

    svg {
        font-size: 1.5rem;
        color: var(--accent-primary);
    }

    @media (max-width: 480px) {
        margin: 0;
        flex-shrink: 0;
    }
`;

const FeatureTitle = styled.h3`
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--spacing-xs);

    @media (max-width: 480px) {
        margin-bottom: 2px;
    }
`;

const FeatureDescription = styled.p`
    font-size: 0.8rem;
    color: var(--text-muted);
    line-height: 1.4;
`;

const Footer = styled.footer`
    position: absolute;
    bottom: var(--spacing-lg);
    z-index: 1;

    @media (max-width: 480px) {
        position: relative;
        bottom: 0;
        margin-top: var(--spacing-xl);
    }
`;

const FooterText = styled.p`
    color: var(--text-muted);
    font-size: 0.85rem;
`;
