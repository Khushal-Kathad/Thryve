import React from 'react'
import styled from 'styled-components';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import CreateIcon from '@mui/icons-material/Create';

import InsertCommentIcon from "@mui/icons-material/InsertComment";
import InboxIcon from "@mui/icons-material/Inbox";
import DraftsIcon from "@mui/icons-material/Drafts";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder"; 
import FileCopyIcon from "@mui/icons-material/FileCopy";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import AppsIcon from "@mui/icons-material/Apps";
import ExpandLessIcon from "@mui/icons-material/ExpandLess"; 
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SidebarOption from "./SidebarOption";
import AddIcon from '@mui/icons-material/Add';
import { db } from '../firebase.js';
import { collection} from "firebase/firestore";
import { useCollection } from 'react-firebase-hooks/firestore';
import { getAuth } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';



function Sidebar() {
    const auth=getAuth();
    const user=useAuthState(auth)
    const [value] = useCollection(collection(db, 'rooms'),
            {
            snapshotListenOptions: { includeMetadataChanges: true },
            }
        );

  return (
    <SidebarContainer>
        <SidebarHeader>
            <SidebarInfo>
                <h2>Slack</h2>
                <h3>
                    <FiberManualRecordIcon />
                    {user[0].displayName}
                </h3>
            </SidebarInfo>
            <CreateIcon />
        </SidebarHeader>
        <SideScroll>
        <SidebarOption Icon={InsertCommentIcon} title="Threads" /> 
        <SidebarOption Icon={InboxIcon} title="Mentions & reactions" /> 
        <SidebarOption Icon={DraftsIcon} title="Saved items" /> 
        <SidebarOption Icon={BookmarkBorderIcon} title="Channel browser" /> 
        <SidebarOption Icon={PeopleAltIcon} title="People & user groups" /> 
        <SidebarOption Icon={AppsIcon} title="Apps" />
        <SidebarOption Icon={FileCopyIcon} title="File browser" /> 
        <SidebarOption Icon={ExpandLessIcon} title="Show less"/>
        <hr />
        <SidebarOption Icon={ExpandMoreIcon} title="Channels" />
        <hr />
        <SidebarOption Icon={AddIcon} addChannelOption title="Add Channel" />

        {value?.docs.map(doc => (
            <SidebarOption key={doc.id} id={doc.id} title={doc.data().name} />
            )
        )}
        </SideScroll>
    </SidebarContainer>
  )
}

export default Sidebar;

const SidebarContainer =styled.div`
    color: white;
    background-color: var(--slack-color);
    flex: 0.2;
    border-top: 0.2em #49274b solid;
    margin-top: 4.5em;
    max-width: 26em;
    overflow-y: scroll;
    scrollbar-width: none;

    > hr {
        margin-top: 0.5em;
        margin-bottom: 0.5em;
        border: 0.1em #49274b solid;
    }
`;

const SidebarHeader =styled.div`
    display: flex;
    border-bottom: 0.2em #49274b solid;
    padding-bottom: 1em;
    padding: 1.3em;

    > .MuiSvgIcon-root {
        padding: 0.8em;
        color: #49274b;
        font-size: 1em;
        background-color: white;
        border-radius: 9.99em;
    }
`;

const SidebarInfo =styled.div`
    flex: 1;
    > h2 {
        font-size: 1em;
        font-weight: 900;
        margin-bottom: 0.5em;
    }

    > h3 {
        display: flex;
        font-size: 0.9em;
        font-weight: 400;
        align-items: center;
    }

    > h3 > .MuiSvgIcon-root {
        font-size: 0.91em;
        margin-top: 0.1em;
        margin-right: 0.2em;
        color: green;
    }
`;

const SideScroll = styled.div``;