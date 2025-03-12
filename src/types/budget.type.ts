// types/budget.ts

// Budget interface
export interface Budget {
  id: string;
  userId: string;
  month: string; // Format: YYYY-MM
  categoryId: string;
  plannedAmount: number;
  spentAmount: number;
  rolloverEnabled: boolean;
  lastUpdated: number; // Timestamp
}

// Budget summary interface
export interface BudgetSummary {
  month: string;
  expenseTotal: number;
  expensePlanned: number;
  savingsTotal: number;
  savingsPlanned: number;
  investmentTotal: number;
  investmentPlanned: number;
  incomeTotal: number;
  incomePlanned: number;
}

// Budget with category details
export interface BudgetWithCategory extends Budget {
  category: {
    name: string;
    color: string;
    icon: string;
    isExpense: boolean;
    isIncome: boolean;
    isInvestment: boolean;
  };
  progress: number; // Percentage of budget used
  remaining: number; // Amount remaining
  status: 'under' | 'on-track' | 'over';
}

// Constants
export const CURRENCY = '₹';
export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
