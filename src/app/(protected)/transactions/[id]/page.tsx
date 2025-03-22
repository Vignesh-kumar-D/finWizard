// app/transactions/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeftCircle,
  Calendar,
  DollarSign,
  CreditCard,
  FileText,
  Tag,
  Trash,
  Edit,
  MapPin,
  Repeat,
} from 'lucide-react';
import { useTransactions } from '@/lib/firebase/transaction-context';
import { useAccounts } from '@/lib/firebase/account-context';
import { useBudgets } from '@/lib/firebase/budget-context';

import { Transaction } from '@/types/transaction';

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function TransactionDetailPage() {
  const router = useRouter();
  const params = useParams<{id:string}>();
  const id = params.id ;

  const { getTransaction, removeTransaction, tags } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useBudgets();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        const data = await getTransaction(id);
        setTransaction(data);
      } catch (error) {
        console.error('Error fetching transaction:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransaction();
  }, [id, getTransaction]);

  // Find related data
  const category = transaction?.categoryId
    ? categories.find((c) => c.id === transaction.categoryId)
    : null;

  const account = transaction?.accountId
    ? accounts.find((a) => a.id === transaction.accountId)
    : null;

  const toAccount = transaction?.toAccountId
    ? accounts.find((a) => a.id === transaction.toAccountId)
    : null;

  const transactionTags = transaction?.tags
    ? tags.filter((tag) => transaction.tags?.includes(tag.id))
    : [];

  const handleDelete = async () => {
    try {
      await removeTransaction(id);
      router.push('/transactions');
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

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

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Transaction Not Found</CardTitle>
            <CardDescription>
              The transaction you are looking for may have been deleted or does
              not exist.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => router.push('/transactions')}>
              <ArrowLeftCircle className="mr-2 h-4 w-4" /> Back to Transactions
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <Button
                variant="ghost"
                className="mb-2 -ml-3"
                onClick={() => router.push('/transactions')}
              >
                <ArrowLeftCircle className="mr-2 h-4 w-4" /> Back
              </Button>
              <CardTitle className="text-2xl">
                {transaction.payeeName || 'Unnamed Transaction'}
              </CardTitle>
              <CardDescription>
                {transaction.type.charAt(0).toUpperCase() +
                  transaction.type.slice(1)}{' '}
                • {new Date(transaction.date).toDateString()}
              </CardDescription>
            </div>

            <div className="flex gap-2">
              <Link href={`/transactions/${id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-1" /> Edit
                </Button>
              </Link>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                <Trash className="h-4 w-4 mr-1" /> Delete
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Amount */}
          <div className="flex justify-center">
            <div
              className={cn(
                'text-4xl font-bold',
                getTransactionColor(transaction.type)
              )}
            >
              {formatCurrency(transaction.amount, transaction.type)}
            </div>
          </div>

          {/* Transaction Details */}
          <div className="grid gap-4 pt-4 border-t">
            {/* Date */}
            <div className="flex items-start">
              <Calendar className="h-5 w-5 mr-3 mt-0.5 text-muted-foreground" />
              <div>
                <div className="font-medium">Date</div>
                <div>{new Date(transaction.date).toDateString()}</div>
              </div>
            </div>

            {/* Category */}
            {category && (
              <div className="flex items-start">
                <DollarSign className="h-5 w-5 mr-3 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Category</div>
                  <div>{category.name}</div>
                </div>
              </div>
            )}

            {/* Account(s) */}
            <div className="flex items-start">
              <CreditCard className="h-5 w-5 mr-3 mt-0.5 text-muted-foreground" />
              <div>
                <div className="font-medium">
                  {transaction.type === 'transfer' ? 'Accounts' : 'Account'}
                </div>
                <div>
                  {account?.name || 'Unknown account'}
                  {transaction.type === 'transfer' &&
                    toAccount &&
                    ` → ${toAccount.name}`}
                </div>
              </div>
            </div>

            {/* Payment Method */}
            {transaction.paymentMethod && (
              <div className="flex items-start">
                <CreditCard className="h-5 w-5 mr-3 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Payment Method</div>
                  <div className="capitalize">{transaction.paymentMethod}</div>
                </div>
              </div>
            )}

            {/* Description */}
            {transaction.description && (
              <div className="flex items-start">
                <FileText className="h-5 w-5 mr-3 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Note</div>
                  <div>{transaction.description}</div>
                </div>
              </div>
            )}

            {/* Tags */}
            {transactionTags.length > 0 && (
              <div className="flex items-start">
                <Tag className="h-5 w-5 mr-3 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Tags</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {transactionTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        style={{ backgroundColor: tag.color }}
                        className="text-white"
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Location */}
            {transaction.location && (
              <div className="flex items-start">
                <MapPin className="h-5 w-5 mr-3 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Location</div>
                  <div>
                    Lat: {transaction.location.lat.toFixed(6)}, Lng:{' '}
                    {transaction.location.lng.toFixed(6)}
                  </div>
                </div>
              </div>
            )}

            {/* Recurring */}
            {transaction.isRecurring && (
              <div className="flex items-start">
                <Repeat className="h-5 w-5 mr-3 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Recurring Transaction</div>
                  <div>This is part of a recurring transaction series</div>
                  {transaction.recurringId && (
                    <Link href={`/recurring/${transaction.recurringId}`}>
                      <Button variant="link" className="p-0 h-auto">
                        View recurring schedule
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Receipt Image */}
          {transaction.receiptImageUrl && (
            <div className="pt-4 border-t">
              <div className="font-medium mb-2">Receipt</div>
              <img
                src={transaction.receiptImageUrl}
                alt="Receipt"
                className="max-h-64 rounded-md border mx-auto"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
