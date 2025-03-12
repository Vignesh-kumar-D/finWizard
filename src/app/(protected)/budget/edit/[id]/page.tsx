import BudgetForm from '@/components/account/BudgetForm';
import { Card, CardContent } from '@/components/ui/card';

export default function EditBudgetPage({ params }: { params: { id: string } }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <BudgetForm budgetId={params.id} />
      </CardContent>
    </Card>
  );
}
