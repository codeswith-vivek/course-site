import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyB4AKcXW5SoPoRsC828_6IoOrm48JRbW6I",
  authDomain: "codewith-vivek-lms.firebaseapp.com",
  projectId: "codewith-vivek-lms",
  storageBucket: "codewith-vivek-lms.firebasestorage.app",
  messagingSenderId: "240599633224",
  appId: "1:240599633224:web:ab04341fefbd52eac7b77d"
};

// Initialize Firebase only if it hasn't been initialized yet
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const storage = getStorage(app);