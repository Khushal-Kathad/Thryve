import { Button } from '@mui/material';
import React, { useState } from 'react'
import styled from 'styled-components';
import { db } from '../firebase';
import { collection } from 'firebase/firestore';
import { doc, setDoc } from "firebase/firestore";
import { Timestamp } from 'firebase/firestore'
import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth } from 'firebase/auth';


function ChatInput({channelName , channelId , chatRef}) {
    const auth=getAuth();
    const user=useAuthState(auth)
    const [input, setInput] = useState('');
    const sendMessage = e => {
        e.preventDefault();

        if (!channelId) {
            return false;
        }

        
        const current_timestamp = Timestamp.fromDate(new Date());
        const chat = doc(db, 'rooms', channelId);
        const atc = doc(collection(chat, "messages"));
        setDoc(atc, {message: input,timestamp: current_timestamp,users: user[0].displayName,userImage: user[0].photoURL} ,{merge : true});

        chatRef.current.scrollIntoView({
            behavior : "smooth",
        });        

        setInput('');
    };

  return (
    <ChatInputContainer>
        <form>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Message # ${channelName}`} />
            <Button hidden type='submit' onClick={sendMessage}>
                SEND
            </Button>
        </form>
    </ChatInputContainer>
  )
}

export default ChatInput

const ChatInputContainer = styled.div`
    border-radius: 2em;

    > form {
        position: relative;
        display: flex;
        justify-content: center;
    }

    > form > input {
        position: fixed;
        bottom: 3em;
        width: 60%;
        border: 0.2em solid gray;
        border-radius: 0.1em;
        padding: 1.5em;
        outline: none;
    }

    > form > button {
        display: none;
    }
`;
