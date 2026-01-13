import React, { useState, MouseEvent } from 'react';
import styled, { keyframes } from 'styled-components';
import { provider } from '../firebase';
import { getAuth, signInWithPopup, AuthError } from "firebase/auth";
import GoogleIcon from '@mui/icons-material/Google';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
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
            <BackgroundOrbs>
                <Orb className="orb1" />
                <Orb className="orb2" />
                <Orb className="orb3" />
            </BackgroundOrbs>

            <LoginCard>
                <LogoContainer>
                    <IconWrapper>
                        <ChatBubbleOutlineIcon />
                    </IconWrapper>
                    <AppName>Thryve Chat</AppName>
                    <Tagline>Connect. Collaborate. Create.</Tagline>
                </LogoContainer>

                <WelcomeText>
                    <h2>Welcome Back</h2>
                    <p>Sign in to continue to your workspace</p>
                </WelcomeText>

                <GoogleButton onClick={signIn} disabled={isLoading}>
                    <GoogleIcon />
                    <span>{isLoading ? 'Signing in...' : 'Continue with Google'}</span>
                </GoogleButton>

                <Divider>
                    <span>Secure Authentication</span>
                </Divider>

                <Features>
                    <Feature>
                        <FeatureIcon>💬</FeatureIcon>
                        <span>Real-time messaging</span>
                    </Feature>
                    <Feature>
                        <FeatureIcon>🖼️</FeatureIcon>
                        <span>Share images</span>
                    </Feature>
                    <Feature>
                        <FeatureIcon>😊</FeatureIcon>
                        <span>Emoji reactions</span>
                    </Feature>
                </Features>
            </LoginCard>

            <Footer>
                <p>Built with ❤️ using React & Firebase</p>
            </Footer>
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
        transform: translateY(-20px) rotate(5deg);
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
    background: var(--gradient-primary);
    position: relative;
    overflow: hidden;
    padding: var(--spacing-lg);
`;

const BackgroundOrbs = styled.div`
    position: absolute;
    inset: 0;
    overflow: hidden;
    z-index: 0;
`;

const Orb = styled.div`
    position: absolute;
    border-radius: 50%;
    filter: blur(100px);
    opacity: 0.6;
    animation: ${float} 8s ease-in-out infinite;

    &.orb1 {
        width: 400px;
        height: 400px;
        background: rgba(88, 101, 242, 0.3);
        top: -100px;
        left: -100px;
        animation-delay: 0s;
    }

    &.orb2 {
        width: 300px;
        height: 300px;
        background: rgba(233, 69, 96, 0.25);
        bottom: -50px;
        right: -50px;
        animation-delay: -2s;
    }

    &.orb3 {
        width: 200px;
        height: 200px;
        background: rgba(59, 165, 92, 0.2);
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        animation: ${pulse} 6s ease-in-out infinite;
    }
`;

const LoginCard = styled.div`
    position: relative;
    z-index: 1;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    padding: var(--spacing-xl) var(--spacing-xl);
    width: 100%;
    max-width: 420px;
    box-shadow: var(--glass-shadow);
    animation: ${fadeInUp} 0.6s ease-out;

    &::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        padding: 1px;
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.1),
            rgba(255, 255, 255, 0.05),
            transparent
        );
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        pointer-events: none;
    }
`;

const LogoContainer = styled.div`
    text-align: center;
    margin-bottom: var(--spacing-xl);
`;

const IconWrapper = styled.div`
    width: 80px;
    height: 80px;
    border-radius: var(--radius-lg);
    background: var(--gradient-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto var(--spacing-md);
    box-shadow: var(--shadow-glow);
    animation: ${pulse} 3s ease-in-out infinite;

    svg {
        font-size: 40px;
        color: white;
    }
`;

const AppName = styled.h1`
    font-size: 2rem;
    font-weight: 700;
    background: var(--gradient-accent);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: var(--spacing-xs);
`;

const Tagline = styled.p`
    color: var(--text-secondary);
    font-size: 0.9rem;
`;

const WelcomeText = styled.div`
    text-align: center;
    margin-bottom: var(--spacing-xl);

    h2 {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: var(--spacing-xs);
    }

    p {
        color: var(--text-muted);
        font-size: 0.95rem;
    }
`;

const GoogleButton = styled.button`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    color: var(--text-primary);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-normal);
    position: relative;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.1),
            transparent
        );
        background-size: 200% 100%;
        animation: ${shimmer} 3s infinite;
        opacity: 0;
        transition: opacity var(--transition-normal);
    }

    svg {
        font-size: 1.5rem;
        color: var(--accent-primary);
    }

    &:hover:not(:disabled) {
        background: var(--glass-bg-hover);
        border-color: var(--accent-primary);
        box-shadow: var(--shadow-glow);
        transform: translateY(-2px);

        &::before {
            opacity: 1;
        }
    }

    &:active:not(:disabled) {
        transform: translateY(0);
    }

    &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }
`;

const Divider = styled.div`
    display: flex;
    align-items: center;
    margin: var(--spacing-xl) 0;

    &::before,
    &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--glass-border);
    }

    span {
        padding: 0 var(--spacing-md);
        color: var(--text-muted);
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
`;

const Features = styled.div`
    display: flex;
    justify-content: space-around;
    gap: var(--spacing-sm);
`;

const Feature = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);

    span {
        font-size: 0.75rem;
        color: var(--text-muted);
        text-align: center;
    }

    &:hover {
        background: var(--glass-bg);
    }
`;

const FeatureIcon = styled.span`
    font-size: 1.5rem;
`;

const Footer = styled.footer`
    position: absolute;
    bottom: var(--spacing-lg);
    z-index: 1;

    p {
        color: var(--text-muted);
        font-size: 0.85rem;
    }
`;
