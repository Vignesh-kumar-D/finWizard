// utils/systemCategories.ts
import {
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { db } from '../config';
import { defaultCategories } from '@/lib/defaultCategories';

/**
 * Check if system categories exist in the database
 */
export const checkSystemCategoriesExist = async (): Promise<boolean> => {
  try {
    const categoriesRef = collection(db, 'categories');
    const q = query(categoriesRef, where('isSystem', '==', true));
    const querySnapshot = await getDocs(q);

    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking system categories:', error);
    return false;
  }
};

/**
 * Initialize system categories in the database
 * This should be called only once during app setup
 */
export const initializeSystemCategories = async (): Promise<void> => {
  try {
    // First check if system categories already exist
    const systemCategoriesExist = await checkSystemCategoriesExist();

    if (systemCategoriesExist) {
      console.log('System categories already exist. Skipping initialization.');
      return;
    }

    // Create a batch write operation
    const batch = writeBatch(db);
    const categoriesRef = collection(db, 'categories');

    // Add all default categories with system flag
    defaultCategories.forEach((category) => {
      const categoryRef = doc(categoriesRef);
      batch.set(categoryRef, {
        ...category,
        userId: 'system', // Special userId to mark system categories
        isSystem: true,
        createdAt: Date.now(),
      });
    });

    // Commit the batch
    await batch.commit();
    console.log('System categories initialized successfully');
  } catch (error) {
    console.error('Error initializing system categories:', error);
    throw error;
  }
};

/**
 * Admin command to initialize all system categories
 * This should be run once during the application setup or deployment
 */
export const adminInitializeSystemCategories = async () => {
  try {
    await initializeSystemCategories();
    console.log('System categories initialization completed');
  } catch (error) {
    console.error('Error in admin initialization:', error);
  }
};
