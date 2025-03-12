// contexts/BudgetContext.tsx
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
  getBudgetsWithCategories,
  getBudgetSummary,
  saveBudget,
  deleteBudget,
  applyRollovers,
  getCurrentMonth,
} from './utils/budget';
import { getUserCategories } from './utils/category';
import { Budget, BudgetSummary, BudgetWithCategory } from '@/types/budget.type';
import { Category } from '@/types';

interface BudgetContextType {
  budgets: BudgetWithCategory[];
  categories: Category[];
  summary: BudgetSummary | null;
  currentMonth: string;
  loading: boolean;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  refreshBudgets: () => Promise<void>;
  createBudget: (
    budget: Omit<Budget, 'id' | 'userId' | 'lastUpdated'>
  ) => Promise<Budget>;
  updateBudget: (
    budget: Omit<Budget, 'userId' | 'lastUpdated'>
  ) => Promise<Budget>;
  removeBudget: (id: string) => Promise<void>;
  applyMonthlyRollovers: () => Promise<void>;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export const useBudgets = () => {
  const context = useContext(BudgetContext);
  if (context === undefined) {
    throw new Error('useBudgets must be used within a BudgetProvider');
  }
  return context;
};

export const BudgetProvider = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useFirebase();
  const [budgets, setBudgets] = useState<BudgetWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const currentMonth = getCurrentMonth();

  // Load budgets whenever user or selected month changes
  const refreshBudgets = useCallback(async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      // Load categories
      const userCategories = await getUserCategories(currentUser.uid);
      setCategories(userCategories);

      // Load budgets with category details
      const budgetsWithCats = await getBudgetsWithCategories(
        currentUser.uid,
        selectedMonth
      );
      setBudgets(budgetsWithCats);

      // Load budget summary
      const budgetSummary = await getBudgetSummary(
        currentUser.uid,
        selectedMonth
      );
      setSummary(budgetSummary);
    } catch (error) {
      console.error('Error loading budget data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, currentUser]);
  useEffect(() => {
    if (currentUser) {
      refreshBudgets();
    } else {
      setBudgets([]);
      setCategories([]);
      setSummary(null);
      setLoading(false);
    }
  }, [currentUser, selectedMonth, refreshBudgets]);

  // Refresh budget data

  // Create a new budget
  const createBudget = async (
    budgetData: Omit<Budget, 'id' | 'userId' | 'lastUpdated'>
  ): Promise<Budget> => {
    if (!currentUser) {
      throw new Error('You must be logged in to create a budget');
    }

    const newBudget = await saveBudget({
      ...budgetData,
      userId: currentUser.uid,
    });

    await refreshBudgets();
    return newBudget;
  };

  // Update an existing budget
  const updateBudget = async (
    budgetData: Omit<Budget, 'userId' | 'lastUpdated'>
  ): Promise<Budget> => {
    if (!currentUser) {
      throw new Error('You must be logged in to update a budget');
    }

    const updatedBudget = await saveBudget({
      ...budgetData,
      userId: currentUser.uid,
    });

    await refreshBudgets();
    return updatedBudget;
  };

  // Remove a budget
  const removeBudget = async (id: string): Promise<void> => {
    await deleteBudget(id);
    await refreshBudgets();
  };

  // Apply rollovers from previous month
  const applyMonthlyRollovers = async (): Promise<void> => {
    if (!currentUser) {
      throw new Error('You must be logged in to apply rollovers');
    }

    await applyRollovers(currentUser.uid, selectedMonth);
    await refreshBudgets();
  };

  const value = {
    budgets,
    categories,
    summary,
    currentMonth,
    loading,
    selectedMonth,
    setSelectedMonth,
    refreshBudgets,
    createBudget,
    updateBudget,
    removeBudget,
    applyMonthlyRollovers,
  };

  return (
    <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
  );
};
