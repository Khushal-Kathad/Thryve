import React from 'react';
import styled from "styled-components";
import { Avatar } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SearchIcon from '@mui/icons-material/Search';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth, signOut } from 'firebase/auth';

function Header() {
  const auth=getAuth();
  const user=useAuthState(auth);
  console.log("user is",user);
  return (
    <HeaderContainer>
        {/* Header - Left */}
        <HeaderLeft>
          <HeaderAvatar
            onClick={() => signOut(auth)} 
            // TODO: Add onclick
            alt={user? user[0].displayName:""}
            src={user? user[0].photoURL : ""}
          />
          <AccessTimeIcon />
        </HeaderLeft>

        {/* Header - Search */}
        <HeaderSearch>
          <SearchIcon />
          <input placeholder='Search'/>
        </HeaderSearch>

        {/* Header - Right */}
        <HeaderRight>
          <HelpOutlineIcon />
        </HeaderRight>
    </HeaderContainer>
  )
}

const HeaderContainer = styled.div`
    display : flex;
    position: fixed;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    padding: 1em 0em;
    background-color: var(--slack-color);
    color: white;
`;



const HeaderLeft = styled.div`
  flex : 0.3;
  display: flex;
  align-items: center;
  margin-left: 2em;

  > .MuiSvgIcon-root {
    margin-left: auto;
    margin-right: 3em;
  }
`;

const HeaderAvatar = styled(Avatar)`
  cursor: pointer;

  :hover {
    opacity: 0.8;
  }
`;

const HeaderRight = styled.div`
  display: flex;
  flex: 0.3;
  align-items: flex-end;

  > .MuiSvgIcon-root {
    margin-left: auto;
    margin-right: 2em;
  }
`;

const HeaderSearch = styled.div`
    flex: 0.4;
    opacity: 1;
    border-radius: 1em;
    background-color: #421f44;
    text-align: center;
    display: flex;
    padding: 0 5em;
    color: grey;
    border: 1px gray solid;

    > input {
      background-color: transparent;
      border: none;
      text-align: center;
      min-width: 30vw;
      outline: 0;
      color: white;

    }
`;

export default Header;