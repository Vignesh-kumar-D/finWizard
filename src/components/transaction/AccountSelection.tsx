// app/transactions/new/components/AccountSelection.tsx
import React from 'react';

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Account } from '@/types';
import { TransactionFormValues } from '@/types/transaction';
import { UseFormReturn } from 'react-hook-form';

export function AccountSelection({
  form,
  accounts,
  transactionType,
}: {
  form: UseFormReturn<TransactionFormValues>;
  accounts: Account[];
  transactionType: string;
}) {
  // Filter accounts based on type (spending/saving for expense, income for income)
  const filteredAccounts = accounts.filter((account) => {
    if (transactionType === 'expense') {
      return (
        account.type === 'saving-bank' ||
        account.type === 'checking-bank' ||
        account.type === 'cash'
      );
    } else if (transactionType === 'income') {
      return true; // All accounts can receive income
    } else if (transactionType === 'transfer') {
      return true; // All accounts can be used in transfers
    }
    return false;
  });

  // Filter destination accounts for transfers (exclude the selected source account)
  const filteredDestinationAccounts = accounts.filter((account) => {
    return (
      account.id !== form.watch('accountId') && account.type !== 'investment'
    );
  });

  return (
    <>
      <FormField
        control={form.control}
        name="accountId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {transactionType === 'expense'
                ? 'From Account'
                : transactionType === 'income'
                ? 'To Account'
                : 'From Account'}
            </FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {filteredAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* To Account (for transfers only) */}
      {transactionType === 'transfer' && (
        <FormField
          control={form.control}
          name="toAccountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>To Account</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination account" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredDestinationAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
}
