// contexts/AccountContext.tsx
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useFirebase } from './firebase-context';
import {
  getUserAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  getTotalBalance,
} from './utils/account';
import { Account } from '@/types';

interface AccountContextType {
  accounts: Account[];
  totalBalance: number;
  loading: boolean;
  getAccount: (id: string) => Promise<Account | null>;
  addAccount: (
    accountData: Omit<Account, 'id' | 'userId' | 'lastUpdated'>
  ) => Promise<Account>;
  editAccount: (
    id: string,
    accountData: Partial<Omit<Account, 'id' | 'userId'>>
  ) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  refreshAccounts: () => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const useAccounts = () => {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccounts must be used within an AccountProvider');
  }
  return context;
};

export const AccountProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { currentUser } = useFirebase();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshAccounts = useCallback(async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const fetchedAccounts = await getUserAccounts(currentUser.uid);
      setAccounts(fetchedAccounts);

      // Calculate total balance
      const total = await getTotalBalance(currentUser.uid);
      setTotalBalance(total);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      // Could add toast notification here
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Load accounts on mount and when user changes
  useEffect(() => {
    if (currentUser) {
      refreshAccounts();
    } else {
      setAccounts([]);
      setTotalBalance(0);
      setLoading(false);
    }
  }, [currentUser, refreshAccounts]);

  // Refresh accounts data

  // Get a single account
  const getAccount = async (id: string) => {
    return getAccountById(id);
  };

  // Add a new account
  const addAccount = async (
    accountData: Omit<Account, 'id' | 'userId' | 'lastUpdated'>
  ) => {
    if (!currentUser) {
      throw new Error('You must be logged in to create an account');
    }

    const newAccount = await createAccount({
      ...accountData,
      userId: currentUser.uid,
    });

    await refreshAccounts();
    return newAccount;
  };

  // Edit an existing account
  const editAccount = async (
    id: string,
    accountData: Partial<Omit<Account, 'id' | 'userId'>>
  ) => {
    await updateAccount(id, accountData);
    await refreshAccounts();
  };

  // Remove an account
  const removeAccount = async (id: string) => {
    await deleteAccount(id);
    await refreshAccounts();
  };

  const value = {
    accounts,
    totalBalance,
    loading,
    getAccount,
    addAccount,
    editAccount,
    removeAccount,
    refreshAccounts,
  };

  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
};
