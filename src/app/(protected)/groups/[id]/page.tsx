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

  // Calculate balances for each member
  const calculateMemberBalances = () => {
    if (!group || !currentUser) return {};

    const balances: Record<
      string,
      {
        totalPaid: number;
        totalOwed: number;
        netBalance: number;
        expenses: SharedExpense[];
      }
    > = {};

    // Initialize balances for all members
    group.members.forEach((member) => {
      balances[member.userId] = {
        totalPaid: 0,
        totalOwed: 0,
        netBalance: 0,
        expenses: [],
      };
    });

    // Calculate balances from expenses
    group.expenses.forEach((expense) => {
      const paidBy = expense.paidBy;
      const paidAmount = expense.amount;

      // Add to paid amount for the person who paid
      if (balances[paidBy]) {
        balances[paidBy].totalPaid += paidAmount;
        balances[paidBy].expenses.push(expense);
      }

      // Calculate splits
      expense.splits.forEach((split) => {
        if (balances[split.userId]) {
          if (split.userId === paidBy) {
            // If the person who paid is also in the splits, they already paid their share
            // So they don't owe anything additional - their share is already covered
            // We don't add to their owed amount since they already paid it
          } else {
            // For others, they owe their share
            balances[split.userId].totalOwed += split.amount;
          }
        }
      });
    });

    // Calculate net balance
    Object.keys(balances).forEach((userId) => {
      balances[userId].netBalance =
        balances[userId].totalPaid - balances[userId].totalOwed;
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
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
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
    if (!group) return;

    try {
      const memberData = {
        userId: user.id,
        name: user.name || user.email?.split('@')[0] || 'Unknown',
        email: user.email || '',
        photoURL: user.photoURL,
        role: 'member' as const,
        joinedAt: Date.now(),
      };

      await addMemberToGroup(group.id, memberData);
      toast.success(`${memberData.name} added to group successfully!`);

      // Refresh group data
      const updatedGroup = await getGroup(groupId);
      setGroup(updatedGroup);
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add member to group');
    }
  };

  if (groupLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
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
  const balances = calculateMemberBalances();

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link href="/groups">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Groups
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Users className="h-6 w-6 mr-2" />
              {group.name}
            </h1>
            <p className="text-muted-foreground">
              {group.members.length} members • Created{' '}
              {formatDate(group.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isCurrentUserAdmin() && (
            <Button variant="outline" asChild>
              <Link href={`/groups/${groupId}/settings`}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link href={`/groups/${groupId}/expenses/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Link>
          </Button>
          <Button asChild variant="outline">
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
            <CardTitle>Your Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(currentUserBalance.totalPaid)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Net Balance</p>
                <p
                  className={`text-2xl font-bold ${
                    currentUserBalance.netBalance > 0
                      ? 'text-green-600'
                      : currentUserBalance.netBalance < 0
                      ? 'text-red-600'
                      : 'text-foreground'
                  }`}
                >
                  {currentUserBalance.netBalance > 0 ? '+' : ''}
                  {formatCurrency(currentUserBalance.netBalance)}
                </p>
              </div>
            </div>
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
              {group.expenses.length === 0 ? (
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
                  {group.expenses
                    .sort((a, b) => b.date - a.date)
                    .map((expense) => (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() =>
                          router.push(
                            `/groups/${groupId}/expenses/${expense.id}`
                          )
                        }
                      >
                        <div className="flex items-center space-x-4">
                          <div className="p-2 rounded-full bg-primary/10">
                            <Receipt className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{expense.description}</p>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3 mr-1" />
                              <span>{formatDate(expense.date)}</span>
                              <span className="mx-1">•</span>
                              <span>
                                Paid by {getMemberName(expense.paidBy)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatCurrency(expense.amount)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {expense.splits.length} splits
                          </p>
                        </div>
                      </div>
                    ))}
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
              {!group.settlements || group.settlements.length === 0 ? (
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
                  {group.settlements
                    .sort((a, b) => b.date - a.date)
                    .map((settlement) => (
                      <div
                        key={settlement.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="p-2 rounded-full bg-primary/10">
                            <CreditCard className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {getMemberName(settlement.from)} →{' '}
                              {getMemberName(settlement.to)}
                            </p>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3 mr-1" />
                              <span>{formatDate(settlement.date)}</span>
                              {settlement.notes && (
                                <>
                                  <span className="mx-1">•</span>
                                  <span>{settlement.notes}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatCurrency(settlement.amount)}
                          </p>
                        </div>
                      </div>
                    ))}
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
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">
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
                      <p className="text-sm text-muted-foreground">
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
                How much each member has spent and their net balance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {group.members.map((member) => {
                  const balance = balances[member.userId];
                  if (!balance) return null;

                  return (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {member.email}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="grid grid-cols-2 gap-6 text-sm">
                          <div>
                            <p className="text-muted-foreground">Total Spent</p>
                            <p className="font-medium text-blue-600">
                              {formatCurrency(balance.totalPaid)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Net Balance</p>
                            <p
                              className={`font-medium ${
                                balance.netBalance > 0
                                  ? 'text-green-600'
                                  : balance.netBalance < 0
                                  ? 'text-red-600'
                                  : 'text-foreground'
                              }`}
                            >
                              {balance.netBalance > 0 ? '+' : ''}
                              {formatCurrency(balance.netBalance)}
                            </p>
                          </div>
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
