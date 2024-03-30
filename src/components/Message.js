import React from 'react'
import styled from 'styled-components'

function Message({message, timestamp, users, userImage}) {
  return (
    <MessageContainer>
        <img src={userImage} alt=''/>
        <MessageInfo>
        <h4>
            {users}{' '}
            <span>
                {new Date(timestamp?.toDate()).toUTCString()}
            </span>
            <p>{message}</p>
        </h4>
        </MessageInfo>
    </MessageContainer>
  )
}

const MessageContainer = styled.div`
    display: flex;
    align-items: center;
    padding: 1em;
    > img {
        height: 2.5em;
        border-radius: 2em;
    }
`;

const MessageInfo =styled.div`
    padding-left: 1em;
    font-size: 0.8em;

    > h4 > span { 
        color: gray;
        font-weight: 300;
        margin-left: 0.5em;
        font-size: 0.5em;
    }

    > h4 > p {
        font-size: 1.2em;
    }
`;

export default Message


