// types/index.ts

// User profile
export interface AuthMethod {
  authMethod: 'google' | 'phone';
  uid: string;
  linkedAt: number;
}

// Updated UserProfile interface
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  createdAt: number; // Timestamp
  lastActive: number; // Timestamp
  photoURL?: string;
  authMethods?: AuthMethod[]; // Array of authentication methods
}

// Account types
export type AccountType =
  | 'bank'
  | 'cash'
  | 'credit'
  | 'upi'
  | 'investment'
  | 'loan';

// Account
export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: number;
  lastUpdated: number; // Timestamp
  icon?: string;
  isDefault?: boolean;
  notes?: string;
}

// Transaction types
export type TransactionType = 'income' | 'expense' | 'transfer' | 'investment';

// Payment methods
export type PaymentMethod =
  | 'upi'
  | 'card'
  | 'cash'
  | 'netbanking'
  | 'auto-debit';

// Transaction
export interface Transaction {
  id: string;
  userId: string;
  date: number; // Timestamp
  amount: number;
  type: TransactionType;
  categoryId: string;
  subcategoryId?: string;
  accountId: string;
  toAccountId?: string; // For transfers
  paymentMethod?: PaymentMethod;
  merchantName?: string;
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

// Category
export interface Category {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon: string;
  isSystem: boolean; // System categories cannot be deleted
  isIncome: boolean; // Is this an income category?
  isExpense: boolean; // Is this an expense category?
  isInvestment: boolean; // Is this an investment category?
  createdAt: number; // Timestamp
}

// Subcategory
export interface Subcategory {
  id: string;
  userId: string;
  categoryId: string;
  name: string;
  color?: string;
  icon?: string;
  createdAt: number; // Timestamp
}

// Recurring Transaction Template
export type RecurrenceFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'annually';

export interface RecurringTransaction {
  id: string;
  userId: string;
  title: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  subcategoryId?: string;
  accountId: string;
  frequency: RecurrenceFrequency;
  startDate: number; // Timestamp
  endDate?: number; // Timestamp, null for indefinite
  nextDueDate: number; // Timestamp
  isActive: boolean;
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
}

// Budget
export interface Budget {
  id: string;
  userId: string;
  month: string; // Format: YYYY-MM
  categoryId?: string; // If null, it's an overall budget
  subcategoryId?: string;
  plannedAmount: number;
  spentAmount: number;
  lastUpdated: number; // Timestamp
}

// Investment types
export type InvestmentType =
  | 'mutualFund'
  | 'stock'
  | 'gold'
  | 'fixedDeposit'
  | 'crypto'
  | 'realEstate';

// Investment
export interface Investment {
  id: string;
  userId: string;
  name: string;
  type: InvestmentType;
  purchaseAmount: number;
  purchaseDate: number; // Timestamp
  currentValue: number;
  lastUpdated: number; // Timestamp
  units?: number; // For mutual funds/stocks
  notes?: string;
  accountId?: string; // Associated account if any
}

// Savings Goal
export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  startDate: number; // Timestamp
  targetDate?: number; // Timestamp
  isCompleted: boolean;
  categoryId?: string;
  notes?: string;
  iconOrEmoji?: string;
}

// Group (Family or Shared Expenses)
export interface Group {
  id: string;
  name: string;
  createdBy: string; // userId
  createdAt: number; // Timestamp
  members: GroupMember[];
}

export interface GroupMember {
  userId: string;
  name: string;
  email: string;
  photoURL?: string;
  role: 'admin' | 'member';
  joinedAt: number; // Timestamp
}

// Shared Expense
export interface SharedExpense {
  id: string;
  groupId: string;
  date: number; // Timestamp
  amount: number;
  description: string;
  paidBy: string; // userId
  category?: string;
  receiptImageUrl?: string;
  splits: ExpenseSplit[];
  createdAt: number; // Timestamp
}

export interface ExpenseSplit {
  userId: string;
  amount: number;
  isPaid: boolean;
  paidDate?: number; // Timestamp
}

// Settlement
export interface Settlement {
  id: string;
  groupId: string;
  from: string; // userId
  to: string; // userId
  amount: number;
  date: number; // Timestamp
  relatedExpenseIds: string[];
  notes?: string;
}

// System defaults (predefined categories, etc.)
export interface SystemDefaults {
  categories: Omit<Category, 'userId' | 'id' | 'createdAt'>[];
  subcategories: Omit<Subcategory, 'userId' | 'id' | 'createdAt'>[];
}
