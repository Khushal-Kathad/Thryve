import React, { useEffect, useRef } from 'react'
import styled from 'styled-components'
import StarBorderOutlinedIcon from '@mui/icons-material/StarBorderOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useSelector } from 'react-redux';
import { selectRoomId } from '../features/appSlice';
import ChatInput from './ChatInput';
import { doc, orderBy, query} from "firebase/firestore";
import { db } from '../firebase';
import { useCollection, useDocument } from 'react-firebase-hooks/firestore';
import { collection } from 'firebase/firestore';
import Message from './Message';

function Chat() {
    const chatRef=useRef(null);
    const roomId = useSelector(selectRoomId);
    console.log(roomId)
    // const docRef = doc(db, "rooms", roomId);
    // const docSnap =getDoc(docRef);
    // const [roomDetails]=[docSnap.data()]
 
    const [roomDetails]= useDocument( roomId!=="null" && doc(db, 'rooms', roomId) );
    const [roomMessages, loading] = useCollection( roomId!=="null" && query(collection(db,"rooms",roomId,"messages"),orderBy("timestamp", "asc")));
    
    useEffect(() => {
        chatRef?.current?.scrollIntoView({
            behavior : "smooth",
        });
    },[roomId, loading])

  return (
    <ChatContainer>
        {roomDetails?  roomMessages?  
        <>
        <Header>
            <HeaderLeft>
                <h4><strong>#{roomDetails?.data()?.name }</strong></h4>
                <StarBorderOutlinedIcon />
            </HeaderLeft>

            <HeaderRight>
                <p>
                <InfoOutlinedIcon />Details
                </p>
            </HeaderRight>
        </Header>

        <ChatMessages>
        {roomMessages?.docs.map(doc => {
            const { message, timestamp, users, userImage } = doc.data();   
            
            return ( 
                <Message
                    key={doc.id}
                    message={message} 
                    timestamp={timestamp}
                    users={users}
                    userImage={userImage} 
                />
            );
        })}
        <ChatBottom ref={chatRef}/>
        </ChatMessages>
        {roomId && <ChatInput chatRef={chatRef} channelName={roomDetails?.data()?.name} channelId={roomId} /> }
   
        </>
        : "" : " "
        }
        
    </ChatContainer>
  )
}

export default Chat

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    padding: 1em;
    border-bottom: 0.1em solid lightgray;
`;

const ChatBottom = styled.div`
    height: 7em;
`;

const ChatMessages =styled.div``;

const HeaderLeft = styled.div`
    display: flex;
    align-items: center;
    > h4 {
        display: flex;
        text-transform: lowercase;
        margin-right: 0.5em;
    }

    > h4 > .MuiSvgIcon-root {
        margin-left: 0.5em;
        font-size: 1em;
    }
`;
const HeaderRight = styled.div`
    > p {
        display: flex;
        align-items: center;
        font-size: 0.9em;
    }

    > p > .MuiSvgIcon-root {
        margin-right: 0.5em;
        font-size: 1.2em;
    }
`;

const ChatContainer=styled.div`
    flex: 0.8;
    flex-grow: 1;
    overflow-y: scroll;
    margin-top: 4.4em;
`;