// app/groups/page.tsx
'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Plus, Users, ArrowRight } from 'lucide-react';
import { useFirebase } from '@/lib/firebase/firebase-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGroups } from '@/lib/firebase/group-context';
import { formatCurrency } from '@/lib/format';
import { ExpenseSplit, SharedExpense } from '@/types';

export default function GroupsPage() {
  const { currentUser } = useFirebase();
  const { groups, loading, refreshGroups } = useGroups();

  useEffect(() => {
    refreshGroups();
  }, [refreshGroups]);

  // Calculate balance for each group
  const getGroupBalance = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return { youOwe: 0, othersOwe: 0, totalSpent: 0, yourSpent: 0 };

    const userId = currentUser?.uid || '';
    let youOwe = 0;
    let othersOwe = 0;
    let totalSpent = 0;
    let yourSpent = 0;

    // Process expenses
    group.expenses.forEach((expense: SharedExpense) => {
      totalSpent += expense.amount;

      if (expense.paidBy === userId) {
        yourSpent += expense.amount;

        // Calculate how much others owe you for this expense
        expense.splits.forEach((split: ExpenseSplit) => {
          if (split.userId !== userId) {
            othersOwe += split.amount;
          }
        });
      } else {
        // Find how much you owe for expenses paid by others
        const yourSplit = expense.splits.find(
          (split: ExpenseSplit) => split.userId === userId
        );
        if (yourSplit) {
          youOwe += yourSplit.amount;
        }
      }
    });

    return { youOwe, othersOwe, totalSpent, yourSpent };
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Groups</h1>
        <Link href="/groups/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Create Group
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="w-full">
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card className="text-center p-8">
          <CardHeader>
            <CardTitle>No Groups Found</CardTitle>
            <CardDescription>
              You don&apos;t have any groups yet. Create a group to start
              splitting expenses with friends!
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link href="/groups/new">
              <Button>Create Your First Group</Button>
            </Link>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group) => {
            const { youOwe, othersOwe, totalSpent, yourSpent } =
              getGroupBalance(group.id);
            const netBalance = othersOwe - youOwe;

            return (
              <Link href={`/groups/${group.id}`} key={group.id}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center">
                          <Users className="h-5 w-5 mr-2 text-muted-foreground" />
                          {group.name}
                        </CardTitle>
                        <CardDescription>
                          {group.members.length} members
                        </CardDescription>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Balance</p>
                        <p
                          className={`text-lg font-semibold ${
                            netBalance > 0
                              ? 'text-green-600'
                              : netBalance < 0
                              ? 'text-red-600'
                              : ''
                          }`}
                        >
                          {netBalance > 0
                            ? `You get back ${formatCurrency(netBalance)}`
                            : netBalance < 0
                            ? `You owe ${formatCurrency(Math.abs(netBalance))}`
                            : 'Settled up'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Group Total
                        </p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(totalSpent)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 border-t">
                    <div className="w-full flex justify-between text-sm text-muted-foreground">
                      <span>You paid: {formatCurrency(yourSpent)}</span>
                      <span>
                        Your share: {formatCurrency(yourSpent - netBalance)}
                      </span>
                    </div>
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
