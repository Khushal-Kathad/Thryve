import React from 'react';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import GroupsIcon from '@mui/icons-material/Groups';
import VideocamIcon from '@mui/icons-material/Videocam';
import {
    ChatContainer,
    WelcomeScreen as WelcomeScreenContainer,
    WelcomeContent,
    WelcomeIcon,
    WelcomeTitle,
    WelcomeText,
    WelcomeFeatures,
    FeatureItem,
    FeatureIcon,
    FeatureText,
} from './Chat.styles';

const WelcomeScreen: React.FC = () => {
    return (
        <ChatContainer>
            <WelcomeScreenContainer>
                <WelcomeContent>
                    <WelcomeIcon>
                        <ChatBubbleOutlineIcon />
                    </WelcomeIcon>
                    <WelcomeTitle>Welcome to Thryve Chat</WelcomeTitle>
                    <WelcomeText>
                        Select a group or start a conversation from the sidebar to begin chatting
                    </WelcomeText>
                    <WelcomeFeatures>
                        <FeatureItem>
                            <FeatureIcon><GroupsIcon /></FeatureIcon>
                            <FeatureText>Create groups</FeatureText>
                        </FeatureItem>
                        <FeatureItem>
                            <FeatureIcon><VideocamIcon /></FeatureIcon>
                            <FeatureText>Video calls</FeatureText>
                        </FeatureItem>
                        <FeatureItem>
                            <FeatureIcon><ChatBubbleOutlineIcon /></FeatureIcon>
                            <FeatureText>Real-time chat</FeatureText>
                        </FeatureItem>
                    </WelcomeFeatures>
                </WelcomeContent>
            </WelcomeScreenContainer>
        </ChatContainer>
    );
};

export default WelcomeScreen;
