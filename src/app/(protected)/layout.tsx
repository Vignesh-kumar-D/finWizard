// app/(protected)/layout.tsx
import AuthCheck from '@/components/auth/auth-check';
import Header from '@/components/shared/Header';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthCheck>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
      </div>
    </AuthCheck>
  );
}
