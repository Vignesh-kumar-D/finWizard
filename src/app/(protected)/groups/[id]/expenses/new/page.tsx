'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFirebase } from '@/lib/firebase/firebase-context';
import { useGroups } from '@/lib/firebase/group-context';
import { serverTimestamp } from 'firebase/firestore';
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

import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Users, Receipt, Equal, Percent, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { Group, SharedExpense, ExpenseSplit } from '@/types';
import { formatCurrency } from '@/lib/format';

type SplitType = 'equal' | 'percentage' | 'custom';

interface SplitOption {
  userId: string;
  name: string;
  email: string;
  amount: number;
  percentage: number;
  isIncluded: boolean;
}

export default function CreateGroupExpensePage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useFirebase();
  const { getGroup, addExpenseToGroup } = useGroups();

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(false);
  const [groupLoading, setGroupLoading] = useState(true);

  // Expense details
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('');
  const [paidBy, setPaidBy] = useState('');

  // Split options
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [splitOptions, setSplitOptions] = useState<SplitOption[]>([]);

  const groupId = params.id as string;

  useEffect(() => {
    const fetchGroup = async () => {
      if (!groupId) return;

      setGroupLoading(true);
      try {
        const groupData = await getGroup(groupId);
        setGroup(groupData);

        if (groupData) {
          // Initialize split options
          const options: SplitOption[] = groupData.members.map((member) => ({
            userId: member.userId,
            name: member.name,
            email: member.email,
            amount: 0,
            percentage: 0,
            isIncluded: true,
          }));
          setSplitOptions(options);

          // Set current user as default payer
          if (currentUser) {
            setPaidBy(currentUser.uid);
          }
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

  // Calculate splits when amount or split type changes
  useEffect(() => {
    if (!amount || !group) return;

    const totalAmount = parseFloat(amount);
    if (isNaN(totalAmount) || totalAmount <= 0) return;

    setSplitOptions((prevOptions) => {
      const includedMembers = prevOptions.filter((option) => option.isIncluded);
      if (includedMembers.length === 0) return prevOptions;

      return prevOptions.map((option) => {
        if (!option.isIncluded) {
          return { ...option, amount: 0, percentage: 0 };
        }

        let newAmount = 0;
        let newPercentage = 0;

        switch (splitType) {
          case 'equal':
            newAmount = totalAmount / includedMembers.length;
            newPercentage = (newAmount / totalAmount) * 100;
            break;
          case 'percentage':
            // Keep existing percentage, recalculate amount
            newAmount = (option.percentage / 100) * totalAmount;
            break;
          case 'custom':
            // Keep existing amount, recalculate percentage
            newPercentage = (option.amount / totalAmount) * 100;
            break;
        }

        return {
          ...option,
          amount: Math.round(newAmount * 100) / 100, // Round to 2 decimal places
          percentage: Math.round(newPercentage * 100) / 100,
        };
      });
    });
  }, [amount, splitType, group]);

  const handleSplitTypeChange = (type: SplitType) => {
    setSplitType(type);

    if (type === 'equal') {
      // Reset all amounts and percentages for equal split
      const totalAmount = parseFloat(amount) || 0;
      const includedMembers = splitOptions.filter(
        (option) => option.isIncluded
      );

      if (includedMembers.length > 0) {
        const equalAmount = totalAmount / includedMembers.length;
        const equalPercentage = (equalAmount / totalAmount) * 100;

        setSplitOptions(
          splitOptions.map((option) => ({
            ...option,
            amount: option.isIncluded ? Math.round(equalAmount * 100) / 100 : 0,
            percentage: option.isIncluded
              ? Math.round(equalPercentage * 100) / 100
              : 0,
          }))
        );
      }
    }
  };

  const handleMemberToggle = (userId: string) => {
    setSplitOptions(
      splitOptions.map((option) =>
        option.userId === userId
          ? { ...option, isIncluded: !option.isIncluded }
          : option
      )
    );
  };

  const handleCustomAmountChange = (userId: string, newAmount: string) => {
    const amountValue = parseFloat(newAmount) || 0;
    const totalAmount = parseFloat(amount) || 0;

    setSplitOptions(
      splitOptions.map((option) => {
        if (option.userId === userId) {
          return {
            ...option,
            amount: amountValue,
            percentage:
              totalAmount > 0
                ? Math.round((amountValue / totalAmount) * 100 * 100) / 100
                : 0,
          };
        }
        return option;
      })
    );
  };

  const handleCustomPercentageChange = (
    userId: string,
    newPercentage: string
  ) => {
    const percentageValue = parseFloat(newPercentage) || 0;
    const totalAmount = parseFloat(amount) || 0;

    setSplitOptions(
      splitOptions.map((option) => {
        if (option.userId === userId) {
          return {
            ...option,
            percentage: percentageValue,
            amount:
              Math.round((percentageValue / 100) * totalAmount * 100) / 100,
          };
        }
        return option;
      })
    );
  };

  const validateForm = () => {
    if (!description.trim()) {
      toast.error('Description is required');
      return false;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Amount must be greater than 0');
      return false;
    }

    if (!paidBy) {
      toast.error('Please select who paid for this expense');
      return false;
    }

    const includedMembers = splitOptions.filter((option) => option.isIncluded);
    if (includedMembers.length === 0) {
      toast.error('At least one member must be included in the split');
      return false;
    }

    const totalAmount = parseFloat(amount);
    const totalSplit = includedMembers.reduce(
      (sum, option) => sum + option.amount,
      0
    );

    if (Math.abs(totalSplit - totalAmount) > 0.01) {
      toast.error('Split amounts must equal the total amount');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !group || !currentUser) return;

    setLoading(true);
    try {
      const totalAmount = parseFloat(amount);
      const includedMembers = splitOptions.filter(
        (option) => option.isIncluded
      );

      const splits: ExpenseSplit[] = includedMembers.map((member) => ({
        userId: member.userId,
        amount: member.amount,
        isPaid: false,
      }));

      const expenseData: Omit<SharedExpense, 'id'> = {
        groupId,
        date: new Date(date).getTime(),
        amount: totalAmount,
        description: description.trim(),
        paidBy,
        category: category.trim() || '',
        splits,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
      };

      await addExpenseToGroup(groupId, expenseData as SharedExpense);
      toast.success('Expense added successfully!');
      router.push(`/groups/${groupId}`);
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  const totalSplit = splitOptions
    .filter((option) => option.isIncluded)
    .reduce((sum, option) => sum + option.amount, 0);

  const totalAmount = parseFloat(amount) || 0;
  const difference = totalSplit - totalAmount;

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
    <div className="container mx-auto py-4 px-4 max-w-4xl">
      <div className="flex items-center mb-4">
        <Link href={`/groups/${groupId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Group
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Expense Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Receipt className="h-5 w-5 mr-2" />
              Expense Details
            </CardTitle>
            <CardDescription>Enter the details of the expense</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What was this expense for?"
                  required
                />
              </div>

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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category (Optional)</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Food, Transport"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paidBy">Paid By *</Label>
                <Select value={paidBy} onValueChange={setPaidBy} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select who paid" />
                  </SelectTrigger>
                  <SelectContent>
                    {group.members.map((member) => (
                      <SelectItem key={member.userId} value={member.userId}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Split Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Split Options
            </CardTitle>
            <CardDescription>
              Choose how to split this expense among group members
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Split Type Selection */}
            <div className="space-y-2">
              <Label>Split Type</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={splitType === 'equal' ? 'default' : 'outline'}
                  onClick={() => handleSplitTypeChange('equal')}
                  className="flex items-center"
                >
                  <Equal className="h-4 w-4 mr-2" />
                  Equal
                </Button>
                <Button
                  type="button"
                  variant={splitType === 'percentage' ? 'default' : 'outline'}
                  onClick={() => handleSplitTypeChange('percentage')}
                  className="flex items-center"
                >
                  <Percent className="h-4 w-4 mr-2" />
                  Percentage
                </Button>
                <Button
                  type="button"
                  variant={splitType === 'custom' ? 'default' : 'outline'}
                  onClick={() => handleSplitTypeChange('custom')}
                  className="flex items-center"
                >
                  <Hash className="h-4 w-4 mr-2" />
                  Custom Amount
                </Button>
              </div>
            </div>

            {/* Member Split Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Members</Label>
                <div className="text-sm text-muted-foreground">
                  Total: {formatCurrency(totalSplit)} /{' '}
                  {formatCurrency(totalAmount)}
                  {Math.abs(difference) > 0.01 && (
                    <span
                      className={`ml-2 ${
                        difference > 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      ({difference > 0 ? '+' : ''}
                      {formatCurrency(difference)})
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {splitOptions.map((option) => (
                  <div
                    key={option.userId}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={option.isIncluded}
                        onCheckedChange={() =>
                          handleMemberToggle(option.userId)
                        }
                      />
                      <div>
                        <p className="font-medium">{option.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {option.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {splitType === 'custom' && (
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={option.amount.toFixed(2)}
                          onChange={(e) =>
                            handleCustomAmountChange(
                              option.userId,
                              e.target.value
                            )
                          }
                          className="w-24"
                          disabled={!option.isIncluded}
                        />
                      )}
                      {splitType === 'percentage' && (
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={option.percentage.toFixed(1)}
                            onChange={(e) =>
                              handleCustomPercentageChange(
                                option.userId,
                                e.target.value
                              )
                            }
                            className="w-20"
                            disabled={!option.isIncluded}
                          />
                          <span className="text-sm">%</span>
                        </div>
                      )}
                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(option.amount)}
                        </p>
                        {splitType === 'percentage' && (
                          <p className="text-sm text-muted-foreground">
                            {option.percentage.toFixed(1)}%
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Adding...' : 'Add Expense'}
          </Button>
        </div>
      </form>
    </div>
  );
}
