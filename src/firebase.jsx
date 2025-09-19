import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyA-9aTFjb0DWeouH72awQqQvg55LsDduBg",
  authDomain: "shiphitmobileapppickup-fb7e2.firebaseapp.com",
  projectId: "shiphitmobileapppickup-fb7e2",
  storageBucket: "shiphitmobileapppickup-fb7e2.firebasestorage.app",
  messagingSenderId: "119835219554",
  appId: "1:119835219554:web:d2d3de90ae318b1c92633b",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = getFirestore();
export const messaging = getMessaging();
