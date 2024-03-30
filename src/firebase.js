// For Firebase JS SDK v7.20.0 and later, measurementId is optional
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAGvj-Iv746aPyttJX-KMe0d74G4x7woDA",
    authDomain: "chat-app-9a481.firebaseapp.com",
    projectId: "chat-app-9a481",
    storageBucket: "chat-app-9a481.appspot.com",
    messagingSenderId: "293415510920",
    appId: "1:293415510920:web:8684240a492a6489fa903d",
    measurementId: "G-6J8S4SBV3J"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth , provider, db };