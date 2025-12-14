// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
} from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyBYDinlf3FIQsaQET8XGdypcvkFzH3RyJE",
  authDomain: "inventarioapp-aebef.firebaseapp.com",
  projectId: "inventarioapp-aebef",
  storageBucket: "inventarioapp-aebef.appspot.com",
  messagingSenderId: "905714324226",
  appId: "1:905714324226:web:757b3ea28125dd1394e81b"
};

const firebaseApp = initializeApp(firebaseConfig);

// Firestore con caché local para mejor rendimiento
export const db = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache()
});
// Auth
export const auth = getAuth(firebaseApp);
