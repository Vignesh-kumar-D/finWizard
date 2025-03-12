// components/budget/BudgetForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBudgets } from '@/lib/firebase/budget-context';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { CURRENCY } from '@/types/budget.type';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CategorySelect } from '@/components/budget/CategorySelect';
import { getCurrentMonth, formatMonth } from '@/lib/firebase/utils/budget';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';

// Validation schema
const budgetFormSchema = z.object({
  month: z.string(),
  categoryId: z.string({ required_error: 'Please select a category' }),
  plannedAmount: z.coerce.number().min(0, 'Amount must be a positive number'),
  spentAmount: z.coerce.number().min(0, 'Amount must be a positive number'),
  rolloverEnabled: z.boolean().default(false),
});

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

interface BudgetFormProps {
  budgetId?: string;
}

export default function BudgetForm({ budgetId }: BudgetFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    budgets,
    categories,
    createBudget,
    updateBudget,
    removeBudget,
    selectedMonth,
    refreshBudgets,
  } = useBudgets();

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!budgetId);

  // Get category type from URL if provided
  const categoryType = searchParams.get('type') || 'expense';

  // Initialize form
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      month: selectedMonth || getCurrentMonth(),
      categoryId: '',
      plannedAmount: 0,
      spentAmount: 0,
      rolloverEnabled: false,
    },
  });

  // Fetch budget data if editing
  useEffect(() => {
    const fetchBudget = async () => {
      if (!budgetId) return;

      setInitialLoading(true);
      try {
        await refreshBudgets();
        const budget = budgets.find((b) => b.id === budgetId);

        if (budget) {
          form.reset({
            month: budget.month,
            categoryId: budget.categoryId,
            plannedAmount: budget.plannedAmount,
            spentAmount: budget.spentAmount,
            rolloverEnabled: budget.rolloverEnabled || false,
          });
        } else {
          toast.error('Budget not found');
          router.push('/budget');
        }
      } catch (error) {
        console.error('Error fetching budget:', error);
        toast.error('Failed to load budget details');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchBudget();
  }, [budgetId, budgets, refreshBudgets, router, form]);

  // Handle form submission
  const onSubmit = async (data: BudgetFormValues) => {
    setLoading(true);
    try {
      if (budgetId) {
        // Update existing budget
        await updateBudget({
          id: budgetId,
          ...data,
        });
        toast.success('Budget updated successfully');
      } else {
        // Create new budget
        await createBudget(data);
        toast.success('Budget created successfully');
      }
      router.push('/budget');
    } catch (error) {
      toast.error(
        budgetId ? 'Failed to update budget' : 'Failed to create budget'
      );
      console.error('Error saving budget:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle budget deletion
  const handleDelete = async () => {
    if (!budgetId) return;

    setDeleting(true);
    try {
      await removeBudget(budgetId);
      toast.success('Budget deleted successfully');
      router.push('/budget');
    } catch (error) {
      toast.error('Failed to delete budget');
      console.error('Error deleting budget:', error);
    } finally {
      setDeleting(false);
    }
  };

  // Get available months options (current and 11 months back)
  const getMonthOptions = () => {
    const options = [];
    const currentDate = new Date();

    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate);
      date.setMonth(currentDate.getMonth() - i);
      const monthStr = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, '0')}`;
      options.push({
        value: monthStr,
        label: formatMonth(monthStr),
      });
    }

    return options;
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
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
            {budgetId ? 'Edit Budget' : 'Create New Budget'}
          </h1>
        </div>

        {budgetId && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this budget and cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-500 hover:bg-red-600"
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Budget'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Month</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {getMonthOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the month for this budget
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <CategorySelect
                      value={field.value}
                      onChange={field.onChange}
                      categories={categories}
                      type={categoryType as 'expense' | 'income' | 'investment'}
                      refreshCategories={refreshBudgets}
                    />
                  </FormControl>
                  <FormDescription>
                    Choose or create a category for this budget
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="plannedAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Planned Amount ({CURRENCY})</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Set your target budget amount
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="spentAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Spent Amount ({CURRENCY})</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter how much you&apos;ve already spent
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="rolloverEnabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Enable Rollover</FormLabel>
                  <FormDescription>
                    Automatically roll over unspent budget to the next month
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

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/budget')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {budgetId ? 'Update Budget' : 'Create Budget'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
