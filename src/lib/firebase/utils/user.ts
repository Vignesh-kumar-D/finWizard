// utils/user.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../config';
import { AuthMethod, UserProfile } from '@/types';

/**
 * Finds a user by email in the users collection
 * @param email User's email address
 * @returns UserProfile if found, null otherwise
 */
export const findUserByEmail = async (
  email: string
): Promise<UserProfile | null> => {
  try {
    if (!email) return null;

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return null;

    // Return the first user with matching email
    const userDoc = querySnapshot.docs[0];
    return {
      id: userDoc.id,
      ...userDoc.data(),
    } as UserProfile;
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw error;
  }
};

/**
 * Finds a user by phone number in the users collection
 * @param phoneNumber User's phone number
 * @returns UserProfile if found, null otherwise
 */
export const findUserByPhone = async (
  phoneNumber: string
): Promise<UserProfile | null> => {
  try {
    if (!phoneNumber) return null;

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return null;

    // Return the first user with matching phone number
    const userDoc = querySnapshot.docs[0];
    return {
      id: userDoc.id,
      ...userDoc.data(),
    } as UserProfile;
  } catch (error) {
    console.error('Error finding user by phone:', error);
    throw error;
  }
};

/**
 * Searches users by name (case-insensitive partial match)
 * @param name User's name to search for
 * @param limit Number of results to return (default: 10)
 * @returns Array of UserProfile objects
 */
export const searchUsersByName = async (
  name: string,
  limitCount: number = 10
): Promise<UserProfile[]> => {
  try {
    if (!name || name.trim().length < 2) return [];

    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('name', '>=', name.toLowerCase()),
      where('name', '<=', name.toLowerCase() + '\uf8ff'),
      orderBy('name'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as UserProfile[];
  } catch (error) {
    console.error('Error searching users by name:', error);
    throw error;
  }
};

/**
 * Comprehensive user search by email, phone, or name
 * @param searchTerm Search term (email, phone, or name)
 * @param limit Number of results to return (default: 10)
 * @returns Array of UserProfile objects
 */
export const searchUsers = async (
  searchTerm: string,
  limitCount: number = 10
): Promise<UserProfile[]> => {
  try {
    if (!searchTerm || searchTerm.trim().length < 2) return [];

    const term = searchTerm.trim().toLowerCase();
    const usersRef = collection(db, 'users');
    const results: UserProfile[] = [];
    const seenIds = new Set<string>();

    // Search by email
    try {
      const emailQuery = query(
        usersRef,
        where('email', '>=', term),
        where('email', '<=', term + '\uf8ff'),
        limit(limitCount)
      );
      const emailSnapshot = await getDocs(emailQuery);

      emailSnapshot.docs.forEach((doc) => {
        if (!seenIds.has(doc.id)) {
          seenIds.add(doc.id);
          results.push({
            id: doc.id,
            ...doc.data(),
          } as UserProfile);
        }
      });
    } catch (error) {
      console.warn('Email search failed:', error);
    }

    // Search by phone number
    try {
      const phoneQuery = query(
        usersRef,
        where('phoneNumber', '>=', term),
        where('phoneNumber', '<=', term + '\uf8ff'),
        limit(limitCount)
      );
      const phoneSnapshot = await getDocs(phoneQuery);

      phoneSnapshot.docs.forEach((doc) => {
        if (!seenIds.has(doc.id)) {
          seenIds.add(doc.id);
          results.push({
            id: doc.id,
            ...doc.data(),
          } as UserProfile);
        }
      });
    } catch (error) {
      console.warn('Phone search failed:', error);
    }

    // Search by name
    try {
      const nameQuery = query(
        usersRef,
        where('name', '>=', term),
        where('name', '<=', term + '\uf8ff'),
        limit(limitCount)
      );
      const nameSnapshot = await getDocs(nameQuery);

      nameSnapshot.docs.forEach((doc) => {
        if (!seenIds.has(doc.id)) {
          seenIds.add(doc.id);
          results.push({
            id: doc.id,
            ...doc.data(),
          } as UserProfile);
        }
      });
    } catch (error) {
      console.warn('Name search failed:', error);
    }

    // Remove duplicates and limit results
    return results.slice(0, limitCount);
  } catch (error) {
    console.error('Error in comprehensive user search:', error);
    throw error;
  }
};

/**
 * Gets all users with pagination
 * @param pageSize Number of users per page (default: 20)
 * @param lastDoc Last document for pagination
 * @returns Object containing users array and last document for next page
 */
export const getAllUsers = async (
  pageSize: number = 20,
  lastDoc?: QueryDocumentSnapshot
): Promise<{
  users: UserProfile[];
  lastDoc: QueryDocumentSnapshot | null;
}> => {
  try {
    const usersRef = collection(db, 'users');
    let q = query(usersRef, orderBy('name'), limit(pageSize));

    if (lastDoc) {
      q = query(
        usersRef,
        orderBy('name'),
        startAfter(lastDoc),
        limit(pageSize)
      );
    }

    const querySnapshot = await getDocs(q);
    const users = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as UserProfile[];

    const lastVisible =
      querySnapshot.docs[querySnapshot.docs.length - 1] || null;

    return {
      users,
      lastDoc: lastVisible,
    };
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
};

/**
 * Gets a user profile by ID
 * @param userId User's ID
 * @returns UserProfile if found, null otherwise
 */
export const getUserById = async (
  userId: string
): Promise<UserProfile | null> => {
  try {
    if (!userId) return null;

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) return null;

    return {
      id: userDoc.id,
      ...userDoc.data(),
    } as UserProfile;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw error;
  }
};

/**
 * Gets multiple users by their IDs
 * @param userIds Array of user IDs
 * @returns Array of UserProfile objects
 */
export const getUsersByIds = async (
  userIds: string[]
): Promise<UserProfile[]> => {
  try {
    if (!userIds.length) return [];

    const users: UserProfile[] = [];

    // Firestore doesn't support 'in' queries with more than 10 items
    // So we'll batch them in groups of 10
    const batchSize = 10;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);

      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('__name__', 'in', batch));
      const querySnapshot = await getDocs(q);

      querySnapshot.docs.forEach((doc) => {
        users.push({
          id: doc.id,
          ...doc.data(),
        } as UserProfile);
      });
    }

    return users;
  } catch (error) {
    console.error('Error getting users by IDs:', error);
    throw error;
  }
};

/**
 * Creates a new user profile in Firestore
 * @param userId Firebase Auth UID
 * @param userData User profile data
 * @returns Promise that resolves when the user is created
 */
export const createUserProfile = async (
  userId: string,
  userData: Omit<UserProfile, 'id'>
): Promise<UserProfile> => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...userData,
      createdAt: Date.now(),
      lastActive: Date.now(),
    });

    return {
      id: userId,
      ...userData,
      createdAt: Date.now(),
      lastActive: Date.now(),
    };
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

/**
 * Updates a user profile in Firestore
 * @param userId Firebase Auth UID
 * @param userData Partial user profile data to update
 * @returns Promise that resolves when the user is updated
 */
export const updateUserProfile = async (
  userId: string,
  userData: Partial<UserProfile>
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...userData,
      lastActive: Date.now(),
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Links a new auth method to an existing user profile
 * When a user logs in with a new auth method but we determine they're
 * an existing user, we'll update their profile with new auth identifiers
 * @param existingUserId Existing user's ID
 * @param newAuthData Auth data from new login method
 * @returns Promise that resolves when the user is updated
 */
export const linkUserAuthMethods = async (
  existingUserId: string,
  newAuthData: {
    authMethod: 'google' | 'phone';
    uid: string;
    email?: string;
    phoneNumber?: string;
    photoURL?: string;
  }
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', existingUserId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User profile not found');
    }

    const userData = userDoc.data() as UserProfile;

    // Update authMethods array
    const authMethods = userData.authMethods || [];
    const hasMethod = authMethods.some(
      (method) => method.authMethod === newAuthData.authMethod
    );

    if (!hasMethod) {
      authMethods.push({
        authMethod: newAuthData.authMethod,
        uid: newAuthData.uid,
        linkedAt: Date.now(),
      });
    }

    // Update user data with new auth method and possibly new contact info
    const updates: Partial<UserProfile> = {
      authMethods,
      lastActive: Date.now(),
    };

    // Only update email if it's provided and user doesn't have one
    if (newAuthData.email && !userData.email) {
      updates.email = newAuthData.email;
    }

    // Only update phone if it's provided and user doesn't have one
    if (newAuthData.phoneNumber && !userData.phoneNumber) {
      updates.phoneNumber = newAuthData.phoneNumber;
    }

    // Only update photo if it's provided and user doesn't have one
    if (newAuthData.photoURL && !userData.photoURL) {
      updates.photoURL = newAuthData.photoURL;
    }

    await updateDoc(userRef, updates);
  } catch (error) {
    console.error('Error linking user auth methods:', error);
    throw error;
  }
};

/**
 * Checks if a user profile is complete with all required fields
 * @param userProfile User profile to check
 * @returns Boolean indicating if the profile is complete
 */
export const isProfileComplete = (userProfile: UserProfile | null): boolean => {
  if (!userProfile) return false;

  // Check if all required fields are present and valid
  return (
    !!userProfile.name.trim() &&
    (!!userProfile.email || !!userProfile.phoneNumber)
    // Additional checks can be added based on your requirement
  );
};

/**
 * Merges data from an auth provider into a user profile
 * @param authUserData Data from authentication provider
 * @param existingProfile Existing user profile (optional)
 * @returns Merged user data
 */
export const mergeUserDataFromAuth = (
  authUserData: {
    uid: string;
    displayName?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
    photoURL?: string | null;
    providerId?: string;
  },
  existingProfile?: UserProfile
): Omit<UserProfile, 'id'> => {
  // Determine auth method based on provider ID or available data
  const authMethod: 'google' | 'phone' =
    authUserData.providerId === 'google.com' || authUserData.email
      ? 'google'
      : 'phone';

  const authMethods: AuthMethod[] = [
    {
      authMethod,
      uid: authUserData.uid,
      linkedAt: Date.now(),
    },
  ];

  // Create new profile or update existing one
  if (existingProfile) {
    return {
      ...existingProfile,
      // Only update fields that are not already set
      name: existingProfile.name || authUserData.displayName || '',
      email: existingProfile.email || authUserData.email || '',
      phoneNumber:
        existingProfile.phoneNumber || authUserData.phoneNumber || '',
      photoURL: existingProfile.photoURL || authUserData.photoURL || '',
      lastActive: Date.now(),
      authMethods: [...(existingProfile.authMethods || []), ...authMethods],
    };
  }

  // Create new user profile
  return {
    name: authUserData.displayName || '',
    email: authUserData.email || '',
    phoneNumber: authUserData.phoneNumber || '',
    photoURL: authUserData.photoURL || '',
    createdAt: Date.now(),
    lastActive: Date.now(),
    authMethods,
  };
};
