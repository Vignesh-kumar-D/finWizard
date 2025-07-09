# Fair and Accurate Expense Splitting Approach

## Problem Statement

In group expense splitting, we often encounter scenarios where:

1. Equal splits result in non-whole numbers (e.g., $10.00 ÷ 3 = $3.33...)
2. Percentage splits create irrational numbers (e.g., 33.33% of $100 = $33.33, but 3 × $33.33 = $99.99)
3. Custom amounts don't sum to the total
4. Rounding errors accumulate and create discrepancies

## Our Solution: Intelligent Rounding Distribution

### Core Principles

1. **Accuracy First**: Ensure the sum of all splits equals exactly the total amount
2. **Fair Distribution**: Distribute rounding errors fairly among participants
3. **Transparency**: Show which amounts were adjusted and why
4. **Flexibility**: Support multiple rounding strategies for different scenarios

### Rounding Strategies

#### 1. Distribute Strategy (Recommended)

- **How it works**: Spreads rounding errors across multiple participants
- **Best for**: Most scenarios, especially with many participants
- **Example**: $10.00 ÷ 3 people
  - Exact: $3.333... each
  - Rounded: $3.33, $3.33, $3.34 (distributes the $0.01 difference)

#### 2. Largest Strategy

- **How it works**: Applies all rounding error to the participant with the largest share
- **Best for**: When the largest payer can absorb small differences
- **Example**: $100.00 with 50%, 30%, 20% splits
  - If there's a $0.01 rounding error, it goes to the 50% participant

#### 3. Smallest Strategy

- **How it works**: Applies all rounding error to the participant with the smallest share
- **Best for**: When the smallest payer can absorb small differences
- **Example**: $100.00 with 50%, 30%, 20% splits
  - If there's a $0.01 rounding error, it goes to the 20% participant

### Implementation Details

#### Equal Splits

```typescript
// Example: $10.00 ÷ 3 people
const totalAmount = 10.0;
const participants = 3;
const exactAmount = 10.0 / 3; // 3.333...
const roundedAmount = Math.round(exactAmount * 100) / 100; // 3.33
const roundingError = 10.0 - 3.33 * 3; // 0.01

// Distribute the $0.01 error
// Result: $3.33, $3.33, $3.34
```

#### Percentage Splits

```typescript
// Example: $100.00 with 33.33% each
const percentages = { user1: 33.33, user2: 33.33, user3: 33.33 };
const amounts = {
  user1: (33.33 / 100) * 100, // 33.33
  user2: (33.33 / 100) * 100, // 33.33
  user3: (33.33 / 100) * 100, // 33.33
};
// Total: 99.99 (missing $0.01)
// Apply rounding error to largest percentage holder
```

#### Custom Amounts

```typescript
// Example: $50.00 with custom amounts that don't sum
const customAmounts = { user1: 20.0, user2: 30.01 };
const totalCustom = 50.01; // Over by $0.01
const difference = 50.0 - 50.01; // -0.01

// Proportionally adjust amounts
// user1: 20.00 + (-0.01 * 20.00/50.01) = 19.996
// user2: 30.01 + (-0.01 * 30.01/50.01) = 30.004
```

### Edge Cases Handled

#### 1. Very Small Amounts

- **Problem**: $0.03 ÷ 2 = $0.015 each
- **Solution**: Round to nearest cent and distribute difference
- **Result**: $0.01, $0.02 (distributes the $0.01 difference)

#### 2. Many Participants

- **Problem**: $100.00 ÷ 7 = $14.2857... each
- **Solution**: Systematic distribution of rounding errors
- **Result**: Distributes the $0.01 difference across multiple participants

#### 3. Zero Amounts

- **Problem**: Participant with 0% or $0.00 amount
- **Solution**: Exclude from rounding distribution, recalculate percentages

#### 4. Precision Variations

- **Problem**: Different currencies need different precision
- **Solution**: Configurable precision (0, 2, 3 decimal places)
- **Example**: Bitcoin (8 decimals), USD (2 decimals), whole numbers (0 decimals)

### Validation and Quality Assurance

#### 1. Sum Validation

```typescript
const validateSplits = (splits, totalAmount, tolerance = 0.01) => {
  const totalSplit = splits.reduce((sum, split) => sum + split.amount, 0);
  return Math.abs(totalSplit - totalAmount) <= tolerance;
};
```

#### 2. Summary Information

```typescript
const getSplitSummary = (splits, totalAmount) => ({
  totalSplit: splits.reduce((sum, split) => sum + split.amount, 0),
  difference: totalSplit - totalAmount,
  isBalanced: Math.abs(difference) <= 0.01,
  adjustedCount: splits.filter((split) => split.isAdjusted).length,
  adjustedParticipants: splits
    .filter((split) => split.isAdjusted)
    .map((split) => split.userId),
});
```

### User Experience Considerations

#### 1. Visual Indicators

- Show which amounts were adjusted with badges
- Display the total difference and whether it's balanced
- Provide explanation of rounding adjustments

#### 2. Real-time Feedback

- Update splits as user changes amounts or percentages
- Show validation errors immediately
- Provide suggestions for fixing imbalances

#### 3. Transparency

- Explain the rounding strategy being used
- Show exact calculations where possible
- Allow users to choose their preferred strategy

### Best Practices

#### 1. Default Strategy

- Use "distribute" strategy as default for maximum fairness
- Allow users to change strategy based on their preferences

#### 2. Precision

- Use 2 decimal places for most currencies (cents)
- Allow configuration for special cases

#### 3. Tolerance

- Use 0.01 tolerance for validation (1 cent)
- Adjust tolerance based on precision setting

#### 4. Error Handling

- Gracefully handle edge cases
- Provide clear error messages
- Fall back to equal splits if custom amounts are invalid

### Testing Scenarios

#### 1. Basic Cases

- Equal splits with whole numbers ($30.00 ÷ 3 = $10.00 each)
- Equal splits with rounding ($10.00 ÷ 3 = $3.33, $3.33, $3.34)

#### 2. Edge Cases

- Very small amounts ($0.03 ÷ 2)
- Many participants ($100.00 ÷ 7)
- Zero amounts (participant with 0% share)

#### 3. Complex Cases

- Mixed strategies (some equal, some percentage)
- Custom amounts that don't sum
- Multiple precision levels

### Conclusion

This approach ensures that:

1. **All splits sum to exactly the total amount**
2. **Rounding errors are distributed fairly**
3. **Users understand what adjustments were made**
4. **The system handles all edge cases gracefully**
5. **The solution is flexible and configurable**

The key insight is that instead of trying to avoid rounding errors, we embrace them and distribute them intelligently to maintain both accuracy and fairness.
