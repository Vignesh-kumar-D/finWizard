// app/(protected)/budget/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useBudgets } from '@/lib/firebase/budget-context';
import { BudgetWithCategory, CURRENCY, MONTHS } from '@/types/budget.type';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PlusCircle,
  RefreshCw,
  PieChart,
  IndianRupee,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react';
import * as lucideIcons from 'lucide-react';
import { toast } from 'sonner';

// Helper components
function BudgetCard({ budget }: { budget: BudgetWithCategory }) {
  const statusColors = {
    under: 'text-green-600',
    'on-track': 'text-blue-600',
    over: 'text-red-600',
  };

  const statusText = {
    under: 'Under budget',
    'on-track': 'On track',
    over: 'Over budget',
  };

  const progressColors = {
    under: 'bg-green-600',
    'on-track': 'bg-blue-600',
    over: 'bg-red-600',
  };
  const IconComponent = lucideIcons[budget.category.icon];

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mr-3"
              style={{ backgroundColor: `${budget.category.color}20` }}
            >
              <span
                className="text-lg"
                style={{ color: budget.category.color }}
              >
                {IconComponent && <IconComponent />}
              </span>
            </div>
            <div>
              <h3 className="font-medium">{budget.category.name}</h3>
              <p className={`text-xs ${statusColors[budget.status]}`}>
                {statusText[budget.status]}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold">
              {CURRENCY}
              {budget.spentAmount.toLocaleString()}
              <span className="text-muted-foreground text-sm">
                {' '}
                / {CURRENCY}
                {budget.plannedAmount.toLocaleString()}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {budget.remaining >= 0
                ? `${CURRENCY}${budget.remaining.toLocaleString()} left`
                : `${CURRENCY}${Math.abs(
                    budget.remaining
                  ).toLocaleString()} over`}
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{Math.min(100, Math.round(budget.progress))}%</span>
          </div>
          <Progress
            value={Math.min(100, budget.progress)}
            className={`h-2 ${progressColors[budget.status]}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function BudgetPage() {
  const {
    budgets,
    summary,
    loading,
    currentMonth,
    selectedMonth,
    setSelectedMonth,
    refreshBudgets,
    applyMonthlyRollovers,
  } = useBudgets();

  const [applyingRollovers, setApplyingRollovers] = useState(false);

  // Get available months options (current and 11 months back)
  const getMonthOptions = () => {
    const options = [];
    const currentDate = new Date();

    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate);
      date.setMonth(currentDate.getMonth() - i);
      const monthStr = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, '0')}`;
      options.push({
        value: monthStr,
        label: `${MONTHS[date.getMonth()]} ${date.getFullYear()}`,
      });
    }

    return options;
  };

  // Handle applying rollovers
  const handleApplyRollovers = async () => {
    if (applyingRollovers) return;

    setApplyingRollovers(true);
    try {
      await applyMonthlyRollovers();
      toast.success('Budget rollovers applied successfully');
    } catch {
      toast.error('Failed to apply budget rollovers');
    } finally {
      setApplyingRollovers(false);
    }
  };

  // Filter budgets by type
  const getBudgetsByType = (type: 'expense' | 'investment' | 'income') => {
    return budgets.filter((budget) =>
      type === 'expense'
        ? budget.category.isExpense
        : type === 'investment'
        ? budget.category.isInvestment
        : budget.category.isIncome
    );
  };

  //   const formattedMonth = selectedMonth
  //     ? `${MONTHS[parseInt(selectedMonth.split('-')[1]) - 1]} ${
  //         selectedMonth.split('-')[0]
  //       }`
  //     : '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Budget</h1>
          <p className="text-muted-foreground">
            Manage your monthly budgets and track spending
          </p>
        </div>
        <div className="flex items-center mt-4 sm:mt-0 space-x-2">
          <Button variant="outline">
            <Link href="/transactions">Recent Transactions</Link>
          </Button>
          <Button asChild>
            <Link href="/budget/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Budget
            </Link>
          </Button>
        </div>
      </div>

      {/* Month selector and controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-full sm:w-[240px]">
            <SelectValue placeholder="Select Month" />
          </SelectTrigger>
          <SelectContent>
            {getMonthOptions().map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={handleApplyRollovers}
            disabled={applyingRollovers || selectedMonth !== currentMonth}
            className="flex-1 sm:flex-none"
          >
            {applyingRollovers ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Apply Rollovers
          </Button>

          <Button
            variant="outline"
            onClick={() => refreshBudgets()}
            disabled={loading}
            className="flex-1 sm:flex-none"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary section */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Expense Summary */}
            <Card className="bg-gradient-to-br from-red-50 to-white border-red-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center text-red-700">
                  <ArrowDownRight className="mr-2 h-5 w-5" />
                  Expenses
                </CardTitle>
                <CardDescription>Monthly spending</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {CURRENCY}
                  {summary?.expenseTotal.toLocaleString() || '0'}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    / {CURRENCY}
                    {summary?.expensePlanned.toLocaleString() || '0'}
                  </span>
                </div>
                <Progress
                  value={
                    summary?.expensePlanned
                      ? (summary.expenseTotal / summary.expensePlanned) * 100
                      : 0
                  }
                  className="h-1 mt-2 bg-red-100"
                />
                <p className="text-sm mt-2 text-muted-foreground">
                  {summary?.expensePlanned &&
                  summary?.expenseTotal <= summary?.expensePlanned
                    ? `${CURRENCY}${(
                        summary.expensePlanned - summary.expenseTotal
                      ).toLocaleString()} remaining`
                    : `${CURRENCY}${Math.abs(
                        (summary?.expensePlanned || 0) -
                          (summary?.expenseTotal || 0)
                      ).toLocaleString()} over budget`}
                </p>
              </CardContent>
            </Card>

            {/* Savings Summary */}
            <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center text-blue-700">
                  <IndianRupee className="mr-2 h-5 w-5" />
                  Savings
                </CardTitle>
                <CardDescription>Monthly savings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {CURRENCY}
                  {summary?.savingsTotal.toLocaleString() || '0'}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    / {CURRENCY}
                    {summary?.savingsPlanned.toLocaleString() || '0'}
                  </span>
                </div>
                <Progress
                  value={
                    summary?.savingsPlanned
                      ? (summary.savingsTotal / summary.savingsPlanned) * 100
                      : 0
                  }
                  className="h-1 mt-2 bg-blue-100"
                />
                <p className="text-sm mt-2 text-muted-foreground">
                  {summary?.savingsPlanned &&
                  summary?.savingsTotal >= summary?.savingsPlanned
                    ? `${CURRENCY}${(
                        summary.savingsTotal - summary.savingsPlanned
                      ).toLocaleString()} extra saved`
                    : `${CURRENCY}${Math.abs(
                        (summary?.savingsPlanned || 0) -
                          (summary?.savingsTotal || 0)
                      ).toLocaleString()} below target`}
                </p>
              </CardContent>
            </Card>

            {/* Investment Summary */}
            <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center text-purple-700">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Investments
                </CardTitle>
                <CardDescription>Monthly investments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {CURRENCY}
                  {summary?.investmentTotal.toLocaleString() || '0'}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    / {CURRENCY}
                    {summary?.investmentPlanned.toLocaleString() || '0'}
                  </span>
                </div>
                <Progress
                  value={
                    summary?.investmentPlanned
                      ? (summary.investmentTotal / summary.investmentPlanned) *
                        100
                      : 0
                  }
                  className="h-1 mt-2 bg-purple-100"
                />
                <p className="text-sm mt-2 text-muted-foreground">
                  {summary?.investmentPlanned &&
                  summary?.investmentTotal >= summary?.investmentPlanned
                    ? `${CURRENCY}${(
                        summary.investmentTotal - summary.investmentPlanned
                      ).toLocaleString()} extra invested`
                    : `${CURRENCY}${Math.abs(
                        (summary?.investmentPlanned || 0) -
                          (summary?.investmentTotal || 0)
                      ).toLocaleString()} below target`}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed budget tabs */}
          <Tabs defaultValue="expense" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="expense">Expenses</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
              <TabsTrigger value="investment">Investments</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              {budgets.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <ArrowUpRight className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-medium mb-2">No budgets</h3>
                    <p className="text-muted-foreground text-center max-w-md mb-6">
                      Track your spending and saving by creating budgets for
                      different categories.
                    </p>
                    <Button asChild>
                      <Link href="/budget/new?type=income">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create a new Budget
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {budgets.map((budget) => (
                    <Link href={`/budget/edit/${budget.id}`} key={budget.id}>
                      <BudgetCard budget={budget} />
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="expense">
              {getBudgetsByType('expense').length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <PieChart className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-medium mb-2">
                      No expense budgets
                    </h3>
                    <p className="text-muted-foreground text-center max-w-md mb-6">
                      Start tracking your spending by creating expense budgets
                      for different categories.
                    </p>
                    <Button asChild>
                      <Link href="/budget/new?type=expense">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Expense Budget
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {getBudgetsByType('expense').map((budget) => (
                    <Link href={`/budget/edit/${budget.id}`} key={budget.id}>
                      <BudgetCard budget={budget} />
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="income">
              {getBudgetsByType('income').length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <ArrowUpRight className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-medium mb-2">
                      No income budgets
                    </h3>
                    <p className="text-muted-foreground text-center max-w-md mb-6">
                      Track your income sources by creating income budgets for
                      different categories.
                    </p>
                    <Button asChild>
                      <Link href="/budget/new?type=income">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Income Budget
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {getBudgetsByType('income').map((budget) => (
                    <Link href={`/budget/edit/${budget.id}`} key={budget.id}>
                      <BudgetCard budget={budget} />
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="investment">
              {getBudgetsByType('investment').length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-medium mb-2">
                      No investment budgets
                    </h3>
                    <p className="text-muted-foreground text-center max-w-md mb-6">
                      Plan your investments by creating budgets for different
                      investment categories.
                    </p>
                    <Button asChild>
                      <Link href="/budget/new?type=investment">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Investment Budget
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {getBudgetsByType('investment').map((budget) => (
                    <Link href={`/budget/edit/${budget.id}`} key={budget.id}>
                      <BudgetCard budget={budget} />
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
