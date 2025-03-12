// components/account/AccountForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAccounts } from '@/lib/firebase/account-context';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Loader2,
  Building,
  CreditCard,
  Wallet,
  LineChart,
  Smartphone,
  IndianRupee,
  ArrowLeft,
} from 'lucide-react';
import { AccountType } from '@/types';

// Validation schema
const accountFormSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  type: z.enum([
    'checking-bank',
    'saving-bank',
    'cash',
    'credit-card',
    'investment',
    'upi',
    'loan',
  ]),
  balance: z.coerce.number(),
  isDefault: z.boolean().default(false),
  notes: z.string().optional(),
  icon: z.string().optional(),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

interface AccountFormProps {
  accountId?: string;
}

export default function AccountForm({ accountId }: AccountFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addAccount, editAccount, getAccount } = useAccounts();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!accountId);

  // Initialize form
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: '',
      type: (searchParams.get('type') as AccountType) || 'bank',
      balance: 0,
      isDefault: false,
      notes: '',
      icon: '',
    },
  });

  // Fetch account data if editing
  useEffect(() => {
    const fetchAccount = async () => {
      if (!accountId) return;

      try {
        const account = await getAccount(accountId);
        if (account) {
          form.reset({
            name: account.name,
            type: account.type,
            balance: account.balance,
            isDefault: account.isDefault,
            notes: account.notes || '',
            icon: account.icon || '',
          });
        }
      } catch (error) {
        console.error('Error fetching account:', error);
        toast.error('Failed to load account details');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchAccount();
  }, [accountId, getAccount, form]);

  // Handle form submission
  const onSubmit = async (data: AccountFormValues) => {
    setLoading(true);
    try {
      if (accountId) {
        // Update existing account
        await editAccount(accountId, data);
        toast.success('Account updated successfully');
      } else {
        // Create new account
        await addAccount(data);
        toast.success('Account created successfully');
      }
      router.push('/accounts');
    } catch (error) {
      toast.error(
        accountId ? 'Failed to update account' : 'Failed to create account'
      );
      console.error('Error saving account:', error);
    } finally {
      setLoading(false);
    }
  };

  // Account type options with icons
  const accountTypes = [
    {
      value: 'bank',
      label: 'Bank Account',
      icon: <Building className="mr-2 h-4 w-4" />,
    },
    { value: 'cash', label: 'Cash', icon: <Wallet className="mr-2 h-4 w-4" /> },
    {
      value: 'credit',
      label: 'Credit Card',
      icon: <CreditCard className="mr-2 h-4 w-4" />,
    },
    {
      value: 'investment',
      label: 'Investment',
      icon: <LineChart className="mr-2 h-4 w-4" />,
    },
    {
      value: 'upi',
      label: 'UPI',
      icon: <Smartphone className="mr-2 h-4 w-4" />,
    },
    {
      value: 'loan',
      label: 'Loan',
      icon: <IndianRupee className="mr-2 h-4 w-4" />,
    },
  ];

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">
          {accountId ? 'Edit Account' : 'Create New Account'}
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Checking Account" {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter a descriptive name for this account.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accountTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center">
                            {type.icon}
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the type that best describes this account.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="balance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Balance</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {form.watch('type') === 'credit-card' ||
                  form.watch('type') === 'loan'
                    ? 'For credit cards and loan, enter the amount you owe as a positive number.'
                    : 'Enter the current balance of this account.'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isDefault"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Default Account</FormLabel>
                  <FormDescription>
                    Set this as your default account for transactions.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Add any additional information about this account"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/accounts')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {accountId ? 'Update Account' : 'Create Account'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
