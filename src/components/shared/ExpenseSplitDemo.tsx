'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  calculateExpenseSplits,
  validateSplits,
  getSplitSummary,
  formatCurrencyWithPrecision,
  type SplitOptions,
} from '@/lib/utils';

interface DemoParticipant {
  userId: string;
  name: string;
  email: string;
}

const DEMO_PARTICIPANTS: DemoParticipant[] = [
  { userId: 'user1', name: 'Alice', email: 'alice@example.com' },
  { userId: 'user2', name: 'Bob', email: 'bob@example.com' },
  { userId: 'user3', name: 'Charlie', email: 'charlie@example.com' },
  { userId: 'user4', name: 'Diana', email: 'diana@example.com' },
];

const DEMO_SCENARIOS = [
  {
    name: 'Equal Split - Rounding Issue',
    description:
      '$10.00 split among 3 people (should be $3.33 each, but rounds to $9.99)',
    totalAmount: 10.0,
    splitType: 'equal' as const,
    participants: DEMO_PARTICIPANTS.slice(0, 3),
  },
  {
    name: 'Percentage Split - Irrational Numbers',
    description: '$100.00 split 33.33% each among 3 people (should be $99.99)',
    totalAmount: 100.0,
    splitType: 'percentage' as const,
    participants: DEMO_PARTICIPANTS.slice(0, 3),
    customPercentages: {
      user1: 33.33,
      user2: 33.33,
      user3: 33.33,
    },
  },
  {
    name: 'Custom Amounts - Mismatch',
    description: '$50.00 with custom amounts that don&apos;t sum to total',
    totalAmount: 50.0,
    splitType: 'custom' as const,
    participants: DEMO_PARTICIPANTS.slice(0, 2),
    customAmounts: {
      user1: 20.0,
      user2: 30.01,
    },
  },
  {
    name: 'Small Amount - Precision Test',
    description: '$0.03 split among 2 people (tests precision handling)',
    totalAmount: 0.03,
    splitType: 'equal' as const,
    participants: DEMO_PARTICIPANTS.slice(0, 2),
  },
  {
    name: 'Many Participants',
    description: '$100.00 split among 7 people (tests systematic distribution)',
    totalAmount: 100.0,
    splitType: 'equal' as const,
    participants: DEMO_PARTICIPANTS.concat([
      { userId: 'user5', name: 'Eve', email: 'eve@example.com' },
      { userId: 'user6', name: 'Frank', email: 'frank@example.com' },
      { userId: 'user7', name: 'Grace', email: 'grace@example.com' },
    ]),
  },
];

export default function ExpenseSplitDemo() {
  const [selectedScenario, setSelectedScenario] = useState(0);
  const [roundingStrategy, setRoundingStrategy] = useState<
    'distribute' | 'largest' | 'smallest'
  >('distribute');
  const [precision, setPrecision] = useState(2);

  const scenario = DEMO_SCENARIOS[selectedScenario];

  const splitOptions: SplitOptions = {
    totalAmount: scenario.totalAmount,
    participants: scenario.participants,
    splitType: scenario.splitType,
    customAmounts: scenario.customAmounts,
    customPercentages: scenario.customPercentages,
    precision,
    roundingStrategy,
  };

  const splits = calculateExpenseSplits(splitOptions);
  const summary = getSplitSummary(splits, scenario.totalAmount);
  const isValid = validateSplits(splits, scenario.totalAmount);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Expense Split Calculator Demo</CardTitle>
          <CardDescription>
            Demonstrates fair and accurate expense splitting for various edge
            cases
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Scenario Selection */}
          <div className="space-y-2">
            <Label>Demo Scenario</Label>
            <Select
              value={selectedScenario.toString()}
              onValueChange={(value) => setSelectedScenario(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEMO_SCENARIOS.map((scenario, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {scenario.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {scenario.description}
            </p>
          </div>

          {/* Configuration Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Rounding Strategy</Label>
              <Select
                value={roundingStrategy}
                onValueChange={(value: 'distribute' | 'largest' | 'smallest') =>
                  setRoundingStrategy(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="distribute">Distribute Fairly</SelectItem>
                  <SelectItem value="largest">Apply to Largest</SelectItem>
                  <SelectItem value="smallest">Apply to Smallest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Precision (Decimal Places)</Label>
              <Select
                value={precision.toString()}
                onValueChange={(value) => setPrecision(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 (Whole numbers)</SelectItem>
                  <SelectItem value="2">2 (Cents)</SelectItem>
                  <SelectItem value="3">3 (Millicents)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Total Amount</Label>
              <Input
                value={scenario.totalAmount.toFixed(precision)}
                disabled
                className="font-mono"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>Split Results</CardTitle>
          <CardDescription>
            {isValid ? (
              <span className="text-green-600">
                ✓ Valid split - amounts sum to total
              </span>
            ) : (
              <span className="text-red-600">
                ✗ Invalid split - amounts don&apos;t sum to total
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Split</p>
                <p className="font-semibold">
                  {formatCurrencyWithPrecision(summary.totalSplit, precision)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Difference</p>
                <p
                  className={`font-semibold ${
                    summary.difference === 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrencyWithPrecision(summary.difference, precision)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Adjusted</p>
                <p className="font-semibold">
                  {summary.adjustedCount} participants
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={summary.isBalanced ? 'default' : 'destructive'}>
                  {summary.isBalanced ? 'Balanced' : 'Unbalanced'}
                </Badge>
              </div>
            </div>

            {/* Individual Splits */}
            <div className="space-y-2">
              <Label>Individual Splits</Label>
              <div className="space-y-2">
                {splits.map((split) => (
                  <div
                    key={split.userId}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="font-medium">
                          {
                            scenario.participants.find(
                              (p) => p.userId === split.userId
                            )?.name
                          }
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {split.percentage.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <p className="font-semibold">
                        {formatCurrencyWithPrecision(split.amount, precision)}
                      </p>
                      {split.isAdjusted && (
                        <Badge variant="secondary" className="text-xs">
                          Adjusted
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Explanation */}
            {summary.adjustedCount > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">
                  Rounding Adjustment Explanation
                </h4>
                <p className="text-sm text-blue-800">
                  {summary.adjustedCount} participant(s) had their amounts
                  adjusted to ensure the total splits equal exactly{' '}
                  {formatCurrencyWithPrecision(scenario.totalAmount, precision)}
                  . The rounding strategy &quot;{roundingStrategy}&quot; was
                  used to distribute the{' '}
                  {formatCurrencyWithPrecision(
                    Math.abs(summary.difference),
                    precision
                  )}{' '}
                  difference.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
