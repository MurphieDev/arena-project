import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDaegUsnDK9H1D0_r5Hnf-IAaCUqBT-BU4",
  authDomain: "sport-x-af95c.firebaseapp.com",
  projectId: "sport-x-af95c",
  storageBucket: "sport-x-af95c.firebasestorage.app",
  messagingSenderId: "650188458774",
  appId: "1:650188458774:web:0c815f74c287e526155e37"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);