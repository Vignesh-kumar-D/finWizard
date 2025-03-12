// app/(protected)/accounts/edit/[id]/page.tsx
'use client';
import AccountForm from '@/components/account/AccountForm';
import { Card, CardContent } from '@/components/ui/card';
import { useParams } from 'next/navigation';

export default function EditAccountPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <Card>
      <CardContent className="pt-6">
        <AccountForm accountId={id} />
      </CardContent>
    </Card>
  );
}
