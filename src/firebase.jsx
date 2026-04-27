import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCJ-uGdjFO1kRT9DrRvbnpbEXQ5QXoKpeo",
  authDomain: "shiphit-salesapp-test-env.firebaseapp.com",
  projectId: "shiphit-salesapp-test-env",
  storageBucket: "shiphit-salesapp-test-env.firebasestorage.app",
  messagingSenderId: "866319555778",
  appId: "1:866319555778:web:60cb04c99e04580170af5b",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = getFirestore();
export const messaging = getMessaging();