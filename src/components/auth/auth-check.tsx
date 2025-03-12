// components/auth/AuthCheck.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/lib/firebase/firebase-context';
import { PageLoader } from '../shared/loader';

interface AuthCheckProps {
  children: React.ReactNode;
}

export default function AuthCheck({ children }: AuthCheckProps) {
  const { currentUser, loading } = useFirebase();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, loading, router]);

  // Show loading state while checking auth
  if (loading || !currentUser) {
    return <PageLoader />;
  }

  // Render children if authenticated
  return <>{children}</>;
}
