// utils/auth.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config';
import { UserProfile } from '@/types';

// Sign up with email and password
export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName: string
): Promise<UserProfile> => {
  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Update the user's display name
    await updateProfile(user, { displayName });

    // Create user profile in Firestore
    const userProfile: Omit<UserProfile, 'id'> = {
      name: displayName,
      email: user.email!,
      phoneNumber: user.phoneNumber || '',
      createdAt: Date.now(),
      lastActive: Date.now(),
      photoURL: user.photoURL || '',
    };

    await setDoc(doc(db, 'users', user.uid), userProfile);

    // Return the user profile
    return {
      id: user.uid,
      ...userProfile,
    };
  } catch (error) {
    const err = error as Error;
    console.error('Error signing up:', err.message);
    throw err;
  }
};

// Sign in with email and password
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Update last active timestamp
    const userRef = doc(db, 'users', userCredential.user.uid);
    await setDoc(userRef, { lastActive: Date.now() }, { merge: true });

    return userCredential.user;
  } catch (error) {
    const err = error as Error;
    console.error('Error signing in:', err.message);
    throw err;
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    // Check if user already exists in Firestore
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // Create new user profile if first time signing in
      const userProfile: Omit<UserProfile, 'id'> = {
        name: user.displayName || 'User',
        email: user.email!,
        phoneNumber: user.phoneNumber || '',
        createdAt: Date.now(),
        lastActive: Date.now(),
        photoURL: user.photoURL || '',
      };

      await setDoc(userRef, userProfile);
    } else {
      // Update last active timestamp
      await setDoc(userRef, { lastActive: Date.now() }, { merge: true });
    }

    return user;
  } catch (error) {
    const err = error as Error;
    console.error('Error signing in with Google:', err.message);
    throw error;
  }
};

// Sign out
export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    const err = error as Error;
    console.error('Error signing out:', err.message);
    throw error;
  }
};

// Reset password
export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    const err = error as Error;
    console.error('Error resetting password:', err.message);
    throw error;
  }
};

// Get current user profile from Firestore
export const getCurrentUserProfile = async (
  userId: string
): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      return {
        id: userDoc.id,
        ...userDoc.data(),
      } as UserProfile;
    }

    return null;
  } catch (error) {
    const err = error as Error;
    console.error('Error getting user profile:', err.message);
    throw error;
  }
};
