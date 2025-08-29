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
  handleRedirectResult,
} from './utils/auth';
import { updateUserProfile, isProfileComplete } from './utils/user';
import { UserProfile } from '@/types';

interface FirebaseContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isProfileComplete: boolean;
  loading: boolean;
  loginWithGoogle: () => Promise<{
    user: User;
    userProfile: UserProfile;
    isNewUser: boolean;
  }>;
  logout: () => Promise<void>;
  initiatePhoneLogin: (phoneNumber: string) => Promise<string>;
  verifyOtp: (
    verificationId: string,
    otp: string,
    userName?: string
  ) => Promise<{
    user: User;
    userProfile: UserProfile;
    isNewUser: boolean;
  }>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
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
  const [profileCompleteStatus, setProfileCompleteStatus] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          const profile = await getCurrentUserProfile(user.uid);
          setUserProfile(profile);
          const profileComplete = profile ? isProfileComplete(profile) : false;
          setProfileCompleteStatus(profileComplete);
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUserProfile(null);
          setProfileCompleteStatus(false);
        }
      } else {
        setUserProfile(null);
        setProfileCompleteStatus(false);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle redirect results when the app loads
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const result = await handleRedirectResult();
        if (result) {
          setUserProfile(result.userProfile);
          setProfileCompleteStatus(isProfileComplete(result.userProfile));
        }
      } catch (error) {
        console.error('Error handling redirect result:', error);
      }
    };

    checkRedirectResult();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithGoogle();
      setUserProfile(result.userProfile);
      setProfileCompleteStatus(isProfileComplete(result.userProfile));
      return result;
    } catch (error) {
      // If it's a redirect error, we don't need to handle it here
      // as it will be handled by the redirect result handler
      if (error instanceof Error && error.message === 'Redirect initiated') {
        throw error;
      }
      throw error;
    }
  };

  const logout = async () => {
    await signOutUser();
    setUserProfile(null);
    setProfileCompleteStatus(false);
  };

  const initiatePhoneLogin = async (phoneNumber: string) => {
    return initPhoneAuth(phoneNumber);
  };

  const verifyOtp = async (
    verificationId: string,
    otp: string,
    userName?: string
  ) => {
    const result = await verifyOtpAndSignIn(verificationId, otp, userName);
    setUserProfile(result.userProfile);
    setProfileCompleteStatus(isProfileComplete(result.userProfile));
    return result;
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    await updateUserProfile(currentUser.uid, data);

    // Update local state
    if (userProfile) {
      const updatedProfile = { ...userProfile, ...data };
      setUserProfile(updatedProfile);
      setProfileCompleteStatus(isProfileComplete(updatedProfile));
    }
  };

  const value = {
    currentUser,
    userProfile,
    isProfileComplete: profileCompleteStatus,
    loading,
    loginWithGoogle,
    logout,
    initiatePhoneLogin,
    verifyOtp,
    updateProfile,
  };

  return (
    <FirebaseContext.Provider value={value}>
      {!loading ? (
        children
      ) : (
        <div className="flex items-center justify-center h-screen">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <p className="text-lg font-medium">Loading...</p>
          </div>
        </div>
      )}
    </FirebaseContext.Provider>
  );
};
