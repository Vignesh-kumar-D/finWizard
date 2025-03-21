// app/transactions/new/components/TransactionNote.tsx
import React from 'react';

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { TransactionFormValues } from '@/types/transaction';
import { UseFormReturn } from 'react-hook-form';

export function TransactionNote({
  form,
}: {
  form: UseFormReturn<TransactionFormValues>;
}) {
  return (
    <FormField
      control={form.control}
      name="description"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Note (Optional)</FormLabel>
          <FormControl>
            <Textarea
              placeholder="Add details about this transaction"
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
