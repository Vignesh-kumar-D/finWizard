'use client';

// contexts/FirebaseContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from './config';
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
  resetPassword,
  getCurrentUserProfile,
} from './utils/auth';
import { UserProfile } from '@/types';

interface FirebaseContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    name: string
  ) => Promise<UserProfile>;
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
  resetUserPassword: (email: string) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(
  undefined
);

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          const profile = await getCurrentUserProfile(user.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    return signUpWithEmail(email, password, name);
  };

  const login = async (email: string, password: string) => {
    return signInWithEmail(email, password);
  };

  const loginWithGoogle = async () => {
    return signInWithGoogle();
  };

  const logout = async () => {
    return signOutUser();
  };

  const resetUserPassword = async (email: string) => {
    return resetPassword(email);
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    signUp,
    login,
    loginWithGoogle,
    logout,
    resetUserPassword,
  };

  return (
    <FirebaseContext.Provider value={value}>
      {!loading ? children : <div>Loading...</div>}
    </FirebaseContext.Provider>
  );
};
