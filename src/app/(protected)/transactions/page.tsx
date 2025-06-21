// app/transactions/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  format,
  startOfMonth,
  endOfMonth,
  getYear,
  getMonth,
  parseISO,
} from 'date-fns';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTransactions } from '@/lib/firebase/transaction-context';
import { Transaction, TransactionTag } from '@/types/transaction';
import { TransactionType } from '@/types/index';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { cn } from '@/lib/utils';

// Define schema for date filter

type DateFilter = {
  month: number;
  year: number;
};

export default function TransactionsPage() {
  const { transactions, loading, refreshTransactions, tags } =
    useTransactions();

  // Get current month and year for initial filter
  const currentDate = useMemo(() => new Date(), []);
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    month: getMonth(currentDate),
    year: getYear(currentDate),
  });

  // Generate list of years for filtering (5 years back to current year)
  const availableYears = useMemo(() => {
    const currentYear = getYear(currentDate);
    return Array.from({ length: 6 }, (_, i) => currentYear - 5 + i);
  }, [currentDate]);

  // Generate month options
  const months = [
    { value: 0, label: 'January' },
    { value: 1, label: 'February' },
    { value: 2, label: 'March' },
    { value: 3, label: 'April' },
    { value: 4, label: 'May' },
    { value: 5, label: 'June' },
    { value: 6, label: 'July' },
    { value: 7, label: 'August' },
    { value: 8, label: 'September' },
    { value: 9, label: 'October' },
    { value: 10, label: 'November' },
    { value: 11, label: 'December' },
  ];

  // Filter transactions by month and year
  const filteredTransactions = useMemo(() => {
    if (!transactions.length) return [];

    const startDate = startOfMonth(new Date(dateFilter.year, dateFilter.month));
    const endDate = endOfMonth(new Date(dateFilter.year, dateFilter.month));

    return transactions
      .filter((transaction) => {
        const transactionDate = new Date(transaction.date);
        return transactionDate >= startDate && transactionDate <= endDate;
      })
      .sort((a, b) => b.date - a.date); // Sort by date, newest first
  }, [transactions, dateFilter]);

  // Group transactions by day
  const transactionsByDay = useMemo(() => {
    const grouped = new Map<string, Transaction[]>();

    filteredTransactions.forEach((transaction) => {
      const dateKey = format(new Date(transaction.date), 'yyyy-MM-dd');
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(transaction);
    });

    // Convert to array and sort by date (newest first)
    return Array.from(grouped.entries()).sort(([dateA], [dateB]) => {
      return parseISO(dateB).getTime() - parseISO(dateA).getTime();
    });
  }, [filteredTransactions]);

  // Calculate daily totals
  const getDailyTotal = (transactions: Transaction[]) => {
    const totals = {
      expense: 0,
      income: 0,
      transfer: 0,
      investment: 0,
      net: 0,
    };

    transactions.forEach((transaction) => {
      const amount = transaction.amount;
      switch (transaction.type) {
        case 'expense':
          totals.expense += amount;
          totals.net -= amount;
          break;
        case 'income':
          totals.income += amount;
          totals.net += amount;
          break;
        case 'transfer':
          totals.transfer += amount;
          break;
        case 'investment':
          totals.investment += amount;
          break;
      }
    });

    return totals;
  };

  // Calculate monthly total
  const monthlyTotal = useMemo(() => {
    return getDailyTotal(filteredTransactions);
  }, [filteredTransactions]);

  // Load transactions when component mounts
  useEffect(() => {
    refreshTransactions();
  }, [refreshTransactions]);

  // Navigation to prev/next month
  const goToPreviousMonth = () => {
    setDateFilter((prev) => {
      let newMonth = prev.month - 1;
      let newYear = prev.year;

      if (newMonth < 0) {
        newMonth = 11;
        newYear -= 1;
      }

      return { month: newMonth, year: newYear };
    });
  };

  const goToNextMonth = () => {
    setDateFilter((prev) => {
      let newMonth = prev.month + 1;
      let newYear = prev.year;

      if (newMonth > 11) {
        newMonth = 0;
        newYear += 1;
      }

      return { month: newMonth, year: newYear };
    });
  };

  // Utility function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  // Get color class based on transaction type
  const getTransactionColor = (type: TransactionType) => {
    switch (type) {
      case 'expense':
        return 'text-red-600';
      case 'income':
        return 'text-green-600';
      case 'transfer':
        return 'text-blue-600';
      case 'investment':
        return 'text-purple-600';
      default:
        return '';
    }
  };

  // Find tag details from ID
  const getTagById = (tagId: string): TransactionTag | undefined => {
    return tags.find((tag) => tag.id === tagId);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Transactions</h1>
        <Link href="/transactions/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Transaction
          </Button>
        </Link>
      </div>

      {/* Month and Year Navigation */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center space-x-2">
                <Select
                  value={dateFilter.month.toString()}
                  onValueChange={(value) =>
                    setDateFilter((prev) => ({
                      ...prev,
                      month: parseInt(value),
                    }))
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem
                        key={month.value}
                        value={month.value.toString()}
                      >
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={dateFilter.year.toString()}
                  onValueChange={(value) =>
                    setDateFilter((prev) => ({
                      ...prev,
                      year: parseInt(value),
                    }))
                  }
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={goToNextMonth}
                disabled={
                  dateFilter.month === getMonth(currentDate) &&
                  dateFilter.year === getYear(currentDate)
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
              <div className="text-center">
                <div className="text-sm font-medium text-muted-foreground">
                  Income
                </div>
                <div className="text-lg font-semibold text-green-600">
                  {formatCurrency(monthlyTotal.income)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-muted-foreground">
                  Expenses
                </div>
                <div className="text-lg font-semibold text-red-600">
                  {formatCurrency(monthlyTotal.expense)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-muted-foreground">
                  Transfers
                </div>
                <div className="text-lg font-semibold text-blue-600">
                  {formatCurrency(monthlyTotal.transfer)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-muted-foreground">
                  Net
                </div>
                <div
                  className={cn(
                    'text-lg font-semibold',
                    monthlyTotal.net >= 0 ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {formatCurrency(monthlyTotal.net)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-3 w-3/4" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-3 w-1/4" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <Card className="text-center p-8">
          <CardHeader>
            <CardTitle>No Transactions Found</CardTitle>
            <CardDescription>
              No transactions for {months[dateFilter.month].label}{' '}
              {dateFilter.year}
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link href="/transactions/new">
              <Button>Add Transaction</Button>
            </Link>
          </CardFooter>
        </Card>
      ) : (
        <div className="space-y-6">
          {transactionsByDay.map(([dateKey, dayTransactions]) => {
            const displayDate = format(new Date(dateKey), 'EEEE, MMMM d, yyyy');
            const dailyTotal = getDailyTotal(dayTransactions);

            return (
              <div key={dateKey} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{displayDate}</h3>
                  <div
                    className={cn(
                      'font-medium',
                      dailyTotal.net >= 0 ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    Net: {formatCurrency(dailyTotal.net)}
                  </div>
                </div>

                <div className="grid gap-2">
                  {dayTransactions.map((transaction) => (
                    <Link
                      href={`/transactions/${transaction.id}`}
                      key={transaction.id}
                    >
                      <Card className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="font-medium">
                                {transaction.payeeName || 'Unknown Payee'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {transaction.description || 'No description'}
                              </div>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {transaction.isRecurring && (
                                  <Badge
                                    variant="outline"
                                    className="flex items-center gap-1"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="12"
                                      height="12"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                      <path d="M3 3v5h5" />
                                    </svg>
                                    Recurring
                                  </Badge>
                                )}
                                {transaction.tags?.map((tagId) => {
                                  const tag = getTagById(tagId);
                                  return tag ? (
                                    <Badge
                                      key={tagId}
                                      style={{
                                        backgroundColor: tag.color,
                                        color: 'white',
                                      }}
                                    >
                                      {tag.name}
                                    </Badge>
                                  ) : null;
                                })}
                              </div>
                            </div>
                            <span
                              className={cn(
                                'text-lg font-semibold',
                                getTransactionColor(transaction.type)
                              )}
                            >
                              {transaction.type === 'expense'
                                ? '-'
                                : transaction.type === 'income'
                                ? '+'
                                : ''}
                              {formatCurrency(transaction.amount).replace(
                                '₹',
                                ''
                              )}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
