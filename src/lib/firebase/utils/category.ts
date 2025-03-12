// utils/category.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config';
import { Category } from '@/types';

// Constants
const COLLECTION_NAME = 'categories';

/**
 * Get all categories for a user, including system categories
 */
export const getUserCategories = async (
  userId: string
): Promise<Category[]> => {
  try {
    const categoriesRef = collection(db, COLLECTION_NAME);

    // Get both user categories and system categories
    const q = query(categoriesRef, where('userId', 'in', [userId, 'system']));

    const querySnapshot = await getDocs(q);

    const categories: Category[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      categories.push({
        id: doc.id,
        userId: data.userId,
        name: data.name,
        color: data.color,
        icon: data.icon,
        isSystem: data.isSystem || false,
        isIncome: data.isIncome || false,
        isExpense: data.isExpense || false,
        isInvestment: data.isInvestment || false,
        createdAt: data.createdAt || Date.now(),
      });
    });

    return categories;
  } catch (error) {
    console.error('Error getting categories:', error);
    throw error;
  }
};

/**
 * Get category by ID
 */
export const getCategoryById = async (
  categoryId: string
): Promise<Category | null> => {
  try {
    const categoryRef = doc(db, COLLECTION_NAME, categoryId);
    const categoryDoc = await getDoc(categoryRef);

    if (!categoryDoc.exists()) {
      return null;
    }

    const data = categoryDoc.data();
    return {
      id: categoryDoc.id,
      userId: data.userId,
      name: data.name,
      color: data.color,
      icon: data.icon,
      isSystem: data.isSystem || false,
      isIncome: data.isIncome || false,
      isExpense: data.isExpense || false,
      isInvestment: data.isInvestment || false,
      createdAt: data.createdAt?.toMillis() || Date.now(),
    };
  } catch (error) {
    console.error('Error getting category:', error);
    throw error;
  }
};

/**
 * Create a new category
 */
export const createCategory = async (
  categoryData: Omit<Category, 'id' | 'createdAt'>
): Promise<Category> => {
  try {
    const categoriesRef = collection(db, COLLECTION_NAME);
    const docRef = await addDoc(categoriesRef, {
      ...categoryData,
      createdAt: serverTimestamp(),
    });

    return {
      id: docRef.id,
      ...categoryData,
      createdAt: Date.now(),
    };
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
};

/**
 * Update an existing category
 */
export const updateCategory = async (
  categoryId: string,
  categoryData: Partial<
    Omit<Category, 'id' | 'userId' | 'createdAt' | 'isSystem'>
  >
): Promise<void> => {
  try {
    // First check if the category is a system category
    const category = await getCategoryById(categoryId);

    if (category?.isSystem) {
      throw new Error('Cannot modify system categories');
    }

    const categoryRef = doc(db, COLLECTION_NAME, categoryId);
    await updateDoc(categoryRef, categoryData);
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

/**
 * Delete a category
 */
export const deleteCategory = async (categoryId: string): Promise<void> => {
  try {
    // First check if the category is a system category
    const category = await getCategoryById(categoryId);

    if (category?.isSystem) {
      throw new Error('Cannot delete system categories');
    }

    await deleteDoc(doc(db, COLLECTION_NAME, categoryId));
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

/**
 * Get categories grouped by type
 */
export const getCategoriesByType = async (
  userId: string
): Promise<{
  income: Category[];
  expense: Category[];
  investment: Category[];
}> => {
  try {
    const categories = await getUserCategories(userId);

    return {
      income: categories.filter((cat) => cat.isIncome),
      expense: categories.filter((cat) => cat.isExpense),
      investment: categories.filter((cat) => cat.isInvestment),
    };
  } catch (error) {
    console.error('Error getting categories by type:', error);
    throw error;
  }
};
