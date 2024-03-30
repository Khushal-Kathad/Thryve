import React from 'react'
import styled from 'styled-components';
import { db } from '../firebase.js';
import { collection, doc, setDoc } from "firebase/firestore";
import { useDispatch } from 'react-redux';
import { enterRoom } from '../features/appSlice.js';


function SidebarOption({ Icon , title , addChannelOption , id}) {
    const dispatch = useDispatch();

    const addChannel = () => {
        const channelName = prompt('Please enter the channel name'); // Prompting the user for a channel name

        // Checking if a channel name was provided by the user
        if (channelName) {
            const newRef = doc(collection(db, "rooms"));
            setDoc(newRef,  {name: channelName});
        }
    };

    const selectChannel = () => {
        if (id) {
            dispatch(enterRoom({
                roomId: id
            }))
        }
    };

  return (
    <SidebarOptionContainer
        onClick={addChannelOption ? addChannel : selectChannel}
    >
        <div>
        {Icon && <Icon fontSize="small" style={{ padding : 10 }} />}
            {Icon ? (
                    <h3>{title}</h3>
            ) : (
                    <SidebarOptionChannel>
                        <span>#</span> {title}
                    </SidebarOptionChannel>
            )}
        </div>
    </SidebarOptionContainer>
  );
}

export default SidebarOption;

const SidebarOptionContainer = styled.div`
    display: flex;
    font-size: 1em;
    align-items: center;
    padding-left: 0.1em;
    cursor: pointer;

    :hover {
        opacity: 0.9;
        background-color: #340e36;
    }
    
    > div{
        display: flex;
        flex: 1;
        font-size: 1em;
        align-items: center;
        padding-left: 0.1em;
    }

    > div > h3 {
        font-weight: 400;
    }

    > div > h3 >span {
        padding: 1em;
    }
`;

const SidebarOptionChannel = styled.h3`
    padding: 0.5em 0;
    font-weight: 300;
`;