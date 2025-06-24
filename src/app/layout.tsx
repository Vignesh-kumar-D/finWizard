import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/lib/theme';
import { FirebaseProvider } from '@/lib/firebase/firebase-context';
import { AccountProvider } from '@/lib/firebase/account-context';
import { BudgetProvider } from '@/lib/firebase/budget-context';
import { TransactionProvider } from '@/lib/firebase/transaction-context';
import { GroupProvider } from '@/lib/firebase/group-context';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Personal Finance Manager',
  description:
    'A comprehensive personal finance management app with group expense tracking',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Personal Finance',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#0a0a0a',
};

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Prevent flash of unstyled content
              if (localStorage.getItem('finance-theme') === null) {
                localStorage.setItem('finance-theme', 'dark');
              }
              const theme = localStorage.getItem('finance-theme') || 'dark';
              document.documentElement.classList.add(theme);
              
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased ${inter.className}`}
      >
        <FirebaseProvider>
          <AccountProvider>
            <BudgetProvider>
              <TransactionProvider>
                <GroupProvider>
                  <ThemeProvider defaultTheme="dark">{children}</ThemeProvider>
                </GroupProvider>
              </TransactionProvider>
            </BudgetProvider>
          </AccountProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
}
