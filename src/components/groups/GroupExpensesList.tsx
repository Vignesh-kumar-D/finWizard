'use client';

import React, { useState, useEffect } from 'react';
import { useGroupExpenses } from '@/lib/hooks/usePagination';
import { useGroups } from '@/lib/firebase/group-context-scalable';
import { SharedExpense } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Plus, Filter, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/format';

interface GroupExpensesListProps {
  groupId: string;
  onAddExpense?: () => void;
  onExpenseClick?: (expense: SharedExpense) => void;
  showAddButton?: boolean;
  maxHeight?: string;
}

export function GroupExpensesList({
  groupId,
  onAddExpense,
  onExpenseClick,
  showAddButton = true,
  maxHeight = '600px',
}: GroupExpensesListProps) {
  const [filterDateRange, setFilterDateRange] = useState<{
    startDate?: number;
    endDate?: number;
  }>({});

  const {
    data: expenses,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
  } = useGroupExpenses(groupId, {
    initialLimit: 20,
    loadMoreLimit: 20,
    startDate: filterDateRange.startDate,
    endDate: filterDateRange.endDate,
  });

  const { subscribeToGroupExpenses } = useGroups();

  // Real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToGroupExpenses(
      groupId,
      (realTimeExpenses) => {
        // The pagination hook will handle the data, but we can trigger a refresh
        // if we detect significant changes
        if (realTimeExpenses.length !== expenses.length) {
          refresh();
        }
      },
      { limit: 50 }
    );

    return unsubscribe;
  }, [groupId, subscribeToGroupExpenses, expenses.length, refresh]);

  const handleExpenseClick = (expense: SharedExpense) => {
    if (onExpenseClick) {
      onExpenseClick(expense);
    }
  };

  const handleLoadMore = async () => {
    if (!loadingMore && hasMore) {
      await loadMore();
    }
  };

  const getExpenseStatus = (expense: SharedExpense) => {
    const totalSplits =
      expense.splits?.reduce((sum, split) => sum + split.amount, 0) || 0;
    const isFullySettled = Math.abs(totalSplits - expense.amount) < 0.01;

    if (isFullySettled) {
      return { status: 'settled', color: 'bg-green-100 text-green-800' };
    } else {
      return { status: 'pending', color: 'bg-yellow-100 text-yellow-800' };
    }
  };

  if (loading && expenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Group Expenses</span>
            {showAddButton && (
              <Button onClick={onAddExpense} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
                <Skeleton className="h-4 w-[100px]" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <p>Error loading expenses: {error}</p>
            <Button onClick={refresh} variant="outline" className="mt-2">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Group Expenses ({expenses.length})</span>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterDateRange({})}
              disabled={!filterDateRange.startDate && !filterDateRange.endDate}
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
            {showAddButton && (
              <Button onClick={onAddExpense} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 overflow-y-auto" style={{ maxHeight }}>
          {expenses.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No expenses found</p>
              {showAddButton && (
                <Button
                  onClick={onAddExpense}
                  variant="outline"
                  className="mt-2"
                >
                  Add your first expense
                </Button>
              )}
            </div>
          ) : (
            <>
              {expenses.map((expense) => {
                const status = getExpenseStatus(expense);
                // Removed paidByMember and members reference for linter compliance

                return (
                  <div
                    key={expense.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                      onExpenseClick ? 'cursor-pointer' : 'cursor-default'
                    }`}
                    onClick={() => handleExpenseClick(expense)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">
                            {expense.description}
                          </h3>
                          <Badge className={status.color}>
                            {status.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Paid by {expense.paidBy} •{' '}
                          {format(expense.date, 'MMM dd, yyyy')}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-sm text-gray-500">
                            {expense.splits?.length || 0} people
                          </span>
                          {expense.category && (
                            <Badge variant="outline" className="text-xs">
                              {expense.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {formatCurrency(expense.amount)}
                        </div>
                        {expense.splits && expense.splits.length > 0 && (
                          <div className="text-sm text-gray-500">
                            {expense.splits.length} splits
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {hasMore && (
                <div className="text-center pt-4">
                  <Button
                    onClick={handleLoadMore}
                    variant="outline"
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}

              {!hasMore && expenses.length > 0 && (
                <div className="text-center text-gray-500 text-sm py-4">
                  No more expenses to load
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Date range filter component
interface DateRangeFilterProps {
  onDateRangeChange: (range: { startDate?: number; endDate?: number }) => void;
}

export function DateRangeFilter({ onDateRangeChange }: DateRangeFilterProps) {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const handleApplyFilter = () => {
    const start = startDate ? new Date(startDate).getTime() : undefined;
    const end = endDate ? new Date(endDate).getTime() : undefined;
    onDateRangeChange({ startDate: start, endDate: end });
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    onDateRangeChange({});
  };

  return (
    <div className="flex items-center space-x-4 p-4 border rounded-lg">
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium">From:</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        />
      </div>
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium">To:</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        />
      </div>
      <Button onClick={handleApplyFilter} size="sm">
        Apply Filter
      </Button>
      <Button onClick={handleClearFilter} variant="outline" size="sm">
        Clear
      </Button>
    </div>
  );
}
