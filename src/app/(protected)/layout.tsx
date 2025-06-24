// app/(protected)/layout.tsx
import { Toaster } from '@/components/ui/sonner';
import Header from '@/components/shared/Header';
import AuthCheck from '@/components/auth/auth-check';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthCheck>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pb-16 px-4 py-4">{children}</main>
      </div>
      <Toaster />
    </AuthCheck>
  );
}
