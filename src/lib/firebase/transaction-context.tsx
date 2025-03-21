// contexts/TransactionContext.tsx
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
  getUserTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getUserPayees,
  createPayee,
  getUserTransactionTags,
  createTransactionTag,
  createRecurringTransaction,
} from './utils/transaction';
import {
  Transaction,
  Payee,
  RecurringTransaction,
  TransactionTag,
} from '@/types/transaction';

interface TransactionContextType {
  transactions: Transaction[];
  recentTransactions: Transaction[];
  payees: Payee[];
  tags: TransactionTag[];
  loading: boolean;
  refreshTransactions: () => Promise<void>;
  getTransaction: (id: string) => Promise<Transaction | null>;
  addTransaction: (
    transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>,
    receiptImage?: File
  ) => Promise<Transaction>;
  editTransaction: (
    id: string,
    transaction: Partial<
      Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
    >,
    receiptImage?: File
  ) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  getPayees: () => Promise<Payee[]>;
  addPayee: (payee: Omit<Payee, 'id' | 'createdAt'>) => Promise<Payee>;
  getTags: () => Promise<TransactionTag[]>;
  addTag: (
    tag: Omit<TransactionTag, 'id' | 'createdAt'>
  ) => Promise<TransactionTag>;
  createRecurring: (
    recurring: Omit<RecurringTransaction, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<RecurringTransaction>;
}

const TransactionContext = createContext<TransactionContextType | undefined>(
  undefined
);

export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error(
      'useTransactions must be used within a TransactionProvider'
    );
  }
  return context;
};

export const TransactionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { currentUser } = useFirebase();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(
    []
  );
  const [payees, setPayees] = useState<Payee[]>([]);
  const [tags, setTags] = useState<TransactionTag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Load transactions when user changes
  // Refresh transactions data
  const refreshTransactions = useCallback(async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      // Get all transactions
      const fetchedTransactions = await getUserTransactions(currentUser.uid);
      setTransactions(fetchedTransactions);

      // Get recent transactions (last 10)
      const recent = await getUserTransactions(currentUser.uid, { limit: 10 });
      setRecentTransactions(recent);

      // Get payees
      const userPayees = await getUserPayees(currentUser.uid);
      setPayees(userPayees);

      // Get tags
      const userTags = await getUserTransactionTags(currentUser.uid);
      setTags(userTags);
    } catch (error) {
      console.error('Error fetching transaction data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);
  useEffect(() => {
    if (currentUser) {
      refreshTransactions();
    } else {
      setTransactions([]);
      setRecentTransactions([]);
      setPayees([]);
      setTags([]);
      setLoading(false);
    }
  }, [currentUser, refreshTransactions]);

  // Get a single transaction
  const getTransaction = async (id: string) => {
    return getTransactionById(id);
  };

  // Add a transaction
  const addTransaction = async (
    transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>,
    receiptImage?: File
  ) => {
    if (!currentUser) {
      throw new Error('User must be logged in to add a transaction');
    }

    const newTransaction = await createTransaction(transaction, receiptImage);
    await refreshTransactions();
    return newTransaction;
  };

  // Edit a transaction
  const editTransaction = async (
    id: string,
    transaction: Partial<
      Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
    >,
    receiptImage?: File
  ) => {
    await updateTransaction(id, transaction, receiptImage);
    await refreshTransactions();
  };

  // Remove a transaction
  const removeTransaction = async (id: string) => {
    await deleteTransaction(id);
    await refreshTransactions();
  };

  // Get payees
  const getPayees = async () => {
    if (!currentUser) return [];
    return await getUserPayees(currentUser.uid);
  };

  // Add a payee
  const addPayee = async (payee: Omit<Payee, 'id' | 'createdAt'>) => {
    if (!currentUser) {
      throw new Error('User must be logged in to add a payee');
    }

    const newPayee = await createPayee(payee);
    setPayees([...payees, newPayee]);
    return newPayee;
  };

  // Get tags
  const getTags = async () => {
    if (!currentUser) return [];
    return await getUserTransactionTags(currentUser.uid);
  };

  // Add a tag
  const addTag = async (tag: Omit<TransactionTag, 'id' | 'createdAt'>) => {
    if (!currentUser) {
      throw new Error('User must be logged in to add a tag');
    }

    const newTag = await createTransactionTag(tag);
    setTags([...tags, newTag]);
    return newTag;
  };

  // Create a recurring transaction
  const createRecurring = async (
    recurring: Omit<RecurringTransaction, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!currentUser) {
      throw new Error(
        'User must be logged in to create a recurring transaction'
      );
    }

    return await createRecurringTransaction(recurring);
  };

  const value = {
    transactions,
    recentTransactions,
    payees,
    tags,
    loading,
    refreshTransactions,
    getTransaction,
    addTransaction,
    editTransaction,
    removeTransaction,
    getPayees,
    addPayee,
    getTags,
    addTag,
    createRecurring,
  };

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
};
