// app/transactions/new/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTransactions } from '@/lib/firebase/transaction-context';
import { useAccounts } from '@/lib/firebase/account-context';
import { useBudgets } from '@/lib/firebase/budget-context';
import { TransactionType } from '@/types/index';
import {
  RecurrenceFrequency,
  transactionFormSchema,
  TransactionFormValues,
} from '@/types/transaction';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

// Import our custom components
import {
  TransactionBasicDetails,
  AccountSelection,
  CategorySelection,
  PayeeSelection,
  PaymentMethodSelection,
  TransactionNote,
  TagSelection,
  ReceiptUpload,
  RecurringOptions,
} from '@/components/transaction';
import { useFirebase } from '@/lib/firebase/firebase-context';

// Define Zod schema for transaction form

// Add conditional validation based on transaction type
const transactionFormValidator = z
  .function()
  .args(transactionFormSchema)
  .returns(z.any())
  .implement((data) => {
    // Base validation
    const result = transactionFormSchema.safeParse(data);
    if (!result.success) return result;

    // Specific validations based on transaction type
    if (data.type === 'transfer' && !data.toAccountId) {
      return {
        success: false,
        error: {
          issues: [
            {
              code: 'custom',
              path: ['toAccountId'],
              message: 'Destination account is required for transfers',
            },
          ],
        },
      };
    }

    if (data.type !== 'transfer' && !data.categoryId) {
      return {
        success: false,
        error: {
          issues: [
            {
              code: 'custom',
              path: ['categoryId'],
              message: 'Category is required',
            },
          ],
        },
      };
    }

    return result;
  });

// Type inference from schema

export default function NewTransactionPage() {
  const router = useRouter();
  const { addTransaction, addPayee, payees, tags, addTag, createRecurring } =
    useTransactions();
  const { currentUser } = useFirebase();
  const { accounts } = useAccounts();
  const { categories } = useBudgets();

  // State for handling payee selection/creation
  const [selectedPayee, setSelectedPayee] = useState<string>('');
  const [newPayeeName, setNewPayeeName] = useState<string>('');

  // State for handling tag selection/creation
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // State for handling receipt image
  const [receiptImage, setReceiptImage] = useState<File | null>(null);

  // State for handling recurring transaction
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurringFrequency, setRecurringFrequency] =
    useState<RecurrenceFrequency>('monthly');
  const [recurringEndDate, setRecurringEndDate] = useState<Date | null>(null);

  // State for loading indicator
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form setup with react-hook-form and zod validation
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: 'expense',
      amount: '',
      date: new Date(),
      accountId: '',
      toAccountId: '',
      categoryId: '',
      paymentMethod: 'card',
      description: '',
    },
    mode: 'onChange',
  });

  const transactionType = form.watch('type');

  // Prefill account if there's only one option
  useEffect(() => {
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
        return true;
      }
      return false;
    });

    if (filteredAccounts.length === 1 && !form.getValues('accountId')) {
      form.setValue('accountId', filteredAccounts[0].id);
    }
  }, [accounts, form, transactionType]);

  // Handle form submission
  const onSubmit = async (data: TransactionFormValues) => {
    try {
      setIsSubmitting(true);

      // Perform conditional validation
      const validationResult = transactionFormValidator(data);
      if (!validationResult.success) {
        validationResult.error.issues.forEach((issue) => {
          form.setError(
            issue.path[0] as
              | 'type'
              | 'date'
              | 'amount'
              | 'accountId'
              | 'toAccountId'
              | 'categoryId'
              | 'paymentMethod'
              | 'description'
              | 'recurringId'
              | `root.${string}`
              | 'root',
            {
              type: 'manual',
              message: issue.message,
            }
          );
        });
        setIsSubmitting(false);
        return;
      }
      // Format the data for submission
      const transaction = {
        userId: currentUser?.uid ?? '', // Will be set by the server
        date: data.date.getTime(),
        amount: parseFloat(data.amount),
        type: data.type,
        categoryId: data.categoryId || '',
        accountId: data.accountId,
        toAccountId: data.type === 'transfer' ? data.toAccountId : null,
        payeeId: selectedPayee || null,
        payeeName: newPayeeName.trim() ? newPayeeName.trim() : null,
        paymentMethod: data.paymentMethod,
        description: data.description,
        tags: selectedTags.length > 0 ? selectedTags : [],
        isPlanned: false,
        isRecurring: isRecurring,
        recurringId: '',
        receiptImageUrl: '',
      };

      // If it's a recurring transaction, create that first
      if (isRecurring) {
        const recurring = {
          userId: currentUser?.uid ?? '', // Will be set by the server
          title: `${transaction.payeeName || 'Transaction'} (${
            transaction.amount
          })`,
          amount: transaction.amount,
          type: transaction.type,
          categoryId: transaction.categoryId,
          accountId: transaction.accountId,
          toAccountId: transaction.toAccountId,
          payeeId: transaction.payeeId,
          payeeName: transaction.payeeName,
          paymentMethod: transaction.paymentMethod,
          description: transaction.description,
          tags: transaction.tags,
          frequency: recurringFrequency,
          startDate: transaction.date,
          endDate: recurringEndDate ? recurringEndDate.getTime() : null,
          nextDueDate: transaction.date,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const createdRecurring = await createRecurring(recurring);
        transaction.recurringId = createdRecurring.id;
      }

      // Create the transaction
      await addTransaction(transaction, receiptImage || undefined);

      // Show success toast
      toast.success('Transaction created');

      // Navigate back to transactions list
      router.push('/transactions');
    } catch (error) {
      console.error('Error creating transaction:', error);

      // Show error toast
      toast.error('Error creating transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Methods for handling payee
  const handleAddPayee = async (payeeName: string) => {
    if (!payeeName.trim()) return null;

    try {
      const newPayee = await addPayee({
        userId: currentUser?.uid ?? '', // Will be set by the server
        name: payeeName,
        type: 'person',
      });

      setSelectedPayee(newPayee.id);
      setNewPayeeName(newPayee.name);

      toast.success('Payee added');

      return newPayee;
    } catch (error) {
      console.error('Error adding payee:', error);

      toast.error('Error adding payee');

      return null;
    }
  };

  // Methods for handling tags
  const handleAddTag = async (tagName: string, tagColor: string) => {
    if (!tagName.trim()) return null;

    try {
      const newTag = await addTag({
        userId: '', // Will be set by the server
        name: tagName,
        color: tagColor,
      });

      setSelectedTags([...selectedTags, newTag.id]);

      toast.success('Tag added');

      return newTag;
    } catch (error) {
      console.error('Error adding tag:', error);

      toast.error('Error adding tag');

      return null;
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Add New Transaction</CardTitle>
          <CardDescription>
            Record a new expense, income, or transfer between accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Transaction Type Tabs */}
              <Tabs
                defaultValue="expense"
                onValueChange={(value) => {
                  form.setValue('type', value as TransactionType);

                  // Reset certain fields when changing transaction type
                  if (value === 'transfer') {
                    form.setValue('categoryId', '');
                    form.setValue('paymentMethod', 'upi');
                    setSelectedPayee('');
                  } else {
                    form.setValue('toAccountId', '');
                  }
                }}
                className="w-full"
              >
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="expense">Expense</TabsTrigger>
                  <TabsTrigger value="income">Income</TabsTrigger>
                  <TabsTrigger value="transfer">Transfer</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Basic Details (Amount & Date) */}
              <TransactionBasicDetails form={form} />

              {/* Account Selection */}
              <AccountSelection
                form={form}
                accounts={accounts}
                transactionType={transactionType}
              />

              {/* Category & Subcategory Selection */}
              {transactionType !== 'transfer' && (
                <CategorySelection
                  form={form}
                  categories={categories}
                  transactionType={transactionType}
                />
              )}

              {/* Payee Selection */}
              {transactionType !== 'transfer' && (
                <PayeeSelection
                  payees={payees}
                  selectedPayee={selectedPayee}
                  setSelectedPayee={setSelectedPayee}
                  newPayeeName={newPayeeName}
                  setNewPayeeName={setNewPayeeName}
                  onAddPayee={handleAddPayee}
                />
              )}

              {/* Payment Method Selection (for expenses only) */}
              {transactionType === 'expense' && (
                <PaymentMethodSelection form={form} />
              )}

              {/* Transaction Note/Description */}
              <TransactionNote form={form} />

              {/* Tag Selection */}
              <TagSelection
                tags={tags}
                selectedTags={selectedTags}
                setSelectedTags={setSelectedTags}
                onAddTag={handleAddTag}
              />

              {/* Receipt Image Upload */}
              <ReceiptUpload
                receiptImage={receiptImage}
                setReceiptImage={setReceiptImage}
              />

              {/* Recurring Transaction Options */}
              <RecurringOptions
                isRecurring={isRecurring}
                setIsRecurring={setIsRecurring}
                recurringFrequency={recurringFrequency}
                setRecurringFrequency={setRecurringFrequency}
                recurringEndDate={recurringEndDate}
                setRecurringEndDate={setRecurringEndDate}
              />

              {/* Submit Buttons */}
              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/transactions')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Saving...
                    </>
                  ) : isRecurring ? (
                    'Save & Create Recurring'
                  ) : (
                    'Save Transaction'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
