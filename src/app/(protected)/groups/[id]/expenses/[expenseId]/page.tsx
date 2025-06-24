'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFirebase } from '@/lib/firebase/firebase-context';
import { useGroups } from '@/lib/firebase/group-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Receipt,
  User,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { Group, SharedExpense } from '@/types';
import { toast } from 'sonner';

export default function GroupExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useFirebase();
  const { getGroup, deleteExpense } = useGroups();

  const [group, setGroup] = useState<Group | null>(null);
  const [expense, setExpense] = useState<SharedExpense | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const groupId = params.id as string;
  const expenseId = params.expenseId as string;

  useEffect(() => {
    const fetchGroupAndExpense = async () => {
      if (!groupId || !expenseId) return;

      setLoading(true);
      try {
        const groupData = await getGroup(groupId);
        setGroup(groupData);

        if (groupData) {
          const foundExpense = groupData.expenses.find(
            (e) => e.id === expenseId
          );
          setExpense(foundExpense || null);

          if (!foundExpense) {
            toast.error('Expense not found');
          }
        }
      } catch (error) {
        console.error('Error fetching group/expense:', error);
        toast.error('Failed to load expense');
      } finally {
        setLoading(false);
      }
    };

    fetchGroupAndExpense();
  }, [groupId, expenseId, getGroup]);

  const handleDeleteExpense = async () => {
    if (!expense || !group) return;

    if (
      !confirm(
        'Are you sure you want to delete this expense? This action cannot be undone.'
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      await deleteExpense(groupId, expenseId);
      toast.success('Expense deleted successfully');
      router.push(`/groups/${groupId}`);
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    } finally {
      setDeleting(false);
    }
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get member name by ID
  const getMemberName = (userId: string) => {
    const member = group?.members.find((m) => m.userId === userId);
    return member?.name || 'Unknown';
  };

  // Check if current user can edit/delete this expense
  const canEditExpense = () => {
    if (!currentUser || !expense) return false;
    return (
      expense.createdBy === currentUser.uid ||
      expense.paidBy === currentUser.uid
    );
  };

  // Check if current user is admin
  const isCurrentUserAdmin = () => {
    if (!currentUser || !group) return false;
    const member = group.members.find((m) => m.userId === currentUser.uid);
    return member?.role === 'admin';
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!group || !expense) {
    return (
      <div className="container mx-auto py-8">
        <Card className="text-center p-8">
          <CardHeader>
            <CardTitle>Expense Not Found</CardTitle>
            <CardDescription>
              The expense you&apos;re looking for doesn&apos;t exist or you
              don&apos;t have access to it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={`/groups/${groupId}`}>Back to Group</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link href={`/groups/${groupId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Group
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Receipt className="h-6 w-6 mr-2" />
              {expense.description}
            </h1>
            <p className="text-muted-foreground">
              {formatDate(expense.date)} • Paid by{' '}
              {getMemberName(expense.paidBy)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {(canEditExpense() || isCurrentUserAdmin()) && (
            <>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteExpense}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expense Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Expense Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(expense.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(expense.date)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="font-medium">{expense.description}</p>
              </div>

              {expense.category && (
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <Badge variant="secondary">{expense.category}</Badge>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground">Paid By</p>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {getMemberName(expense.paidBy)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Splits */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Splits</CardTitle>
              <CardDescription>
                How this expense is split among group members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expense.splits.map((split) => (
                  <div
                    key={split.userId}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {getMemberName(split.userId)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {split.userId === expense.paidBy ? 'Paid' : 'Owes'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <p className="font-semibold">
                        {formatCurrency(split.amount)}
                      </p>
                      {split.isPaid ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Total Amount</span>
                <span className="font-semibold">
                  {formatCurrency(expense.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Number of Splits</span>
                <span className="font-semibold">{expense.splits.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid Splits</span>
                <span className="font-semibold text-green-600">
                  {expense.splits.filter((s) => s.isPaid).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Unpaid Splits</span>
                <span className="font-semibold text-red-600">
                  {expense.splits.filter((s) => !s.isPaid).length}
                </span>
              </div>
            </CardContent>
          </Card>

          {expense.receiptImageUrl && (
            <Card>
              <CardHeader>
                <CardTitle>Receipt</CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={expense.receiptImageUrl}
                  alt="Receipt"
                  className="w-full rounded-lg"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
