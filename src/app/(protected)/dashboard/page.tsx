// app/(protected)/dashboard/page.tsx
'use client';

import Link from 'next/link';
import { useFirebase } from '@/lib/firebase/firebase-context';
import { useAccounts } from '@/lib/firebase/account-context';
import { useTransactions } from '@/lib/firebase/transaction-context';
import { useBudgets } from '@/lib/firebase/budget-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  IndianRupee,
  Wallet,
  CreditCard,
  PlusCircle,
  Calendar,
  ChevronRight,
  ArrowRightLeft,
  PiggyBank,
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';

export default function DashboardPage() {
  const { userProfile } = useFirebase();
  const { accounts, loading: accountsLoading } = useAccounts();
  const { recentTransactions, loading: transactionsLoading } =
    useTransactions();
  const { summary, loading: budgetLoading } = useBudgets();

  // Calculate monthly statistics from real data
  const calculateMonthlyStats = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyTransactions = recentTransactions.filter((transaction) => {
      const transactionDate = new Date(transaction.date);
      return (
        transactionDate.getMonth() === currentMonth &&
        transactionDate.getFullYear() === currentYear
      );
    });

    const income = monthlyTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthlyTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const savings = income - expenses;
    const budget = summary?.expensePlanned || 0;

    return { income, expenses, savings, budget };
  };

  const monthlyStats = calculateMonthlyStats();

  // Format transaction date
  const formatTransactionDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  // Get account icon based on type
  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'credit-card':
        return <CreditCard className="h-5 w-5 text-expense" />;
      default:
        return <Wallet className="h-5 w-5 text-primary" />;
    }
  };

  // Get account type display name
  const getAccountTypeName = (type: string) => {
    switch (type) {
      case 'checking-bank':
        return 'Checking Account';
      case 'saving-bank':
        return 'Savings Account';
      case 'credit-card':
        return 'Credit Card';
      case 'cash':
        return 'Cash';
      case 'upi':
        return 'UPI';
      case 'investment':
        return 'Investment';
      case 'loan':
        return 'Loan';
      default:
        return 'Account';
    }
  };

  const loading = accountsLoading || transactionsLoading || budgetLoading;

  return (
    <div className="space-y-4 animate-in px-4">
      {/* Welcome section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">
            Welcome back, {userProfile?.name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Here&apos;s your financial summary for today
          </p>
        </div>
        <Button asChild className="mt-4 sm:mt-0 w-full sm:w-auto">
          <Link href="/transactions/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Transaction
          </Link>
        </Button>
      </div>

      {/* Stats overview */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card className="stat-income">
          <CardContent className="p-3 sm:p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Income
                </p>
                <h3 className="text-lg sm:text-2xl font-bold mt-1">
                  {formatCurrency(monthlyStats.income)}
                </h3>
              </div>
              <div className="p-1.5 sm:p-2 rounded-full bg-income/20">
                <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-income" />
              </div>
            </div>
            <div className="flex items-center mt-2 sm:mt-3 text-xs">
              <TrendingUp className="h-3 w-3 mr-1 text-income" />
              <span className="text-income">This month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-expense">
          <CardContent className="p-3 sm:p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Expenses
                </p>
                <h3 className="text-lg sm:text-2xl font-bold mt-1">
                  {formatCurrency(monthlyStats.expenses)}
                </h3>
              </div>
              <div className="p-1.5 sm:p-2 rounded-full bg-expense/20">
                <ArrowDownRight className="h-3 w-3 sm:h-4 sm:w-4 text-expense" />
              </div>
            </div>
            <div className="flex items-center mt-2 sm:mt-3 text-xs">
              <TrendingUp className="h-3 w-3 mr-1 text-expense" />
              <span className="text-expense">This month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-savings">
          <CardContent className="p-3 sm:p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Savings
                </p>
                <h3 className="text-lg sm:text-2xl font-bold mt-1">
                  {formatCurrency(monthlyStats.savings)}
                </h3>
              </div>
              <div className="p-1.5 sm:p-2 rounded-full bg-savings/20">
                <PiggyBank className="h-3 w-3 sm:h-4 sm:w-4 text-savings" />
              </div>
            </div>
            <div className="flex items-center mt-2 sm:mt-3 text-xs">
              <TrendingUp className="h-3 w-3 mr-1 text-savings" />
              <span className="text-savings">This month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-budget">
          <CardContent className="p-3 sm:p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Budget
                </p>
                <h3 className="text-lg sm:text-2xl font-bold mt-1">
                  {formatCurrency(monthlyStats.budget)}
                </h3>
              </div>
              <div className="p-1.5 sm:p-2 rounded-full bg-budget/20">
                <IndianRupee className="h-3 w-3 sm:h-4 sm:w-4 text-budget" />
              </div>
            </div>
            <div className="flex items-center mt-2 sm:mt-3 text-xs">
              <Calendar className="h-3 w-3 mr-1 text-budget" />
              <span className="text-budget">This month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts & Recent Transactions tabs */}
      <Tabs defaultValue="accounts">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="accounts">My Accounts</TabsTrigger>
          <TabsTrigger value="recent">Recent Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>Accounts Overview</CardTitle>
              <CardDescription>
                View all your accounts and their current balances
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center">
                        <div className="w-9 h-9 bg-muted rounded-md mr-3 animate-pulse"></div>
                        <div className="space-y-1">
                          <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
                          <div className="h-3 w-16 bg-muted rounded animate-pulse"></div>
                        </div>
                      </div>
                      <div className="h-4 w-20 bg-muted rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No accounts found</p>
                  <Button asChild className="mt-2">
                    <Link href="/accounts/new">Add Account</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center">
                        <div
                          className={`p-2 rounded-md mr-3 ${
                            account.type === 'credit-card'
                              ? 'bg-expense/10'
                              : 'bg-primary/10'
                          }`}
                        >
                          {getAccountIcon(account.type)}
                        </div>
                        <div>
                          <p className="font-medium">{account.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {getAccountTypeName(account.type)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <p
                          className={`font-semibold ${
                            account.balance < 0
                              ? 'text-expense'
                              : 'text-foreground'
                          }`}
                        >
                          {account.balance < 0 ? '-' : ''}
                          {formatCurrency(Math.abs(account.balance))}
                        </p>
                        <ChevronRight className="ml-2 h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" asChild className="w-full">
                <Link href="/accounts">View All Accounts</Link>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                Your latest spending and income activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center">
                        <div className="w-9 h-9 bg-muted rounded-md mr-3 animate-pulse"></div>
                        <div className="space-y-1">
                          <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
                          <div className="h-3 w-24 bg-muted rounded animate-pulse"></div>
                        </div>
                      </div>
                      <div className="h-4 w-20 bg-muted rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : recentTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No transactions found</p>
                  <Button asChild className="mt-2">
                    <Link href="/transactions/new">Add Transaction</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentTransactions.slice(0, 5).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center">
                        <div
                          className={`p-2 rounded-md mr-3 ${
                            transaction.type === 'expense'
                              ? 'bg-expense/10'
                              : 'bg-income/10'
                          }`}
                        >
                          {transaction.type === 'expense' ? (
                            <ArrowDownRight className="h-5 w-5 text-expense" />
                          ) : (
                            <ArrowUpRight className="h-5 w-5 text-income" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {transaction.description || 'Transaction'}
                          </p>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="mr-1 h-3 w-3" />
                            <span>
                              {formatTransactionDate(transaction.date)}
                            </span>
                            {transaction.payeeName && (
                              <>
                                <span className="mx-1">•</span>
                                <span>{transaction.payeeName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <p
                        className={`font-semibold ${
                          transaction.type === 'expense'
                            ? 'text-expense'
                            : 'text-income'
                        }`}
                      >
                        {transaction.type === 'expense' ? '-' : '+'}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" asChild className="w-full">
                <Link href="/transactions">View All Transactions</Link>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="flex flex-col h-auto py-4 px-3 items-center justify-center"
            asChild
          >
            <Link href="/transactions/new?type=income">
              <PlusCircle className="h-5 w-5 mb-1" />
              <span>Add Income</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col h-auto py-4 px-3 items-center justify-center"
            asChild
          >
            <Link href="/transactions/new?type=expense">
              <ArrowDownRight className="h-5 w-5 mb-1" />
              <span>Add Expense</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col h-auto py-4 px-3 items-center justify-center"
            asChild
          >
            <Link href="/transactions/new?type=transfer">
              <ArrowRightLeft className="h-5 w-5 mb-1" />
              <span>Transfer</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col h-auto py-4 px-3 items-center justify-center"
            asChild
          >
            <Link href="/accounts/new">
              <PiggyBank className="h-5 w-5 mb-1" />
              <span>Add Account</span>
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
