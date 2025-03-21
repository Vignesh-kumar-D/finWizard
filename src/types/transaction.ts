// types/transaction.ts
import { z } from 'zod';
import { PaymentMethod, TransactionType } from './index';

// Transaction interfaces
export interface Transaction {
  id: string;
  userId: string;
  date: number; // Timestamp
  amount: number;
  type: TransactionType;
  categoryId: string;
  accountId: string;
  toAccountId?: string; // For transfers
  payeeId?: string;
  payeeName?: string; // In case payee is not in the system
  paymentMethod?: PaymentMethod;
  description?: string;
  tags?: string[];
  receiptImageUrl?: string;
  location?: {
    lat: number;
    lng: number;
  };
  isPlanned: boolean;
  isRecurring: boolean;
  recurringId?: string;
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
}

// Payee interface
export interface Payee {
  id: string;
  userId: string;
  name: string;
  type: 'person' | 'business' | 'account';
  accountId?: string; // If payee is an account
  contactInfo?: string;
  createdAt: number;
}

// Recurring Transaction model
export interface RecurringTransaction {
  id: string;
  userId: string;
  title: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  subcategoryId?: string;
  accountId: string;
  toAccountId?: string;
  payeeId?: string;
  payeeName?: string;
  paymentMethod?: PaymentMethod;
  description?: string;
  tags?: string[];
  frequency: RecurrenceFrequency;
  startDate: number; // Timestamp
  endDate?: number; // Timestamp, null for indefinite
  nextDueDate: number; // Timestamp
  isActive: boolean;
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
}

// Recurrence frequency options
export type RecurrenceFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'annually'
  | 'custom';

// Custom recurrence pattern (for custom frequency)
export interface RecurrencePattern {
  type: 'day' | 'week' | 'month' | 'year';
  interval: number; // Every X days/weeks/months/years
  weekdays?: number[]; // 0 = Sunday, 6 = Saturday
  monthDay?: number; // 1-31
  months?: number[]; // 0 = January, 11 = December
}

// Transaction tag
export interface TransactionTag {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: number;
}

const paymentMethodEnum = z.enum([
  'upi',
  'card',
  'cash',
  'netbanking',
  'auto-debit',
]);
export const transactionFormSchema = z.object({
  type: z.enum(['expense', 'income', 'transfer', 'investment']),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      'Amount must be a positive number'
    ),
  date: z.date({
    required_error: 'Date is required',
  }),
  accountId: z.string().min(1, 'Account is required'),
  toAccountId: z.string().optional(),
  categoryId: z.string().optional(),
  paymentMethod: paymentMethodEnum.optional(),
  description: z.string().optional(),
  recurringId: z.string().optional(),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;
