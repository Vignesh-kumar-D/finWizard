// utils/account.ts
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
import { Account, AccountType } from '@/types';

/**
 * Get all accounts for a user
 */
export const getUserAccounts = async (userId: string): Promise<Account[]> => {
  try {
    const accountsRef = collection(db, 'accounts');
    const q = query(accountsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    const accounts: Account[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      accounts.push({
        id: doc.id,
        userId: data.userId,
        name: data.name,
        type: data.type as AccountType,
        balance: data.balance,
        lastUpdated: data.lastUpdated?.toMillis() || Date.now(),
        icon: data.icon || '',
        isDefault: data.isDefault || false,
        notes: data.notes || '',
      });
    });

    return accounts;
  } catch (error) {
    console.error('Error getting user accounts:', error);
    throw error;
  }
};

/**
 * Get a single account by ID
 */
export const getAccountById = async (
  accountId: string
): Promise<Account | null> => {
  try {
    const accountRef = doc(db, 'accounts', accountId);
    const accountDoc = await getDoc(accountRef);

    if (!accountDoc.exists()) {
      return null;
    }

    const data = accountDoc.data();
    return {
      id: accountDoc.id,
      userId: data.userId,
      name: data.name,
      type: data.type as AccountType,
      balance: data.balance,
      lastUpdated: data.lastUpdated?.toMillis() || Date.now(),
      icon: data.icon || '',
      isDefault: data.isDefault || false,
      notes: data.notes || '',
    };
  } catch (error) {
    console.error('Error getting account:', error);
    throw error;
  }
};

/**
 * Create a new account
 */
export const createAccount = async (
  accountData: Omit<Account, 'id' | 'lastUpdated'>
): Promise<Account> => {
  try {
    // Check if this is the first account, make it default if so
    let isDefault = accountData.isDefault;

    if (!isDefault) {
      const existingAccounts = await getUserAccounts(accountData.userId);
      isDefault = existingAccounts.length === 0;
    }

    // If setting this account as default, unset any existing default account
    if (isDefault) {
      await unsetDefaultAccounts(accountData.userId);
    }

    const accountsRef = collection(db, 'accounts');
    const accountRef = await addDoc(accountsRef, {
      ...accountData,
      isDefault,
      lastUpdated: serverTimestamp(),
    });

    // Return the created account with ID
    return {
      id: accountRef.id,
      ...accountData,
      isDefault,
      lastUpdated: Date.now(),
    };
  } catch (error) {
    console.error('Error creating account:', error);
    throw error;
  }
};

/**
 * Update an existing account
 */
export const updateAccount = async (
  accountId: string,
  accountData: Partial<Omit<Account, 'id' | 'userId'>>
): Promise<void> => {
  try {
    const accountRef = doc(db, 'accounts', accountId);

    // If setting this account as default, unset any existing default accounts
    if (accountData.isDefault) {
      // Get the current account to get the user ID
      const accountDoc = await getDoc(accountRef);
      if (accountDoc.exists()) {
        const userId = accountDoc.data().userId;
        await unsetDefaultAccounts(userId);
      }
    }

    await updateDoc(accountRef, {
      ...accountData,
      lastUpdated: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating account:', error);
    throw error;
  }
};

/**
 * Delete an account
 */
export const deleteAccount = async (accountId: string): Promise<void> => {
  try {
    // Check if this is a default account
    const account = await getAccountById(accountId);

    if (!account) {
      throw new Error('Account not found');
    }

    // Delete the account
    await deleteDoc(doc(db, 'accounts', accountId));

    // If the deleted account was the default, set a new default
    if (account.isDefault) {
      const userAccounts = await getUserAccounts(account.userId);

      if (userAccounts.length > 0) {
        // Set the first account as default
        await updateAccount(userAccounts[0].id, { isDefault: true });
      }
    }
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
};

/**
 * Unset default flag for all user accounts
 */
const unsetDefaultAccounts = async (userId: string): Promise<void> => {
  try {
    const accounts = await getUserAccounts(userId);

    // Find the current default account
    const defaultAccount = accounts.find((account) => account.isDefault);

    if (defaultAccount) {
      const accountRef = doc(db, 'accounts', defaultAccount.id);
      await updateDoc(accountRef, { isDefault: false });
    }
  } catch (error) {
    console.error('Error unsetting default accounts:', error);
    throw error;
  }
};

/**
 * Get total balance across all accounts
 */
export const getTotalBalance = async (userId: string): Promise<number> => {
  try {
    const accounts = await getUserAccounts(userId);
    return accounts.reduce((total, account) => {
      // Consider credit accounts as negative balance
      const multiplier =
        account.type === 'credit-card' || account.type === 'loan' ? -1 : 1;
      return total + account.balance * multiplier;
    }, 0);
  } catch (error) {
    console.error('Error calculating total balance:', error);
    throw error;
  }
};

/**
 * Format account balance based on account type
 */
export const formatAccountBalance = (account: Account): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'INR', // TODO: Make this configurable
  });

  if (account.type === 'credit-card') {
    return formatter.format(-account.balance);
  }

  return formatter.format(account.balance);
};

/**
 * Get an appropriate icon name for account type
 */
export const getAccountIconName = (type: AccountType): string => {
  switch (type) {
    case 'checking-bank':
    case 'saving-bank':
      return 'building-bank';
    case 'cash':
      return 'wallet';
    case 'credit-card':
      return 'credit-card';
    case 'investment':
      return 'trend-up';
    case 'upi':
      return 'smartphone';
    case 'loan':
      return 'indian-rupee';
    default:
      return 'receipt-indian-rupee';
  }
};
