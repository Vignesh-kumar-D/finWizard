// app/transactions/page.tsx
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTransactions } from '@/lib/firebase/transaction-context';
import { useAccounts } from '@/lib/firebase/account-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

interface Filters {
  type: string;
  accountId: string;
  category: string;
  dateRange: string;
}

export default function TransactionsPage() {
  const { transactions, loading } = useTransactions();
  const { accounts } = useAccounts();
  const [filters, setFilters] = useState<Filters>({
    type: '',
    accountId: '',
    category: '',
    dateRange: '',
  });

  // Get unique categories from transactions
  const categories = useMemo(() => {
    const cats = transactions
      .map((t) => t.categoryId)
      .filter((cat) => cat && cat.trim() !== '');
    return [...new Set(cats)].sort();
  }, [transactions]);

  // Filter transactions based on current filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      if (filters.type && transaction.type !== filters.type) return false;
      if (filters.accountId && transaction.accountId !== filters.accountId)
        return false;
      if (filters.category && transaction.categoryId !== filters.category)
        return false;

      if (filters.dateRange) {
        const transactionDate = new Date(transaction.date);
        const now = new Date();

        switch (filters.dateRange) {
          case 'today':
            return transactionDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return transactionDate >= weekAgo;
          case 'month':
            return (
              transactionDate.getMonth() === now.getMonth() &&
              transactionDate.getFullYear() === now.getFullYear()
            );
          case 'year':
            return transactionDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      }

      return true;
    });
  }, [transactions, filters]);

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

  return (
    <div className="space-y-4 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            View and manage your financial transactions
          </p>
        </div>
        <Button asChild className="mt-4 sm:mt-0 w-full sm:w-auto">
          <Link href="/transactions/new">
            <Plus className="mr-2 h-4 w-4" />
            New Transaction
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={filters.type}
                onValueChange={(value) =>
                  setFilters({ ...filters, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account">Account</Label>
              <Select
                value={filters.accountId}
                onValueChange={(value) =>
                  setFilters({ ...filters, accountId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All accounts</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={filters.category}
                onValueChange={(value) =>
                  setFilters({ ...filters, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateRange">Date Range</Label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) =>
                  setFilters({ ...filters, dateRange: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This week</SelectItem>
                  <SelectItem value="month">This month</SelectItem>
                  <SelectItem value="year">This year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-muted rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-32"></div>
                      <div className="h-3 bg-muted rounded w-24"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-muted rounded w-20"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <Card className="text-center p-8">
          <CardHeader>
            <CardTitle>No Transactions Found</CardTitle>
            <CardDescription>
              {transactions.length === 0
                ? "You don't have any transactions yet. Add your first transaction to get started!"
                : 'No transactions match your current filters. Try adjusting your search criteria.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/transactions/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((transaction) => (
            <Card
              key={transaction.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div
                      className={`flex items-center justify-center h-10 w-10 rounded-full ${
                        transaction.type === 'income'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {transaction.type === 'income' ? (
                        <ArrowUpRight className="h-5 w-5" />
                      ) : (
                        <ArrowDownRight className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base truncate">
                        {transaction.description}
                      </h3>
                      <div className="flex items-center space-x-2 text-xs sm:text-sm text-muted-foreground">
                        <span>{transaction.categoryId}</span>
                        <span>•</span>
                        <span>{formatTransactionDate(transaction.date)}</span>
                        {transaction.accountId && (
                          <>
                            <span>•</span>
                            <span>
                              {accounts.find(
                                (a) => a.id === transaction.accountId
                              )?.name || 'Unknown Account'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <div className="text-right">
                      <p
                        className={`font-semibold text-sm sm:text-base ${
                          transaction.type === 'income'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {transaction.type === 'income' ? '+' : '-'}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/transactions/${transaction.id}`}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
