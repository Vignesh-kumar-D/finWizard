// utils/auth.ts
import {
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  PhoneAuthProvider,
  signInWithCredential,
  RecaptchaVerifier,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config';
import { UserProfile } from '@/types';

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

// Initialize phone authentication
export const initPhoneAuth = async (phoneNumber: string): Promise<string> => {
  try {
    // Create a recaptcha verifier
    const recaptchaVerifier = new RecaptchaVerifier(
      auth,
      'recaptcha-container',
      {
        size: 'invisible',
      }
    );

    // Send verification code
    const phoneProvider = new PhoneAuthProvider(auth);
    const verificationId = await phoneProvider.verifyPhoneNumber(
      phoneNumber,
      recaptchaVerifier
    );

    // Store verification ID in session storage for safety
    sessionStorage.setItem('verificationId', verificationId);

    return verificationId;
  } catch (error) {
    console.error('Error initializing phone auth:', error);
    throw error;
  }
};

// Verify OTP and sign in
export const verifyOtpAndSignIn = async (
  verificationId: string,
  otp: string,
  userName?: string
): Promise<UserProfile> => {
  try {
    // Create credential
    const credential = PhoneAuthProvider.credential(verificationId, otp);

    // Sign in with credential
    const userCredential = await signInWithCredential(auth, credential);
    const firebaseUser = userCredential.user;

    // Check if user already exists in Firestore
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);

    let userProfile: UserProfile;

    if (!userDoc.exists()) {
      // This is a new user, create a profile
      const newUserProfile: Omit<UserProfile, 'id'> = {
        name:
          userName ||
          `User_${phoneNumberToUsername(firebaseUser.phoneNumber || '')}`,
        email: firebaseUser.email || '',
        phoneNumber: firebaseUser.phoneNumber || '',
        createdAt: Date.now(),
        lastActive: Date.now(),
        photoURL: firebaseUser.photoURL || '',
      };

      await setDoc(userRef, newUserProfile);

      userProfile = {
        id: firebaseUser.uid,
        ...newUserProfile,
      };
    } else {
      // Existing user, update last active timestamp
      await setDoc(userRef, { lastActive: Date.now() }, { merge: true });

      userProfile = {
        id: userDoc.id,
        ...(userDoc.data() as Omit<UserProfile, 'id'>),
      };
    }

    return userProfile;
  } catch (error) {
    console.error('Error verifying OTP:', error);
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

// Helper function to convert phone number to username
function phoneNumberToUsername(phoneNumber: string): string {
  // Remove all non-digit characters and take the last 6 digits
  const digits = phoneNumber.replace(/\D/g, '');
  return digits.slice(-6);
}
