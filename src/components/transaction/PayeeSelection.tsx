// app/transactions/new/components/PayeeSelection.tsx
import React, { useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormLabel } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Payee } from '@/types/transaction';

export function PayeeSelection({
  payees,
  selectedPayee,
  setSelectedPayee,
  newPayeeName,
  setNewPayeeName,
  onAddPayee,
}: {
  payees: Payee[];
  selectedPayee: string;
  setSelectedPayee: (id: string) => void;
  newPayeeName: string;
  setNewPayeeName: (name: string) => void;
  onAddPayee: (name: string) => Promise<Payee | null>;
}) {
  const [showAddPayee, setShowAddPayee] = useState<boolean>(false);

  const handleAddPayee = async () => {
    if (!newPayeeName.trim()) return;

    const result = await onAddPayee(newPayeeName);
    if (result) {
      setShowAddPayee(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <FormLabel>Payee</FormLabel>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowAddPayee(true)}
        >
          <Plus className="h-4 w-4 mr-1" /> Add New
        </Button>
      </div>

      {!showAddPayee ? (
        <Select onValueChange={setSelectedPayee} value={selectedPayee}>
          <SelectTrigger>
            <SelectValue placeholder="Select payee (optional)" />
          </SelectTrigger>
          <SelectContent>
            {payees.map((payee) => (
              <SelectItem key={payee.id} value={payee.id}>
                {payee.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            placeholder="New payee name"
            value={newPayeeName}
            onChange={(e) => setNewPayeeName(e.target.value)}
          />
          <Button
            type="button"
            onClick={handleAddPayee}
            disabled={!newPayeeName.trim()}
          >
            Add
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowAddPayee(false)}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
