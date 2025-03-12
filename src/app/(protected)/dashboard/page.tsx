// app/(protected)/dashboard/page.tsx
'use client';

import Link from 'next/link';
import { useFirebase } from '@/lib/firebase/firebase-context';
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

export default function DashboardPage() {
  const { userProfile } = useFirebase();
  //   const [timeFrame, setTimeFrame] = useState("month");

  // Dummy data for demonstration
  const accounts = [
    {
      id: '1',
      name: 'Checking Account',
      balance: 3250.75,
      type: 'checking-bank',
    },
    { id: '2', name: 'Savings Account', balance: 12500.0, type: 'saving-bank' },
    { id: '3', name: 'Credit Card', balance: -450.25, type: 'credit-card' },
  ];

  const recentTransactions = [
    {
      id: 't1',
      description: 'Grocery Store',
      amount: -85.32,
      date: 'Today',
      category: 'Food',
    },
    {
      id: 't2',
      description: 'Salary Deposit',
      amount: 3200.0,
      date: 'Yesterday',
      category: 'Income',
    },
    {
      id: 't3',
      description: 'Electric Bill',
      amount: -94.5,
      date: 'Mar 8, 2025',
      category: 'Utilities',
    },
    {
      id: 't4',
      description: 'Coffee Shop',
      amount: -4.75,
      date: 'Mar 7, 2025',
      category: 'Food',
    },
  ];

  const monthlyStats = {
    income: 3850,
    expenses: 2100,
    savings: 1750,
    budget: 2500,
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Welcome section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {userProfile?.name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s your financial summary for today
          </p>
        </div>
        <Button asChild className="mt-4 sm:mt-0">
          <Link href="/transactions/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Transaction
          </Link>
        </Button>
      </div>

      {/* Stats overview */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card className="stat-income">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Income
                </p>
                <h3 className="text-2xl font-bold mt-1">
                  ${monthlyStats.income}
                </h3>
              </div>
              <div className="p-2 rounded-full bg-income/20">
                <ArrowUpRight className="h-4 w-4 text-income" />
              </div>
            </div>
            <div className="flex items-center mt-3 text-xs">
              <TrendingUp className="h-3 w-3 mr-1 text-income" />
              <span className="text-income">+12% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-expense">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Expenses
                </p>
                <h3 className="text-2xl font-bold mt-1">
                  ${monthlyStats.expenses}
                </h3>
              </div>
              <div className="p-2 rounded-full bg-expense/20">
                <ArrowDownRight className="h-4 w-4 text-expense" />
              </div>
            </div>
            <div className="flex items-center mt-3 text-xs">
              <TrendingUp className="h-3 w-3 mr-1 text-expense" />
              <span className="text-expense">+5% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-savings">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Savings
                </p>
                <h3 className="text-2xl font-bold mt-1">
                  ${monthlyStats.savings}
                </h3>
              </div>
              <div className="p-2 rounded-full bg-savings/20">
                <PiggyBank className="h-4 w-4 text-savings" />
              </div>
            </div>
            <div className="flex items-center mt-3 text-xs">
              <TrendingUp className="h-3 w-3 mr-1 text-savings" />
              <span className="text-savings">+20% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-budget">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Budget Left
                </p>
                <h3 className="text-2xl font-bold mt-1">
                  ${monthlyStats.budget - monthlyStats.expenses}
                </h3>
              </div>
              <div className="p-2 rounded-full bg-budget/20">
                <IndianRupee className="h-4 w-4 text-budget" />
              </div>
            </div>
            <div className="flex items-center mt-3 text-xs">
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="bg-budget h-1.5 rounded-full"
                  style={{
                    width: `${
                      (monthlyStats.expenses / monthlyStats.budget) * 100
                    }%`,
                  }}
                ></div>
              </div>
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
              <span>${monthlyStats.expenses} spent</span>
              <span>${monthlyStats.budget} budget</span>
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
              <div className="space-y-4">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center">
                      <div
                        className={`p-2 rounded-md mr-3 ${
                          account.type === 'credit'
                            ? 'bg-expense/10'
                            : 'bg-primary/10'
                        }`}
                      >
                        {account.type === 'credit' ? (
                          <CreditCard
                            className={`h-5 w-5 ${
                              account.type === 'credit'
                                ? 'text-expense'
                                : 'text-primary'
                            }`}
                          />
                        ) : (
                          <Wallet className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {account.type === 'bank'
                            ? 'Bank Account'
                            : 'Credit Card'}
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
                        {account.balance < 0 ? '-' : ''}$
                        {Math.abs(account.balance).toFixed(2)}
                      </p>
                      <ChevronRight className="ml-2 h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
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
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center">
                      <div
                        className={`p-2 rounded-md mr-3 ${
                          transaction.amount < 0
                            ? 'bg-expense/10'
                            : 'bg-income/10'
                        }`}
                      >
                        {transaction.amount < 0 ? (
                          <ArrowDownRight className="h-5 w-5 text-expense" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5 text-income" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="mr-1 h-3 w-3" />
                          <span>{transaction.date}</span>
                          <span className="mx-1">•</span>
                          <span>{transaction.category}</span>
                        </div>
                      </div>
                    </div>
                    <p
                      className={`font-semibold ${
                        transaction.amount < 0 ? 'text-expense' : 'text-income'
                      }`}
                    >
                      {transaction.amount < 0 ? '-' : '+'}$
                      {Math.abs(transaction.amount).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
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
          >
            <PlusCircle className="h-5 w-5 mb-1" />
            <span>Add Income</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col h-auto py-4 px-3 items-center justify-center"
          >
            <ArrowDownRight className="h-5 w-5 mb-1" />
            <span>Add Expense</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col h-auto py-4 px-3 items-center justify-center"
          >
            <ArrowRightLeft className="h-5 w-5 mb-1" />
            <span>Transfer</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col h-auto py-4 px-3 items-center justify-center"
          >
            <PiggyBank className="h-5 w-5 mb-1" />
            <span>Save</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
