/**
 * Authentication Hook
 * Manages Firebase authentication state and operations
 */

import { useState, useEffect, useContext, createContext } from 'react';

// Lazy load Firebase to prevent build-time issues
let firebaseAuth = null;
let firebaseApp = null;

const initializeFirebaseAuth = async () => {
  if (firebaseAuth && firebaseApp) return { auth: firebaseApp, ...firebaseAuth };
  
  try {
    const { auth } = await import('../lib/firebase-client');
    const { 
      signInWithEmailAndPassword,
      createUserWithEmailAndPassword,
      signOut,
      onAuthStateChanged,
      GoogleAuthProvider,
      signInWithPopup
    } = await import('firebase/auth');
    
    firebaseAuth = {
      signInWithEmailAndPassword,
      createUserWithEmailAndPassword,
      signOut,
      onAuthStateChanged,
      GoogleAuthProvider,
      signInWithPopup
    };
    firebaseApp = auth;
    
    return { auth: firebaseApp, ...firebaseAuth };
  } catch (error) {
    console.error('Failed to initialize Firebase Auth:', error);
    return null;
  }
};

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [firebase, setFirebase] = useState(null);

  useEffect(() => {
    let unsubscribe = null;
    
    const initAuth = async () => {
      try {
        const fb = await initializeFirebaseAuth();
        if (fb) {
          setFirebase(fb);
          unsubscribe = fb.onAuthStateChanged(fb.auth, (user) => {
            setUser(user);
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const signIn = async (email, password) => {
    if (!firebase) {
      throw new Error('Firebase not initialized');
    }
    try {
      setError(null);
      const result = await firebase.signInWithEmailAndPassword(firebase.auth, email, password);
      return result.user;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const signUp = async (email, password) => {
    if (!firebase) {
      throw new Error('Firebase not initialized');
    }
    try {
      setError(null);
      const result = await firebase.createUserWithEmailAndPassword(firebase.auth, email, password);
      return result.user;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    if (!firebase) {
      throw new Error('Firebase not initialized');
    }
    try {
      setError(null);
      const provider = new firebase.GoogleAuthProvider();
      const result = await firebase.signInWithPopup(firebase.auth, provider);
      return result.user;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const logout = async () => {
    if (!firebase) {
      throw new Error('Firebase not initialized');
    }
    try {
      setError(null);
      await firebase.signOut(firebase.auth);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const getIdToken = async () => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    return await user.getIdToken();
  };

  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
    getIdToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};