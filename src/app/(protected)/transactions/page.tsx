// app/transactions/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Filter, ArrowUpDown, Search } from 'lucide-react';
import { useTransactions } from '@/lib/firebase/transaction-context';
import { Transaction } from '@/types/transaction';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function TransactionsPage() {
  const { transactions, loading, refreshTransactions } = useTransactions();
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<
    'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'
  >('date-desc');

  useEffect(() => {
    refreshTransactions();
  }, []);

  useEffect(() => {
    // Apply filtering and sorting
    let result = [...transactions];

    // Filter by search term
    if (searchTerm.trim() !== '') {
      result = result.filter(
        (t) =>
          t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.payeeName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by transaction type
    if (filterType) {
      result = result.filter((t) => t.type === filterType);
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortOption) {
        case 'date-desc':
          return b.date - a.date;
        case 'date-asc':
          return a.date - b.date;
        case 'amount-desc':
          return b.amount - a.amount;
        case 'amount-asc':
          return a.amount - b.amount;
        default:
          return 0;
      }
    });

    setFilteredTransactions(result);
  }, [transactions, searchTerm, filterType, sortOption]);

  const formatCurrency = (amount: number, type: string) => {
    const prefix = type === 'expense' ? '-' : type === 'income' ? '+' : '';
    return `${prefix}$${Math.abs(amount).toFixed(2)}`;
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'expense':
        return 'text-red-600';
      case 'income':
        return 'text-green-600';
      case 'transfer':
        return 'text-blue-600';
      default:
        return '';
    }
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

      <div className="grid gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" /> Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterType(null)}>
                All Types
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('expense')}>
                Expenses Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('income')}>
                Income Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('transfer')}>
                Transfers Only
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <ArrowUpDown className="mr-2 h-4 w-4" /> Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortOption('date-desc')}>
                Newest First
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption('date-asc')}>
                Oldest First
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption('amount-desc')}>
                Highest Amount
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption('amount-asc')}>
                Lowest Amount
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

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
              {searchTerm || filterType
                ? 'Try changing your search or filter criteria'
                : "You haven't recorded any transactions yet"}
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link href="/transactions/new">
              <Button>Add Your First Transaction</Button>
            </Link>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTransactions.map((transaction) => (
            <Link href={`/transactions/${transaction.id}`} key={transaction.id}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {transaction.payeeName || 'Unknown Payee'}
                      </CardTitle>
                      <CardDescription>
                        {new Date(transaction.date).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <span
                      className={cn(
                        'text-lg font-semibold',
                        getTransactionColor(transaction.type)
                      )}
                    >
                      {formatCurrency(transaction.amount, transaction.type)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-gray-600">
                    {transaction.description || 'No description'}
                  </p>
                </CardContent>
                <CardFooter className="pt-2">
                  <div className="flex flex-wrap gap-2">
                    {transaction.isRecurring && (
                      <Badge variant="outline">Recurring</Badge>
                    )}
                    {transaction.tags?.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
