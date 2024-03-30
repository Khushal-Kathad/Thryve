import React from 'react';
import './App.css';
import Header from './components/Header';
import styled from 'styled-components';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth } from 'firebase/auth';
import Login from './components/Login';
import Spinner from 'react-spinkit';

const auth = getAuth();
function App() {
  const [user, loading] = useAuthState(auth);
  
  if (loading){
    return(
      <AppLoading>
        <AppLoadingContents>
          <img src='https://jpeg.org/images/jpeg-home.jpg' alt=''/>
          <Spinner name="ball-spin-fade-loader" color='black' fadeIn='none'/>
        </AppLoadingContents>
      </AppLoading>
    );
  }

  return (
    <div>
    {!user? (
      <Login />
    ):(
      <>
      <Header />
      <AppBoby>
        <Sidebar />
        <Chat />
      </AppBoby>
      </>
    )}
    </div>  
  );
}

export default App;

const AppBoby = styled.div`
  display: flex;
  height: 100vh;
`;

const AppLoading = styled.div`
    display: grid;
    place-items: center;
    height: 100vh;
    width: 100%;
`;

const AppLoadingContents = styled.div`
    text-align: center;
    padding-bottom: 10em; 
    display: flex;
    flex-direction: column;
    justify-content: center; 
    align-items: center;

    > img {
      height: 10em;
      padding: 2em;
      margin-bottom: 4em;
    }
`;