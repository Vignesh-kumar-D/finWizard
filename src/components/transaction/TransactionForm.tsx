// components/transaction/TransactionForm.tsx
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
  Transaction,
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
import { Skeleton } from '@/components/ui/skeleton';

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

interface TransactionFormProps {
  id?: string; // Optional ID for editing existing transaction
}

export default function TransactionForm({ id }: TransactionFormProps) {
  const router = useRouter();
  const {
    addTransaction,
    editTransaction,
    getTransaction,
    addPayee,
    payees,
    tags,
    addTag,
    createRecurring,
  } = useTransactions();
  const { currentUser } = useFirebase();
  const { accounts } = useAccounts();
  const { categories } = useBudgets();

  // State for tracking if we're in edit mode
  const isEditMode = !!id;
  const [isLoading, setIsLoading] = useState<boolean>(!!id);
  const [, setOriginalTransaction] = useState<Transaction | null>(null);

  // State for handling payee selection/creation
  const [selectedPayee, setSelectedPayee] = useState<string>('');
  const [newPayeeName, setNewPayeeName] = useState<string>('');

  // State for handling tag selection/creation
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // State for handling receipt image
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(
    null
  );
  const [removeExistingReceipt, setRemoveExistingReceipt] =
    useState<boolean>(false);

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

  // Fetch transaction data if in edit mode
  useEffect(() => {
    if (id) {
      const fetchTransaction = async () => {
        try {
          setIsLoading(true);
          const data = await getTransaction(id);

          if (data) {
            setOriginalTransaction(data);

            // Populate form with transaction data
            form.reset({
              type: data.type,
              amount: data.amount.toString(),
              date: new Date(data.date),
              accountId: data.accountId,
              toAccountId: data.toAccountId || '',
              categoryId: data.categoryId || '',
              paymentMethod: data.paymentMethod || 'card',
              description: data.description || '',
            });

            // Set other state values
            setSelectedPayee(data.payeeId || '');
            setNewPayeeName(data.payeeName || '');
            setSelectedTags(data.tags || []);
            setIsRecurring(data.isRecurring);
            setExistingReceiptUrl(data.receiptImageUrl || null);

            // If it's a recurring transaction, we would need to fetch the recurring details
            if (data.isRecurring && data.recurringId) {
              // You would need to implement a getRecurringTransaction function
              // const recurringData = await getRecurringTransaction(data.recurringId);
              // setRecurringFrequency(recurringData.frequency);
              // setRecurringEndDate(recurringData.endDate ? new Date(recurringData.endDate) : null);
            }
          } else {
            toast.error('Transaction not found');
            router.push('/transactions');
          }
        } catch (error) {
          console.error('Error fetching transaction:', error);
          toast.error('Failed to load transaction');
          router.push('/transactions');
        } finally {
          setIsLoading(false);
        }
      };

      fetchTransaction();
    }
  }, [id, getTransaction, router, form]);

  const transactionType = form.watch('type');

  // Prefill account if there's only one option
  useEffect(() => {
    // Skip this if we're in edit mode and still loading the transaction
    if (isEditMode && isLoading) return;

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
  }, [accounts, form, transactionType, isEditMode, isLoading]);

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

      if (isEditMode && id) {
        // We're editing an existing transaction
        const updatedTransaction = {
          type: data.type,
          date: data.date.getTime(),
          amount: parseFloat(data.amount),
          categoryId: data.categoryId || '',
          accountId: data.accountId,
          toAccountId: data.type === 'transfer' ? data.toAccountId : null,
          payeeId: selectedPayee || null,
          payeeName:
            !selectedPayee && newPayeeName.trim() ? newPayeeName.trim() : null,
          paymentMethod: data.paymentMethod,
          description: data.description,
          tags: selectedTags.length > 0 ? selectedTags : [],
          // Set receiptImageUrl to null if we're removing the existing receipt
          receiptImageUrl: removeExistingReceipt || null,
        };

        await editTransaction(id, updatedTransaction, receiptImage);
        toast.success('Transaction updated');
        router.push(`/transactions/${id}`);
      } else {
        // We're creating a new transaction
        const transaction = {
          userId: currentUser?.uid ?? '',
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
            userId: currentUser?.uid ?? '',
            title: `${transaction.payeeName || 'Transaction'} (${
              transaction.amount
            })`,
            amount: transaction.amount,
            type: transaction.type,
            categoryId: transaction.categoryId,
            accountId: transaction.accountId,
            toAccountId: transaction.toAccountId ?? null,
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

        await addTransaction(transaction, receiptImage || undefined);
        toast.success('Transaction created');
        router.push('/transactions');
      }
    } catch (error) {
      console.error(
        `Error ${isEditMode ? 'updating' : 'creating'} transaction:`,
        error
      );
      toast.error(`Error ${isEditMode ? 'updating' : 'creating'} transaction`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Methods for handling payee
  const handleAddPayee = async (payeeName: string) => {
    if (!payeeName.trim()) return null;

    try {
      const newPayee = await addPayee({
        userId: currentUser?.uid ?? '',
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
        userId: currentUser?.uid ?? '',
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

  // Handle receipt removal
  const handleReceiptRemoval = () => {
    setReceiptImage(null);
    setRemoveExistingReceipt(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Skeleton className="h-10 w-full" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {isEditMode ? 'Edit Transaction' : 'Add New Transaction'}
          </CardTitle>
          <CardDescription>
            {isEditMode
              ? 'Update the details of your transaction'
              : 'Record a new expense, income, or transfer between accounts'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Transaction Type Tabs */}
              <Tabs
                defaultValue={form.getValues('type')}
                value={transactionType}
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
                existingImageUrl={
                  !removeExistingReceipt ? existingReceiptUrl : null
                }
                onRemove={handleReceiptRemoval}
              />

              {/* Recurring Transaction Options - only show for new transactions */}
              {!isEditMode && (
                <RecurringOptions
                  isRecurring={isRecurring}
                  setIsRecurring={setIsRecurring}
                  recurringFrequency={recurringFrequency}
                  setRecurringFrequency={setRecurringFrequency}
                  recurringEndDate={recurringEndDate}
                  setRecurringEndDate={setRecurringEndDate}
                />
              )}

              {/* Submit Buttons */}
              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    router.push(
                      isEditMode ? `/transactions/${id}` : '/transactions'
                    )
                  }
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
                  ) : isEditMode ? (
                    'Update Transaction'
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
