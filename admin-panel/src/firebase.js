// admin-panel/src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC5nqsx4Fe4gMKkKdvnbMf8VFnI6TYL64k",
  authDomain: "admin.pida-ai.com",
  projectId: "pida-ai-v20",
  storageBucket: "pida-ai-v20.firebasestorage.app",
  messagingSenderId: "465781488910",
  appId: "1:465781488910:web:6f9c2b4bc91317a6bbab5f",
  measurementId: "G-4FEDD254GY"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();