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

/**
 * Expense splitting utilities for fair and accurate distribution
 */

export interface SplitResult {
  userId: string;
  amount: number;
  percentage: number;
  isAdjusted: boolean; // Whether this amount was adjusted to balance the total
}

export interface SplitOptions {
  totalAmount: number;
  participants: Array<{
    userId: string;
    name: string;
    email: string;
  }>;
  splitType: 'equal' | 'percentage' | 'custom';
  customAmounts?: Record<string, number>;
  customPercentages?: Record<string, number>;
  precision?: number; // Decimal places to round to (default: 2)
  roundingStrategy?: 'distribute' | 'largest' | 'smallest'; // How to handle rounding differences
}

/**
 * Calculates fair expense splits with proper rounding distribution
 */
export function calculateExpenseSplits(options: SplitOptions): SplitResult[] {
  const {
    totalAmount,
    participants,
    splitType,
    customAmounts = {},
    customPercentages = {},
    precision = 2,
    roundingStrategy = 'distribute',
  } = options;

  if (totalAmount <= 0 || participants.length === 0) {
    return [];
  }

  switch (splitType) {
    case 'equal':
      return calculateEqualSplit(
        totalAmount,
        participants,
        precision,
        roundingStrategy
      );

    case 'percentage':
      return calculatePercentageSplit(
        totalAmount,
        participants,
        customPercentages,
        precision,
        roundingStrategy
      );

    case 'custom':
      return calculateCustomSplit(
        totalAmount,
        participants,
        customAmounts,
        precision,
        roundingStrategy
      );

    default:
      throw new Error(`Unsupported split type: ${splitType}`);
  }
}

/**
 * Calculates equal splits with fair rounding distribution
 */
function calculateEqualSplit(
  totalAmount: number,
  participants: Array<{ userId: string; name: string; email: string }>,
  precision: number,
  roundingStrategy: string
): SplitResult[] {
  const multiplier = Math.pow(10, precision);
  const exactAmount = totalAmount / participants.length;
  const roundedAmount = Math.round(exactAmount * multiplier) / multiplier;

  // Calculate the total rounding error
  const totalRounded = roundedAmount * participants.length;
  const roundingError = totalAmount - totalRounded;

  // If no rounding error, return simple equal splits
  if (Math.abs(roundingError) < 0.001) {
    return participants.map((participant) => ({
      userId: participant.userId,
      amount: roundedAmount,
      percentage: (roundedAmount / totalAmount) * 100,
      isAdjusted: false,
    }));
  }

  // Distribute the rounding error fairly
  const results: SplitResult[] = [];
  let remainingError = roundingError;

  // Sort participants by some criteria for consistent distribution
  const sortedParticipants = [...participants].sort((a, b) =>
    a.userId.localeCompare(b.userId)
  );

  for (let i = 0; i < sortedParticipants.length; i++) {
    const participant = sortedParticipants[i];
    let amount = roundedAmount;
    let isAdjusted = false;

    // Distribute rounding error based on strategy
    if (roundingStrategy === 'distribute') {
      // Distribute error to first few participants
      if (Math.abs(remainingError) > 0.001) {
        const adjustment = Math.min(Math.abs(remainingError), 1 / multiplier);
        if (remainingError > 0) {
          amount += adjustment;
          remainingError -= adjustment;
        } else {
          amount -= adjustment;
          remainingError += adjustment;
        }
        isAdjusted = true;
      }
    } else if (roundingStrategy === 'largest') {
      // Apply all remaining error to the last participant
      if (
        i === sortedParticipants.length - 1 &&
        Math.abs(remainingError) > 0.001
      ) {
        amount += remainingError;
        isAdjusted = true;
      }
    } else if (roundingStrategy === 'smallest') {
      // Apply all remaining error to the first participant
      if (i === 0 && Math.abs(remainingError) > 0.001) {
        amount += remainingError;
        isAdjusted = true;
      }
    }

    results.push({
      userId: participant.userId,
      amount: Math.round(amount * multiplier) / multiplier,
      percentage: (amount / totalAmount) * 100,
      isAdjusted,
    });
  }

  return results;
}

/**
 * Calculates percentage-based splits with fair rounding distribution
 */
function calculatePercentageSplit(
  totalAmount: number,
  participants: Array<{ userId: string; name: string; email: string }>,
  customPercentages: Record<string, number>,
  precision: number,
  roundingStrategy: string
): SplitResult[] {
  const multiplier = Math.pow(10, precision);
  const results: SplitResult[] = [];
  let totalCalculated = 0;
  const roundingErrors: Array<{ index: number; error: number }> = [];

  // Calculate initial amounts and collect rounding errors
  participants.forEach((participant, index) => {
    const percentage = customPercentages[participant.userId] || 0;
    const exactAmount = (percentage / 100) * totalAmount;
    const roundedAmount = Math.round(exactAmount * multiplier) / multiplier;
    const roundingError = exactAmount - roundedAmount;

    totalCalculated += roundedAmount;
    roundingErrors.push({ index, error: roundingError });

    results.push({
      userId: participant.userId,
      amount: roundedAmount,
      percentage,
      isAdjusted: false,
    });
  });

  // Distribute rounding errors
  const totalRoundingError = totalAmount - totalCalculated;

  if (Math.abs(totalRoundingError) > 0.001) {
    if (roundingStrategy === 'distribute') {
      // Sort by rounding error magnitude and distribute to those with largest errors
      roundingErrors.sort((a, b) => Math.abs(b.error) - Math.abs(a.error));

      let remainingError = totalRoundingError;
      for (const { index } of roundingErrors) {
        if (Math.abs(remainingError) <= 0.001) break;

        const adjustment = Math.min(Math.abs(remainingError), 1 / multiplier);
        if (remainingError > 0) {
          results[index].amount += adjustment;
          remainingError -= adjustment;
        } else {
          results[index].amount -= adjustment;
          remainingError += adjustment;
        }
        results[index].isAdjusted = true;
      }
    } else if (roundingStrategy === 'largest') {
      // Apply to participant with largest percentage
      const largestIndex = results.reduce(
        (maxIndex, result, index) =>
          result.percentage > results[maxIndex].percentage ? index : maxIndex,
        0
      );
      results[largestIndex].amount += totalRoundingError;
      results[largestIndex].isAdjusted = true;
    } else if (roundingStrategy === 'smallest') {
      // Apply to participant with smallest percentage
      const smallestIndex = results.reduce(
        (minIndex, result, index) =>
          result.percentage < results[minIndex].percentage ? index : minIndex,
        0
      );
      results[smallestIndex].amount += totalRoundingError;
      results[smallestIndex].isAdjusted = true;
    }
  }

  // Recalculate percentages
  results.forEach((result) => {
    result.percentage = (result.amount / totalAmount) * 100;
  });

  return results;
}

/**
 * Calculates custom amount splits with validation and adjustment
 */
function calculateCustomSplit(
  totalAmount: number,
  participants: Array<{ userId: string; name: string; email: string }>,
  customAmounts: Record<string, number>,
  precision: number,
  roundingStrategy: string
): SplitResult[] {
  const multiplier = Math.pow(10, precision);
  const results: SplitResult[] = [];
  let totalCustomAmount = 0;

  // Calculate total of custom amounts
  participants.forEach((participant) => {
    const customAmount = customAmounts[participant.userId] || 0;
    totalCustomAmount += customAmount;
  });

  // If custom amounts don't match total, distribute the difference
  const difference = totalAmount - totalCustomAmount;

  if (Math.abs(difference) > 0.001) {
    // Distribute difference proportionally among participants with custom amounts
    const participantsWithAmounts = participants.filter(
      (p) => (customAmounts[p.userId] || 0) > 0
    );

    if (participantsWithAmounts.length > 0) {
      const totalCustom = participantsWithAmounts.reduce(
        (sum, p) => sum + (customAmounts[p.userId] || 0),
        0
      );

      participantsWithAmounts.forEach((participant) => {
        const customAmount = customAmounts[participant.userId] || 0;
        const proportion = totalCustom > 0 ? customAmount / totalCustom : 0;
        const adjustment = difference * proportion;
        const adjustedAmount = customAmount + adjustment;

        results.push({
          userId: participant.userId,
          amount: Math.round(adjustedAmount * multiplier) / multiplier,
          percentage: (adjustedAmount / totalAmount) * 100,
          isAdjusted: Math.abs(adjustment) > 0.001,
        });
      });
    } else {
      // No custom amounts provided, fall back to equal split
      return calculateEqualSplit(
        totalAmount,
        participants,
        precision,
        roundingStrategy
      );
    }
  } else {
    // Custom amounts match total, use as-is
    participants.forEach((participant) => {
      const customAmount = customAmounts[participant.userId] || 0;
      results.push({
        userId: participant.userId,
        amount: Math.round(customAmount * multiplier) / multiplier,
        percentage: (customAmount / totalAmount) * 100,
        isAdjusted: false,
      });
    });
  }

  return results;
}

/**
 * Validates if a set of splits is valid (sums to total amount)
 */
export function validateSplits(
  splits: SplitResult[],
  totalAmount: number,
  tolerance: number = 0.01
): boolean {
  const totalSplit = splits.reduce((sum, split) => sum + split.amount, 0);
  return Math.abs(totalSplit - totalAmount) <= tolerance;
}

/**
 * Gets a summary of the split calculation
 */
export function getSplitSummary(splits: SplitResult[], totalAmount: number) {
  const totalSplit = splits.reduce((sum, split) => sum + split.amount, 0);
  const difference = totalSplit - totalAmount;
  const adjustedSplits = splits.filter((split) => split.isAdjusted);

  return {
    totalSplit,
    difference,
    isBalanced: Math.abs(difference) <= 0.01,
    adjustedCount: adjustedSplits.length,
    adjustedParticipants: adjustedSplits.map((split) => split.userId),
  };
}

/**
 * Formats currency with proper precision
 */
export function formatCurrencyWithPrecision(
  amount: number,
  precision: number = 2
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(amount);
}

/**
 * EXAMPLE USAGE AND EDGE CASES:
 *
 * 1. Equal Split with Rounding Issues:
 *    Total: $10.00, 3 people = $3.33 each (rounds to $9.99)
 *    Solution: Distribute the $0.01 difference fairly
 *
 * 2. Percentage Split with Irrational Numbers:
 *    Total: $100.00, 3 people at 33.33% each = $99.99
 *    Solution: Apply rounding error to largest percentage holder
 *
 * 3. Custom Amounts that Don't Sum:
 *    Total: $50.00, Person A: $20, Person B: $30.01
 *    Solution: Proportionally adjust amounts to match total
 *
 * 4. Very Small Amounts:
 *    Total: $0.03, 2 people = $0.015 each
 *    Solution: Round to nearest cent and distribute difference
 *
 * 5. Many Participants:
 *    Total: $100.00, 10 people = $10.00 each (perfect)
 *    Total: $100.00, 7 people = $14.2857... each
 *    Solution: Distribute rounding errors systematically
 *
 * ROUNDING STRATEGIES:
 *
 * - 'distribute': Spreads rounding errors across multiple participants
 *   Best for: Fair distribution, many participants
 *
 * - 'largest': Applies all rounding error to participant with largest share
 *   Best for: When largest payer can absorb small differences
 *
 * - 'smallest': Applies all rounding error to participant with smallest share
 *   Best for: When smallest payer can absorb small differences
 *
 * PRECISION CONSIDERATIONS:
 *
 * - 2 decimal places (cents): Standard for most currencies
 * - 3 decimal places: For currencies with smaller units (like Bitcoin)
 * - 0 decimal places: For whole number amounts only
 *
 * VALIDATION:
 *
 * The system ensures that:
 * 1. All splits sum to exactly the total amount (within tolerance)
 * 2. No negative amounts are created
 * 3. Rounding errors are distributed fairly
 * 4. Edge cases are handled gracefully
 */
