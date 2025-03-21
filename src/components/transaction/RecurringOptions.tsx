// app/transactions/new/components/RecurringOptions.tsx
import React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FormLabel, FormDescription } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RecurrenceFrequency } from '@/types/transaction';
import { cn } from '@/lib/utils';

export function RecurringOptions({
  isRecurring,
  setIsRecurring,
  recurringFrequency,
  setRecurringFrequency,
  recurringEndDate,
  setRecurringEndDate,
}: {
  isRecurring: boolean;
  setIsRecurring: (value: boolean) => void;
  recurringFrequency: RecurrenceFrequency;
  setRecurringFrequency: (value: RecurrenceFrequency) => void;
  recurringEndDate: Date | null;
  setRecurringEndDate: (date: Date | null) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <FormLabel>Recurring Transaction</FormLabel>
          <FormDescription>
            Set up this transaction to repeat automatically
          </FormDescription>
        </div>
        <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
      </div>

      {isRecurring && (
        <div className="space-y-4 pl-4 border-l-2 border-muted">
          <div>
            <FormLabel>Frequency</FormLabel>
            <Select
              value={recurringFrequency}
              onValueChange={(value) =>
                setRecurringFrequency(value as RecurrenceFrequency)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annually">Annually</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <FormLabel>End Date (Optional)</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !recurringEndDate && 'text-muted-foreground'
                  )}
                >
                  {recurringEndDate ? (
                    format(recurringEndDate, 'PPP')
                  ) : (
                    <span>No end date (continues indefinitely)</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-2 flex justify-between border-b">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRecurringEndDate(null)}
                  >
                    Clear
                  </Button>
                </div>
                <Calendar
                  mode="single"
                  selected={recurringEndDate || undefined}
                  onSelect={(date) => setRecurringEndDate(date ?? null)}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}
    </div>
  );
}
