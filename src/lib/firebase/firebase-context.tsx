'use client';

// contexts/FirebaseContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from './config';
import {
  signInWithGoogle,
  signOutUser,
  initPhoneAuth,
  verifyOtpAndSignIn,
  getCurrentUserProfile,
} from './utils/auth';
import { UserProfile } from '@/types';

interface FirebaseContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
  initiatePhoneLogin: (phoneNumber: string) => Promise<string>;
  verifyOtp: (
    verificationId: string,
    otp: string,
    userName?: string
  ) => Promise<UserProfile>;
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

  const loginWithGoogle = async () => {
    return signInWithGoogle();
  };

  const logout = async () => {
    return signOutUser();
  };

  const initiatePhoneLogin = async (phoneNumber: string) => {
    return initPhoneAuth(phoneNumber);
  };

  const verifyOtp = async (
    verificationId: string,
    otp: string,
    userName?: string
  ) => {
    return verifyOtpAndSignIn(verificationId, otp, userName);
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    loginWithGoogle,
    logout,
    initiatePhoneLogin,
    verifyOtp,
  };

  return (
    <FirebaseContext.Provider value={value}>
      {!loading ? children : <div>Loading...</div>}
    </FirebaseContext.Provider>
  );
};
