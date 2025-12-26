// /utils/AuthProvider.js (fuera de app/)
import {
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase"; // Cambiado de "../../firebase" a "../firebase"

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setInitializing(false);
    });
    return unsub;
  }, []);

  const signUp = (email, password) =>
    createUserWithEmailAndPassword(auth, email, password);

  const signIn = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const signOut = () => firebaseSignOut(auth);

  return (
    <AuthContext.Provider
      value={{ user, initializing, signUp, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// Exportación por defecto para compatibilidad
export default AuthProvider;