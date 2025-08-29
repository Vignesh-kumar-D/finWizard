// utils/auth.ts
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  GoogleAuthProvider,
  PhoneAuthProvider,
  signInWithCredential,
  RecaptchaVerifier,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config';
import { UserProfile } from '@/types';
import {
  findUserByEmail,
  findUserByPhone,
  createUserProfile,
  mergeUserDataFromAuth,
} from './user';

// Sign in with Google
export const signInWithGoogle = async (): Promise<{
  user: User;
  userProfile: UserProfile;
  isNewUser: boolean;
}> => {
  try {
    const provider = new GoogleAuthProvider();

    // Try popup first, fall back to redirect if blocked
    try {
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      return await processGoogleSignInResult(user);
    } catch (popupError: unknown) {
      // If popup is blocked, use redirect
      if (
        popupError &&
        typeof popupError === 'object' &&
        'code' in popupError &&
        (popupError.code === 'auth/popup-blocked' ||
          popupError.code === 'auth/popup-closed-by-user')
      ) {
        await signInWithRedirect(auth, provider);
        // The redirect will happen, so we return a promise that will be resolved after redirect
        return new Promise((resolve, reject) => {
          // This will be handled by getRedirectResult when the page loads after redirect
          reject(new Error('Redirect initiated'));
        });
      }
      throw popupError;
    }
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

// Process Google sign-in result (used by both popup and redirect)
export const processGoogleSignInResult = async (
  user: User
): Promise<{
  user: User;
  userProfile: UserProfile;
  isNewUser: boolean;
}> => {
  // Check if we already have a user with this email
  let existingUser = null;
  let isNewUser = false;

  if (user.email) {
    existingUser = await findUserByEmail(user.email);
  }

  // If user exists with this email, update with Google auth info
  if (existingUser) {
    // Update the user's last active timestamp
    // Get current auth methods
    const currentAuthMethods = existingUser.authMethods || [];

    // Check if this Google auth method already exists
    const hasGoogleMethod = currentAuthMethods.some(
      (method) => method.authMethod === 'google' && method.uid === user.uid
    );

    // Only add if it doesn't exist
    const updatedAuthMethods = hasGoogleMethod
      ? currentAuthMethods
      : [
          ...currentAuthMethods,
          {
            authMethod: 'google',
            uid: user.uid,
            linkedAt: Date.now(),
          },
        ];

    // Update the user's profile
    await setDoc(
      doc(db, 'users', existingUser.id),
      {
        lastActive: Date.now(),
        authMethods: updatedAuthMethods,
      },
      { merge: true }
    );

    return {
      user,
      userProfile: {
        ...existingUser,
        lastActive: Date.now(),
      },
      isNewUser: false,
    };
  }

  // Check if we already have a user document with this uid
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);

  if (userDoc.exists()) {
    // User document exists with this UID
    const userProfile = {
      id: userDoc.id,
      ...userDoc.data(),
    } as UserProfile;

    // Update last active timestamp
    await setDoc(userRef, { lastActive: Date.now() }, { merge: true });

    return { user, userProfile, isNewUser: false };
  }

  // This is a new user, create a profile
  isNewUser = true;
  const userData = mergeUserDataFromAuth(user);

  const newUserProfile = await createUserProfile(user.uid, userData);

  return { user, userProfile: newUserProfile, isNewUser };
};

// Handle redirect result (call this when the app loads after a redirect)
export const handleRedirectResult = async (): Promise<{
  user: User;
  userProfile: UserProfile;
  isNewUser: boolean;
} | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      return await processGoogleSignInResult(result.user);
    }
    return null;
  } catch (error) {
    console.error('Error handling redirect result:', error);
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
): Promise<{
  user: User;
  userProfile: UserProfile;
  isNewUser: boolean;
}> => {
  try {
    // Create credential
    const credential = PhoneAuthProvider.credential(verificationId, otp);

    // Sign in with credential
    const userCredential = await signInWithCredential(auth, credential);
    const user = userCredential.user;

    // Check if we already have a user with this phone number
    let existingUser = null;
    let isNewUser = false;

    if (user.phoneNumber) {
      existingUser = await findUserByPhone(user.phoneNumber);
    }

    // If user exists with this phone, update with phone auth info
    if (existingUser) {
      // Update the user's last active timestamp
      // Get current auth methods
      const currentAuthMethods = existingUser.authMethods || [];

      // Check if this phone auth method already exists
      const hasPhoneMethod = currentAuthMethods.some(
        (method) => method.authMethod === 'phone' && method.uid === user.uid
      );

      // Only add if it doesn't exist
      const updatedAuthMethods = hasPhoneMethod
        ? currentAuthMethods
        : [
            ...currentAuthMethods,
            {
              authMethod: 'phone',
              uid: user.uid,
              linkedAt: Date.now(),
            },
          ];

      // Update the user's profile
      await setDoc(
        doc(db, 'users', existingUser.id),
        {
          lastActive: Date.now(),
          authMethods: updatedAuthMethods,
        },
        { merge: true }
      );

      return {
        user,
        userProfile: {
          ...existingUser,
          lastActive: Date.now(),
        },
        isNewUser: false,
      };
    }

    // Check if we already have a user document with this uid
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      // User document exists with this UID
      const userProfile = {
        id: userDoc.id,
        ...userDoc.data(),
      } as UserProfile;

      // Update last active timestamp
      await setDoc(userRef, { lastActive: Date.now() }, { merge: true });

      return { user, userProfile, isNewUser: false };
    }

    // This is a new user, create a profile
    isNewUser = true;
    const userData = mergeUserDataFromAuth({
      uid: user.uid,
      displayName: userName,
      phoneNumber: user.phoneNumber,
      providerId: 'phone',
    });

    const newUserProfile = await createUserProfile(user.uid, userData);

    return { user, userProfile: newUserProfile, isNewUser };
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
