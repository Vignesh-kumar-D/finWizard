'use client';

import React, { useState, useEffect } from 'react';
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
import { TrendingUp, DollarSign, Users } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

export default function UserBalancePage() {
  const { currentUser } = useFirebase();
  const { getUserBalance } = useGroups();

  const [balanceData, setBalanceData] = useState<{
    totalOwed: number;
    totalPaid: number;
    netBalance: number;
    groupBalances: Record<
      string,
      {
        groupName: string;
        owed: number;
        paid: number;
        net: number;
      }
    >;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBalanceData = async () => {
      if (!currentUser) return;

      setLoading(true);
      try {
        const balance = await getUserBalance(currentUser.uid);
        setBalanceData(balance);
      } catch (error) {
        console.error('Error fetching balance data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBalanceData();
  }, [currentUser, getUserBalance]);

  if (loading) {
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

  if (!balanceData) {
    return (
      <div className="container mx-auto py-8">
        <Card className="text-center p-8">
          <CardHeader>
            <CardTitle>No Balance Data</CardTitle>
            <CardDescription>
              You are not part of any groups yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/groups">Join or Create a Group</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { totalPaid, netBalance, groupBalances } = balanceData;

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Balances</h1>
        <p className="text-muted-foreground">
          Overview of your balances across all groups
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total amount you&apos;ve spent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                netBalance > 0
                  ? 'text-green-600'
                  : netBalance < 0
                  ? 'text-red-600'
                  : 'text-muted-foreground'
              }`}
            >
              {netBalance > 0 ? '+' : ''}
              {formatCurrency(netBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Your overall balance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Group Balances */}
      <Card>
        <CardHeader>
          <CardTitle>Group Balances</CardTitle>
          <CardDescription>Your balance breakdown by group</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(groupBalances).map(([groupId, balance]) => (
              <div
                key={groupId}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{balance.groupName}</p>
                    <p className="text-sm text-muted-foreground">
                      Spent: {formatCurrency(balance.paid)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-lg font-bold ${
                      balance.net > 0
                        ? 'text-green-600'
                        : balance.net < 0
                        ? 'text-red-600'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {balance.net > 0 ? '+' : ''}
                    {formatCurrency(balance.net)}
                  </p>
                  <Badge
                    variant={
                      balance.net > 0
                        ? 'default'
                        : balance.net < 0
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {balance.net > 0
                      ? 'You are owed'
                      : balance.net < 0
                      ? 'You owe'
                      : 'Settled'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
