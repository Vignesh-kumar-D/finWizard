// utils/budget.ts
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config';
import {
  Budget,
  BudgetSummary,
  BudgetWithCategory,
  MONTHS,
} from '@/types/budget.type';
import { getCategoryById, getUserCategories } from './category';

// Constants
const COLLECTION_NAME = 'budgets';

/**
 * Get current month in YYYY-MM format
 */
export const getCurrentMonth = (): string => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}`;
};

/**
 * Get previous month in YYYY-MM format
 */
export const getPreviousMonth = (): string => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}`;
};

/**
 * Format month string (YYYY-MM) to display name
 */
export const formatMonth = (month: string): string => {
  const [year, monthNum] = month.split('-');
  const monthIndex = parseInt(monthNum, 10) - 1;
  return `${MONTHS[monthIndex]} ${year}`;
};

/**
 * Get all budgets for a user for a specific month
 */
export const getUserBudgets = async (
  userId: string,
  month: string = getCurrentMonth()
): Promise<Budget[]> => {
  try {
    const budgetsRef = collection(db, COLLECTION_NAME);
    const q = query(
      budgetsRef,
      where('userId', '==', userId),
      where('month', '==', month)
    );
    const querySnapshot = await getDocs(q);

    const budgets: Budget[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      budgets.push({
        id: doc.id,
        userId: data.userId,
        month: data.month,
        categoryId: data.categoryId,
        plannedAmount: data.plannedAmount,
        spentAmount: data.spentAmount,
        rolloverEnabled: data.rolloverEnabled || false,
        lastUpdated: data.lastUpdated?.toMillis() || Date.now(),
      });
    });

    return budgets;
  } catch (error) {
    console.error('Error getting user budgets:', error);
    throw error;
  }
};

/**
 * Get budget with category details
 */
export const getBudgetsWithCategories = async (
  userId: string,
  month: string = getCurrentMonth()
): Promise<BudgetWithCategory[]> => {
  try {
    const budgets = await getUserBudgets(userId, month);
    const categories = await getUserCategories(userId);

    // Map budgets to include category details
    const budgetsWithCategories: BudgetWithCategory[] = budgets.map(
      (budget) => {
        const category = categories.find((cat) => cat.id === budget.categoryId);

        if (!category) {
          throw new Error(`Category not found for budget: ${budget.id}`);
        }

        const progress =
          budget.plannedAmount > 0
            ? (budget.spentAmount / budget.plannedAmount) * 100
            : 0;
        const remaining = budget.plannedAmount - budget.spentAmount;

        let status: 'under' | 'on-track' | 'over' = 'on-track';
        if (progress < 80) status = 'under';
        if (progress > 100) status = 'over';

        return {
          ...budget,
          category: {
            name: category.name,
            color: category.color,
            icon: category.icon,
            isExpense: category.isExpense,
            isIncome: category.isIncome,
            isInvestment: category.isInvestment,
          },
          progress,
          remaining,
          status,
        };
      }
    );

    return budgetsWithCategories;
  } catch (error) {
    console.error('Error getting budgets with categories:', error);
    throw error;
  }
};

/**
 * Create or update a budget
 */
export const saveBudget = async (
  budget: Omit<Budget, 'id' | 'lastUpdated'>
): Promise<Budget> => {
  try {
    // Check if budget already exists for this category and month
    const budgetsRef = collection(db, COLLECTION_NAME);
    const q = query(
      budgetsRef,
      where('userId', '==', budget.userId),
      where('month', '==', budget.month),
      where('categoryId', '==', budget.categoryId)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Update existing budget
      const existingDoc = querySnapshot.docs[0];
      //   const existingBudget = existingDoc.data() as Budget;

      await updateDoc(doc(db, COLLECTION_NAME, existingDoc.id), {
        ...budget,
        lastUpdated: serverTimestamp(),
      });

      return {
        ...budget,
        id: existingDoc.id,
        lastUpdated: Date.now(),
      };
    } else {
      // Create new budget
      const docRef = await addDoc(budgetsRef, {
        ...budget,
        lastUpdated: serverTimestamp(),
      });

      return {
        ...budget,
        id: docRef.id,
        lastUpdated: Date.now(),
      };
    }
  } catch (error) {
    console.error('Error saving budget:', error);
    throw error;
  }
};

/**
 * Delete a budget
 */
export const deleteBudget = async (budgetId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, budgetId));
  } catch (error) {
    console.error('Error deleting budget:', error);
    throw error;
  }
};

/**
 * Calculate budget summary for a month
 */
export const getBudgetSummary = async (
  userId: string,
  month: string = getCurrentMonth()
): Promise<BudgetSummary> => {
  try {
    const budgetsWithCategories = await getBudgetsWithCategories(userId, month);

    let expenseTotal = 0;
    let expensePlanned = 0;
    let savingsTotal = 0;
    let savingsPlanned = 0;
    let investmentTotal = 0;
    let investmentPlanned = 0;
    let incomeTotal = 0;
    let incomePlanned = 0;

    budgetsWithCategories.forEach((budget) => {
      if (budget.category.isExpense) {
        expenseTotal += budget.spentAmount;
        expensePlanned += budget.plannedAmount;
      } else if (budget.category.isInvestment) {
        investmentTotal += budget.spentAmount;
        investmentPlanned += budget.plannedAmount;
      } else if (budget.category.isIncome) {
        incomeTotal += budget.spentAmount;
        incomePlanned += budget.plannedAmount;
      } else {
        // Assume savings if not categorized
        savingsTotal += budget.spentAmount;
        savingsPlanned += budget.plannedAmount;
      }
    });

    return {
      month,
      expenseTotal,
      expensePlanned,
      savingsTotal,
      savingsPlanned,
      investmentTotal,
      investmentPlanned,
      incomeTotal,
      incomePlanned,
    };
  } catch (error) {
    console.error('Error getting budget summary:', error);
    throw error;
  }
};

/**
 * Apply rollovers from previous month
 */
export const applyRollovers = async (
  userId: string,
  targetMonth: string = getCurrentMonth()
): Promise<void> => {
  try {
    // Parse the target month to get previous month
    const [year, month] = targetMonth.split('-').map(Number);
    const previousDate = new Date(year, month - 2); // -2 because months are 0-indexed
    const previousMonth = `${previousDate.getFullYear()}-${String(
      previousDate.getMonth() + 1
    ).padStart(2, '0')}`;

    // Get previous month's budgets
    const previousBudgets = await getUserBudgets(userId, previousMonth);

    // For each previous budget with rollover enabled
    for (const prevBudget of previousBudgets) {
      if (prevBudget.rolloverEnabled) {
        // Calculate the rollover amount (unspent or overspent)
        const rolloverAmount =
          prevBudget.plannedAmount - prevBudget.spentAmount;

        if (rolloverAmount !== 0) {
          // Find if there's a budget for this category in the target month
          const budgetsRef = collection(db, COLLECTION_NAME);
          const q = query(
            budgetsRef,
            where('userId', '==', userId),
            where('month', '==', targetMonth),
            where('categoryId', '==', prevBudget.categoryId)
          );
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            // Update existing budget with rollover
            const existingDoc = querySnapshot.docs[0];
            const existingBudget = existingDoc.data() as Budget;

            await updateDoc(doc(db, COLLECTION_NAME, existingDoc.id), {
              plannedAmount: existingBudget.plannedAmount + rolloverAmount,
              lastUpdated: serverTimestamp(),
            });
          } else {
            // Create new budget with the rollover amount
            const category = await getCategoryById(prevBudget.categoryId);

            if (category) {
              await addDoc(budgetsRef, {
                userId,
                month: targetMonth,
                categoryId: prevBudget.categoryId,
                plannedAmount: rolloverAmount > 0 ? rolloverAmount : 0, // Don't start with negative budget
                spentAmount: 0,
                rolloverEnabled: prevBudget.rolloverEnabled,
                lastUpdated: serverTimestamp(),
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error applying rollovers:', error);
    throw error;
  }
};
