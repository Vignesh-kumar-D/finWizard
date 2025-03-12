'use client';
import BudgetForm from '@/components/account/BudgetForm';
import { Card, CardContent } from '@/components/ui/card';
import { useParams } from 'next/navigation';

export default function EditBudgetPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <Card>
      <CardContent className="pt-6">
        <BudgetForm budgetId={id} />
      </CardContent>
    </Card>
  );
}
