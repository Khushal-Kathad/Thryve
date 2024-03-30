import { Button } from '@mui/material';
import React from 'react'
import styled from 'styled-components'
import { auth, provider } from '../firebase';
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
function Login() {
    const signIn = e => {
        e.preventDefault();
        const auth = getAuth();
        signInWithPopup(auth, provider)
            .then((result) => {
                // This gives you a Google Access Token. You can use it to access the Google API.
                const credential = GoogleAuthProvider.credentialFromResult(result);
                const token = credential.accessToken;
                // The signed-in user info.
                const user = result.user;
                // IdP data available using getAdditionalUserInfo(result)
                // ...
            }).catch((error) => {
                // Handle Errors here.
                const errorCode = error.code;
                const errorMessage = error.message;
                // The email of the user's account used.
                const email = error.customData.email;
                // The AuthCredential type that was used.
                const credential = GoogleAuthProvider.credentialFromError(error);
                // ...
            });
    };
    return (
        <LoginContainer>
            <LoginInnerContainer>
                <img src="https://jpeg.org/images/jpeg-home.jpg" alt="" />
                <h1>Sign-in</h1>
                <Button onClick={signIn}>Sign in with Google</Button>
            </LoginInnerContainer>
        </LoginContainer>
    )
}

export default Login

const LoginContainer = styled.div`
    background-color: #f8f8f8;
    height: 100vh;
    display: grid;
    place-items: center;
`;

const LoginInnerContainer = styled.div`
    padding: 3em;
    text-align: center;
    background-color: white;
    border-radius: 1em;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px
    2px rgba(0, 0, 0, 0.24);

    >img {
        width: 25em;
        height: 20em;
    }

    >button {
        margin-top: 2em;
        text-transform: inherit;
        background-color: #0a8d48;
        color: white;
    }
`;
