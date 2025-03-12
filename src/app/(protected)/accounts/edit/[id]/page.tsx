// app/(protected)/accounts/edit/[id]/page.tsx
import AccountForm from '@/components/account/AccountForm';
import { Card, CardContent } from '@/components/ui/card';

export default function EditAccountPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <AccountForm accountId={params.id} />
      </CardContent>
    </Card>
  );
}
