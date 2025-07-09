'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFirebase } from '@/lib/firebase/firebase-context';
import { useGroups } from '@/lib/firebase/group-context-scalable';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, DollarSign, User, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Group, Settlement } from '@/types';
import { formatCurrency } from '@/lib/format';

export default function CreateSettlementPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useFirebase();
  const { getGroup, addSettlementToGroup } = useGroups();

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(false);
  const [groupLoading, setGroupLoading] = useState(true);

  // Settlement details
  const [fromUserId, setFromUserId] = useState('');
  const [toUserId, setToUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const groupId = params.id as string;

  useEffect(() => {
    const fetchGroup = async () => {
      if (!groupId) return;

      setGroupLoading(true);
      try {
        const groupData = await getGroup(groupId);
        setGroup(groupData);

        if (groupData && currentUser) {
          // Set current user as default payer
          setFromUserId(currentUser.uid);
        }
      } catch (error) {
        console.error('Error fetching group:', error);
        toast.error('Failed to load group');
      } finally {
        setGroupLoading(false);
      }
    };

    fetchGroup();
  }, [groupId, getGroup, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!group || !currentUser) return;

    if (!fromUserId || !toUserId) {
      toast.error('Please select both payer and payee');
      return;
    }

    if (fromUserId === toUserId) {
      toast.error('Payer and payee cannot be the same person');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const settlementData: Omit<Settlement, 'id'> = {
        groupId,
        from: fromUserId,
        to: toUserId,
        amount: parseFloat(amount),
        date: new Date(date).getTime(),
        relatedExpenseIds: [], // Can be enhanced to link to specific expenses
        notes: notes.trim() || '',
      };

      await addSettlementToGroup(groupId, settlementData);
      toast.success('Settlement added successfully!');
      router.push(`/groups/${groupId}`);
    } catch (error) {
      console.error('Error adding settlement:', error);
      toast.error('Failed to add settlement');
    } finally {
      setLoading(false);
    }
  };

  const getMemberName = (userId: string) => {
    return group?.members.find((m) => m.userId === userId)?.name || 'Unknown';
  };

  if (groupLoading) {
    return (
      <div className="container mx-auto py-8">
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

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="flex items-center mb-6">
        <Link href={`/groups/${groupId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Group
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Add Settlement
            </CardTitle>
            <CardDescription>
              Record a payment between group members to settle debts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromUser">Paid By *</Label>
                <Select
                  value={fromUserId}
                  onValueChange={setFromUserId}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select who paid" />
                  </SelectTrigger>
                  <SelectContent>
                    {group.members.map((member) => (
                      <SelectItem key={member.userId} value={member.userId}>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          {member.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="toUser">Paid To *</Label>
                <Select value={toUserId} onValueChange={setToUserId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select who received" />
                  </SelectTrigger>
                  <SelectContent>
                    {group.members.map((member) => (
                      <SelectItem key={member.userId} value={member.userId}>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          {member.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this settlement..."
                rows={3}
              />
            </div>

            {/* Settlement Preview */}
            {fromUserId && toUserId && amount && (
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg">Settlement Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {getMemberName(fromUserId)}
                        </p>
                        <p className="text-sm text-muted-foreground">Paid</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold text-red-600">
                        -{formatCurrency(parseFloat(amount) || 0)}
                      </span>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{getMemberName(toUserId)}</p>
                        <p className="text-sm text-muted-foreground">
                          Received
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Adding...' : 'Add Settlement'}
          </Button>
        </div>
      </form>
    </div>
  );
}
