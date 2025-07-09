'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFirebase } from '@/lib/firebase/firebase-context';
import { useGroups } from '@/lib/firebase/group-context-scalable';
import {
  useGroupExpenses,
  useGroupSettlements,
} from '@/lib/hooks/usePagination';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Plus,
  Users,
  Calendar,
  Settings,
  Receipt,
  User,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { Group, SharedExpense, UserProfile } from '@/types';
import { toast } from 'sonner';
import UserSearch from '@/components/shared/UserSearch';

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useFirebase();
  const { getGroup, addMemberToGroup } = useGroups();

  const [group, setGroup] = useState<Group | null>(null);
  const [groupLoading, setGroupLoading] = useState(true);

  const groupId = params.id as string;

  // Use the new pagination hooks for expenses and settlements
  const {
    data: expenses,
    loading: expensesLoading,
    loadingMore: loadingMoreExpenses,
    hasMore: hasMoreExpenses,
    loadMore: loadMoreExpenses,
  } = useGroupExpenses(groupId, {
    initialLimit: 20,
    loadMoreLimit: 20,
  });

  const {
    data: settlements,
    loading: settlementsLoading,
    loadingMore: loadingMoreSettlements,
    hasMore: hasMoreSettlements,
    loadMore: loadMoreSettlements,
  } = useGroupSettlements(groupId, {
    initialLimit: 20,
    loadMoreLimit: 20,
  });

  useEffect(() => {
    const fetchGroup = async () => {
      if (!groupId) return;

      setGroupLoading(true);
      try {
        const groupData = await getGroup(groupId);
        setGroup(groupData);
      } catch (error) {
        console.error('Error fetching group:', error);
        toast.error('Failed to load group');
      } finally {
        setGroupLoading(false);
      }
    };

    fetchGroup();
  }, [groupId, getGroup]);

  // Calculate balances for each member using the new data structure
  const calculateMemberBalances = () => {
    if (!group || !currentUser) return {};

    const balances: Record<
      string,
      {
        totalPaid: number; // What this person actually paid
        totalShare: number; // This person's share of all expenses
        netBalance: number; // Difference between paid and share
        expenses: SharedExpense[];
        owedByOthers: Record<string, number>; // How much each person owes to this member
        owesToOthers: Record<string, number>; // How much this person owes to each member
      }
    > = {};

    // Initialize balances for all members
    group.members.forEach((member) => {
      balances[member.userId] = {
        totalPaid: 0,
        totalShare: 0,
        netBalance: 0,
        expenses: [],
        owedByOthers: {},
        owesToOthers: {},
      };
    });

    // Calculate balances from expenses (now from separate collection)
    expenses.forEach((expense) => {
      const paidBy = expense.paidBy;
      const paidAmount = expense.amount;

      // Add to paid amount for the person who paid
      if (balances[paidBy]) {
        balances[paidBy].totalPaid += paidAmount;
        balances[paidBy].expenses.push(expense);
      }

      // Calculate splits
      expense.splits?.forEach((split) => {
        if (balances[split.userId]) {
          // Add to this person's share of expenses
          balances[split.userId].totalShare += split.amount;

          if (split.userId === paidBy) {
            // If the person who paid is also in the splits, they owe their share to themselves
            // This effectively reduces their net payment by their share amount
            // They owe this amount to themselves (which cancels out)
            if (!balances[split.userId].owesToOthers[split.userId]) {
              balances[split.userId].owesToOthers[split.userId] = 0;
            }
            balances[split.userId].owesToOthers[split.userId] += split.amount;
          } else {
            // For others, they owe their share to the person who paid
            // Track who owes what to whom
            if (!balances[split.userId].owesToOthers[paidBy]) {
              balances[split.userId].owesToOthers[paidBy] = 0;
            }
            balances[split.userId].owesToOthers[paidBy] += split.amount;

            // Track how much the payer is owed by this person
            if (!balances[paidBy].owedByOthers[split.userId]) {
              balances[paidBy].owedByOthers[split.userId] = 0;
            }
            balances[paidBy].owedByOthers[split.userId] += split.amount;
          }
        }
      });
    });

    // Apply settlements to reduce amounts owed
    settlements.forEach((settlement) => {
      const fromUserId = settlement.from;
      const toUserId = settlement.to;
      const settlementAmount = settlement.amount;

      // Reduce the amount that 'from' user owes to 'to' user
      if (balances[fromUserId] && balances[toUserId]) {
        // Reduce what 'from' owes to 'to'
        if (balances[fromUserId].owesToOthers[toUserId]) {
          balances[fromUserId].owesToOthers[toUserId] = Math.max(
            0,
            balances[fromUserId].owesToOthers[toUserId] - settlementAmount
          );
        }

        // Reduce what 'to' is owed by 'from'
        if (balances[toUserId].owedByOthers[fromUserId]) {
          balances[toUserId].owedByOthers[fromUserId] = Math.max(
            0,
            balances[toUserId].owedByOthers[fromUserId] - settlementAmount
          );
        }
      }
    });

    // Calculate net balance (what you paid minus your share)
    Object.keys(balances).forEach((userId) => {
      balances[userId].netBalance =
        balances[userId].totalPaid - balances[userId].totalShare;
    });

    return balances;
  };

  // Get current user's balance
  const getCurrentUserBalance = () => {
    if (!currentUser) return null;
    const balances = calculateMemberBalances();
    return balances[currentUser.uid];
  };

  // Format date
  const formatDate = (timestamp: number | { toDate: () => Date } | unknown) => {
    if (!timestamp) {
      return 'Unknown date';
    }

    let date: Date;

    // Handle Firebase Timestamp objects
    if (
      timestamp &&
      typeof timestamp === 'object' &&
      'toDate' in timestamp &&
      typeof timestamp.toDate === 'function'
    ) {
      date = timestamp.toDate();
    } else if (typeof timestamp === 'number') {
      // Handle regular number timestamps
      if (isNaN(timestamp)) {
        return 'Unknown date';
      }
      date = new Date(timestamp);
    } else {
      return 'Unknown date';
    }

    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get member name by ID
  const getMemberName = (userId: string) => {
    const member = group?.members.find((m) => m.userId === userId);
    return member?.name || 'Unknown';
  };

  // Check if current user is admin
  const isCurrentUserAdmin = () => {
    if (!currentUser || !group) return false;
    const member = group.members.find((m) => m.userId === currentUser.uid);
    return member?.role === 'admin';
  };

  const handleAddMember = async (user: UserProfile) => {
    if (!group || !currentUser) return;

    try {
      await addMemberToGroup(group.id, {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: 'member',
        joinedAt: Date.now(),
      });

      toast.success(`${user.name} added to group successfully!`);
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add member to group');
    }
  };

  if (groupLoading) {
    return (
      <div className="container mx-auto py-4 px-4 sm:py-8 sm:px-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mx-auto py-8">
        <Card className="text-center p-8">
          <CardHeader>
            <CardTitle>Group Not Found</CardTitle>
            <CardDescription>
              The group you&apos;re looking for doesn&apos;t exist or you
              don&apos;t have access to it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/groups">Back to Groups</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentUserBalance = getCurrentUserBalance();

  return (
    <div className="container mx-auto py-4 px-4 sm:py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 mb-6 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
          <Link href="/groups">
            <Button variant="ghost" size="sm" className="w-fit">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Groups
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
              {group.name}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {group.members.length} members • Created{' '}
              {formatDate(group.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
          {isCurrentUserAdmin() && (
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link href={`/groups/${groupId}/settings`}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Link>
            </Button>
          )}
          <Button asChild className="w-full sm:w-auto">
            <Link href={`/groups/${groupId}/expenses/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={`/groups/${groupId}/settlements/new`}>
              <CreditCard className="h-4 w-4 mr-2" />
              Add Settlement
            </Link>
          </Button>
        </div>
      </div>

      {/* Balance Overview */}
      {currentUserBalance && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Group Balance Overview</CardTitle>
            <CardDescription>
              Total group spending and your share
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Total Group Spending */}
            <div className="mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Total Group Spending
                </p>
                <p className="text-3xl font-bold text-purple-600">
                  {formatCurrency(
                    expenses.reduce(
                      (total, expense) => total + expense.amount,
                      0
                    )
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {expenses.length} expense{expenses.length !== 1 ? 's' : ''} •{' '}
                  {group.members.length} members
                </p>
              </div>
            </div>

            {/* Your Personal Balance */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">What You Paid</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(currentUserBalance.totalPaid)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Your Share</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(currentUserBalance.totalShare)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Net Balance</p>
                <p
                  className={`text-2xl font-bold ${
                    currentUserBalance.netBalance >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {formatCurrency(currentUserBalance.netBalance)}
                </p>
              </div>
            </div>

            {/* Detailed breakdown */}
            {currentUserBalance.netBalance !== 0 && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium mb-3">Detailed Breakdown</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  {currentUserBalance.netBalance > 0
                    ? `You paid ${formatCurrency(
                        currentUserBalance.totalPaid
                      )} but your share is only ${formatCurrency(
                        currentUserBalance.totalShare
                      )}, so you're owed ${formatCurrency(
                        currentUserBalance.netBalance
                      )}`
                    : `You paid ${formatCurrency(
                        currentUserBalance.totalPaid
                      )} but your share is ${formatCurrency(
                        currentUserBalance.totalShare
                      )}, so you owe ${formatCurrency(
                        Math.abs(currentUserBalance.netBalance)
                      )}`}
                </p>
                {currentUserBalance.netBalance > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-green-600 font-medium">
                      You are owed by:
                    </p>
                    {Object.entries(currentUserBalance.owedByOthers)
                      .filter(([, amount]) => amount > 0)
                      .sort(([, a], [, b]) => b - a)
                      .map(([memberId, amount]) => (
                        <div
                          key={memberId}
                          className="flex justify-between items-center text-sm"
                        >
                          <span className="text-green-600">
                            {getMemberName(memberId)} owes you
                          </span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(amount)}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-red-600 font-medium">
                      You owe to:
                    </p>
                    {Object.entries(currentUserBalance.owesToOthers)
                      .filter(([, amount]) => amount > 0)
                      .sort(([, a], [, b]) => b - a)
                      .map(([memberId, amount]) => (
                        <div
                          key={memberId}
                          className="flex justify-between items-center text-sm"
                        >
                          <span className="text-red-600">
                            You owe {getMemberName(memberId)}
                          </span>
                          <span className="font-medium text-red-600">
                            {formatCurrency(amount)}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="expenses" className="space-y-6">
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="settlements">Settlements</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
              <CardDescription>All expenses in this group</CardDescription>
            </CardHeader>
            <CardContent>
              {expensesLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-muted rounded"></div>
                    </div>
                  ))}
                </div>
              ) : expenses.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No expenses yet</p>
                  <Button asChild>
                    <Link href={`/groups/${groupId}/expenses/new`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Expense
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex flex-col space-y-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer sm:flex-row sm:items-center sm:justify-between sm:space-y-0"
                      onClick={() =>
                        router.push(`/groups/${groupId}/expenses/${expense.id}`)
                      }
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                          <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base truncate">
                            {expense.description}
                          </p>
                          <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2 text-xs sm:text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              <span>{formatDate(expense.date)}</span>
                            </div>
                            <span className="hidden sm:inline">•</span>
                            <span className="truncate">
                              Paid by {getMemberName(expense.paidBy)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:flex-col sm:items-end sm:space-y-1">
                        <p className="font-semibold text-sm sm:text-base">
                          {formatCurrency(expense.amount)}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {expense.splits?.length || 0} splits
                        </p>
                      </div>
                    </div>
                  ))}

                  {hasMoreExpenses && (
                    <div className="text-center pt-4">
                      <Button
                        onClick={loadMoreExpenses}
                        variant="outline"
                        disabled={loadingMoreExpenses}
                      >
                        {loadingMoreExpenses ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          'Load More Expenses'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settlements">
          <Card>
            <CardHeader>
              <CardTitle>Recent Settlements</CardTitle>
              <CardDescription>All settlements in this group</CardDescription>
            </CardHeader>
            <CardContent>
              {settlementsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-muted rounded"></div>
                    </div>
                  ))}
                </div>
              ) : settlements.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No settlements yet
                  </p>
                  <Button asChild>
                    <Link href={`/groups/${groupId}/settlements/new`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Settlement
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {settlements.map((settlement) => (
                    <div
                      key={settlement.id}
                      className="flex flex-col space-y-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors sm:flex-row sm:items-center sm:justify-between sm:space-y-0"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                          <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base">
                            {getMemberName(settlement.from)} →{' '}
                            {getMemberName(settlement.to)}
                          </p>
                          <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2 text-xs sm:text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              <span>{formatDate(settlement.date)}</span>
                            </div>
                            {settlement.notes && (
                              <>
                                <span className="hidden sm:inline">•</span>
                                <span className="truncate">
                                  {settlement.notes}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:flex-col sm:items-end">
                        <p className="font-semibold text-sm sm:text-base">
                          {formatCurrency(settlement.amount)}
                        </p>
                      </div>
                    </div>
                  ))}

                  {hasMoreSettlements && (
                    <div className="text-center pt-4">
                      <Button
                        onClick={loadMoreSettlements}
                        variant="outline"
                        disabled={loadingMoreSettlements}
                      >
                        {loadingMoreSettlements ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          'Load More Settlements'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Group Members</CardTitle>
                  <CardDescription>All members and their roles</CardDescription>
                </div>
                {isCurrentUserAdmin() && (
                  <UserSearch
                    onUserSelect={handleAddMember}
                    excludeUsers={group.members.map((m) => m.userId)}
                    buttonText="Add Member"
                    placeholder="Search users by name, email, or phone..."
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {group.members.map((member) => (
                  <div
                    key={member.userId}
                    className="flex flex-col space-y-3 p-4 border rounded-lg sm:flex-row sm:items-center sm:justify-between sm:space-y-0"
                  >
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base">
                          {member.name}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {member.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          member.role === 'admin' ? 'default' : 'secondary'
                        }
                      >
                        {member.role}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        Joined {formatDate(member.joinedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances">
          <Card>
            <CardHeader>
              <CardTitle>Member Balances</CardTitle>
              <CardDescription>
                Detailed balance breakdown for all members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {group.members.map((member) => {
                  const balances = calculateMemberBalances();
                  const memberBalance = balances[member.userId];

                  if (!memberBalance) return null;

                  return (
                    <div key={member.userId} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {member.email}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-lg font-bold ${
                              memberBalance.netBalance >= 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {formatCurrency(memberBalance.netBalance)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Net Balance
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Paid</p>
                          <p className="font-medium text-green-600">
                            {formatCurrency(memberBalance.totalPaid)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Share</p>
                          <p className="font-medium text-blue-600">
                            {formatCurrency(memberBalance.totalShare)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Balance</p>
                          <p
                            className={`font-medium ${
                              memberBalance.netBalance >= 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {formatCurrency(memberBalance.netBalance)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
