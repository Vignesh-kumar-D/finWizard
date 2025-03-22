// utils/transaction.ts
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
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config';
import {
  Transaction,
  Payee,
  RecurringTransaction,
  TransactionTag,
} from '@/types/transaction';
import { TransactionType } from '@/types';

// Constants
const TRANSACTIONS_COLLECTION = 'transactions';
const PAYEES_COLLECTION = 'payees';
const RECURRING_COLLECTION = 'recurringTransactions';
const TAGS_COLLECTION = 'transactionTags';

/**
 * Get user transactions with optional filters
 */
export const getUserTransactions = async (
  userId: string,
  filters: {
    startDate?: number;
    endDate?: number;
    type?: TransactionType;
    categoryId?: string;
    accountId?: string;
    payeeId?: string;
    tags?: string[];
    limit?: number;
  } = {}
): Promise<Transaction[]> => {
  try {
    const transactionsRef = collection(db, TRANSACTIONS_COLLECTION);

    // Start with base query filtering by userId
    let q = query(transactionsRef, where('userId', '==', userId));

    // Apply additional filters if provided
    if (filters.startDate) {
      q = query(q, where('date', '>=', filters.startDate));
    }

    if (filters.endDate) {
      q = query(q, where('date', '<=', filters.endDate));
    }

    if (filters.type) {
      q = query(q, where('type', '==', filters.type));
    }

    if (filters.categoryId) {
      q = query(q, where('categoryId', '==', filters.categoryId));
    }

    if (filters.accountId) {
      q = query(q, where('accountId', '==', filters.accountId));
    }

    if (filters.payeeId) {
      q = query(q, where('payeeId', '==', filters.payeeId));
    }

    // Sort by date descending (newest first)
    q = query(q, orderBy('date', 'desc'));

    // Apply limit if provided
    if (filters.limit) {
      q = query(q, limit(filters.limit));
    }

    const querySnapshot = await getDocs(q);

    const transactions: Transaction[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      transactions.push({
        id: doc.id,
        userId: data.userId,
        date: data.date?.toMillis ? data.date.toMillis() : data.date,
        amount: data.amount,
        type: data.type,
        categoryId: data.categoryId,
        accountId: data.accountId,
        toAccountId: data.toAccountId,
        payeeId: data.payeeId,
        payeeName: data.payeeName,
        paymentMethod: data.paymentMethod,
        description: data.description,
        tags: data.tags,
        receiptImageUrl: data.receiptImageUrl || null,
        location: data.location,
        isPlanned: data.isPlanned || false,
        isRecurring: data.isRecurring || false,
        recurringId: data.recurringId,
        createdAt: data.createdAt?.toMillis
          ? data.createdAt.toMillis()
          : data.createdAt,
        updatedAt: data.updatedAt?.toMillis
          ? data.updatedAt.toMillis()
          : data.updatedAt,
      });
    });

    return transactions;
  } catch (error) {
    console.error('Error getting user transactions:', error);
    throw error;
  }
};

/**
 * Get a single transaction by ID
 */
export const getTransactionById = async (
  transactionId: string
): Promise<Transaction | null> => {
  try {
    const transactionRef = doc(db, TRANSACTIONS_COLLECTION, transactionId);
    const transactionDoc = await getDoc(transactionRef);

    if (!transactionDoc.exists()) {
      return null;
    }

    const data = transactionDoc.data();
    return {
      id: transactionDoc.id,
      userId: data.userId,
      date: data.date?.toMillis ? data.date.toMillis() : data.date,
      amount: data.amount,
      type: data.type,
      categoryId: data.categoryId,
      accountId: data.accountId,
      toAccountId: data.toAccountId,
      payeeId: data.payeeId,
      payeeName: data.payeeName,
      paymentMethod: data.paymentMethod,
      description: data.description,
      tags: data.tags,
      receiptImageUrl: data.receiptImageUrl,
      location: data.location,
      isPlanned: data.isPlanned || false,
      isRecurring: data.isRecurring || false,
      recurringId: data.recurringId,
      createdAt: data.createdAt?.toMillis
        ? data.createdAt.toMillis()
        : data.createdAt,
      updatedAt: data.updatedAt?.toMillis
        ? data.updatedAt.toMillis()
        : data.updatedAt,
    };
  } catch (error) {
    console.error('Error getting transaction:', error);
    throw error;
  }
};

/**
 * Create a new transaction
 */
export const createTransaction = async (
  transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>,
  receiptImage?: File
): Promise<Transaction> => {
  try {
    // Upload receipt image if provided
    let receiptImageUrl;
    if (receiptImage) {
      const storageRef = ref(
        storage,
        `receipts/${transactionData.userId}/${Date.now()}_${receiptImage.name}`
      );
      await uploadBytes(storageRef, receiptImage);
      receiptImageUrl = await getDownloadURL(storageRef);
    }

    // Prepare transaction data
    const transaction = {
      ...transactionData,
      receiptImageUrl: receiptImageUrl || transactionData.receiptImageUrl,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Create transaction
    const transactionsRef = collection(db, TRANSACTIONS_COLLECTION);
    const docRef = await addDoc(transactionsRef, transaction);

    // Return the created transaction
    return {
      id: docRef.id,
      ...transactionData,
      receiptImageUrl: receiptImageUrl || transactionData.receiptImageUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
};

/**
 * Update an existing transaction
 */
export const updateTransaction = async (
  transactionId: string,
  transactionData: Partial<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>,
  receiptImage?: File | null
): Promise<void> => {
  try {
    // Upload receipt image if provided
    let receiptImageUrl;
    if (receiptImage) {
      const storageRef = ref(
        storage,
        `receipts/${transactionData.userId}/${Date.now()}_${receiptImage.name}`
      );
      await uploadBytes(storageRef, receiptImage);
      receiptImageUrl = await getDownloadURL(storageRef);
    }

    // Prepare update data
    const updateData = {
      ...transactionData,
      updatedAt: serverTimestamp(),
    };

    // Add receipt URL if it was uploaded
    if (receiptImageUrl) {
      updateData.receiptImageUrl = receiptImageUrl;
    }

    // Update transaction
    const transactionRef = doc(db, TRANSACTIONS_COLLECTION, transactionId);
    await updateDoc(transactionRef, updateData);
  } catch (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }
};

/**
 * Delete a transaction
 */
export const deleteTransaction = async (
  transactionId: string
): Promise<void> => {
  try {
    await deleteDoc(doc(db, TRANSACTIONS_COLLECTION, transactionId));
  } catch (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
};

/**
 * Get user payees
 */
export const getUserPayees = async (userId: string): Promise<Payee[]> => {
  try {
    const payeesRef = collection(db, PAYEES_COLLECTION);
    const q = query(payeesRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    const payees: Payee[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      payees.push({
        id: doc.id,
        userId: data.userId,
        name: data.name,
        type: data.type,
        accountId: data.accountId,
        contactInfo: data.contactInfo,
        createdAt: data.createdAt?.toMillis
          ? data.createdAt.toMillis()
          : data.createdAt,
      });
    });

    return payees;
  } catch (error) {
    console.error('Error getting user payees:', error);
    throw error;
  }
};

/**
 * Create a new payee
 */
export const createPayee = async (
  payeeData: Omit<Payee, 'id' | 'createdAt'>
): Promise<Payee> => {
  try {
    const payeesRef = collection(db, PAYEES_COLLECTION);
    const docRef = await addDoc(payeesRef, {
      ...payeeData,
      createdAt: serverTimestamp(),
    });

    return {
      id: docRef.id,
      ...payeeData,
      createdAt: Date.now(),
    };
  } catch (error) {
    console.error('Error creating payee:', error);
    throw error;
  }
};

/**
 * Create a recurring transaction
 */
export const createRecurringTransaction = async (
  recurringData: Omit<RecurringTransaction, 'id' | 'createdAt' | 'updatedAt'>
): Promise<RecurringTransaction> => {
  try {
    const recurringRef = collection(db, RECURRING_COLLECTION);
    const docRef = await addDoc(recurringRef, {
      ...recurringData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: docRef.id,
      ...recurringData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  } catch (error) {
    console.error('Error creating recurring transaction:', error);
    throw error;
  }
};

/**
 * Get user transaction tags
 */
export const getUserTransactionTags = async (
  userId: string
): Promise<TransactionTag[]> => {
  try {
    const tagsRef = collection(db, TAGS_COLLECTION);
    const q = query(tagsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    const tags: TransactionTag[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      tags.push({
        id: doc.id,
        userId: data.userId,
        name: data.name,
        color: data.color,
        createdAt: data.createdAt?.toMillis
          ? data.createdAt.toMillis()
          : data.createdAt,
      });
    });

    return tags;
  } catch (error) {
    console.error('Error getting user transaction tags:', error);
    throw error;
  }
};

/**
 * Create a transaction tag
 */
export const createTransactionTag = async (
  tagData: Omit<TransactionTag, 'id' | 'createdAt'>
): Promise<TransactionTag> => {
  try {
    const tagsRef = collection(db, TAGS_COLLECTION);
    const docRef = await addDoc(tagsRef, {
      ...tagData,
      createdAt: serverTimestamp(),
    });

    return {
      id: docRef.id,
      ...tagData,
      createdAt: Date.now(),
    };
  } catch (error) {
    console.error('Error creating transaction tag:', error);
    throw error;
  }
};
