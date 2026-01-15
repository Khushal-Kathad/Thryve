import React from 'react';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SendIcon from '@mui/icons-material/Send';
import {
    RecordingContainer,
    CancelRecordingButton,
    RecordingIndicator,
    RecordingPulse,
    RecordingTime,
    RecordingWave,
    WaveBar,
    SendButton,
} from './ChatInput.styles';

interface VoiceRecorderProps {
    recordingTime: number;
    onCancel: () => void;
    onSend: () => void;
}

const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ recordingTime, onCancel, onSend }) => {
    return (
        <>
            <RecordingContainer>
                <CancelRecordingButton onClick={onCancel} title="Cancel">
                    <DeleteOutlineIcon />
                </CancelRecordingButton>
                <RecordingIndicator>
                    <RecordingPulse />
                    <RecordingTime>{formatRecordingTime(recordingTime)}</RecordingTime>
                </RecordingIndicator>
                <RecordingWave>
                    <WaveBar style={{ animationDelay: '0s' }} />
                    <WaveBar style={{ animationDelay: '0.1s' }} />
                    <WaveBar style={{ animationDelay: '0.2s' }} />
                    <WaveBar style={{ animationDelay: '0.3s' }} />
                    <WaveBar style={{ animationDelay: '0.4s' }} />
                </RecordingWave>
            </RecordingContainer>
            <SendButton
                type="button"
                onClick={onSend}
                $hasContent={true}
                title="Send voice message"
            >
                <SendIcon />
            </SendButton>
        </>
    );
};

export default VoiceRecorder;
