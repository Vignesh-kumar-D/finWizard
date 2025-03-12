// app/(protected)/accounts/new/page.tsx
import AccountForm from '@/components/account/AccountForm';
import { Card, CardContent } from '@/components/ui/card';

export default function CreateAccountPage() {
  return (
    <Card>
      <CardContent className="pt-6">
        <AccountForm />
      </CardContent>
    </Card>
  );
}
