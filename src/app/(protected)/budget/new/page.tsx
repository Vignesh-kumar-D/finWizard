// app/(protected)/budget/new/page.tsx
import BudgetForm from '@/components/account/ButtonForm';
import { Card, CardContent } from '@/components/ui/card';

export default function CreateBudgetPage() {
  return (
    <Card>
      <CardContent className="pt-6">
        <BudgetForm />
      </CardContent>
    </Card>
  );
}
