// app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/lib/firebase/firebase-context';
import { PageLoader } from '@/components/shared/loader';

export default function HomePage() {
  const { currentUser, loading } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        router.push('/login');
      } else {
        router.push('/farmers');
      }
    }
  }, [currentUser, loading, router]);

  // Show loading spinner while determining where to redirect
  return <PageLoader />;
}
