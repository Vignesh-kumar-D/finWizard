import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { defaultCategories } from './defaultCategories';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
// utils/defaultCategories.ts

// Default categories to be added when a new user signs up

// Function to create default categories for a user
export const createDefaultCategoriesForUser = (userId: string) => {
  return defaultCategories.map((category) => ({
    ...category,
    userId,
  }));
};
