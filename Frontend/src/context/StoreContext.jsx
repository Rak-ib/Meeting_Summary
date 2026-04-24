import { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider } from '../config/firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { subscribeToUserNotes } from '../services/firestore';

const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore History Listener
  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    setHistoryLoading(true);
    setHistoryError(null);
    const unsubscribe = subscribeToUserNotes(user.uid, (notes) => {
      setHistory(notes);
      setHistoryLoading(false);
    }, (error) => {
      console.error("StoreContext: History subscription failed", error);
      setHistoryError(error.message);
      setHistoryLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const login = () => signInWithPopup(auth, googleProvider);
  
  const signUpEmail = (email, password) => createUserWithEmailAndPassword(auth, email, password);
  
  const loginEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);

  const logout = () => signOut(auth);

  const value = {
    user,
    history,
    loading,
    historyLoading,
    historyError,
    login,
    signUpEmail,
    loginEmail,
    logout
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
