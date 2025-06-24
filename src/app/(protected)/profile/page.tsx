// app/(protected)/profile/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/lib/firebase/firebase-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  User,
  Mail,
  Phone,
  Edit,
  LogOut,
  Shield,
  Settings,
  BellRing,
  Key,
  HelpCircle,
  DollarSign,
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { userProfile, logout } = useFirebase();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      toast.success('Logged out successfully');
      router.push('/auth');
    } catch (error) {
      toast.error('Failed to log out', {
        description:
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again.',
      });
      setLoggingOut(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  // Helper to format the date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Helper to obscure part of sensitive information
  const obscureData = (
    data: string,
    visibleStart: number,
    visibleEnd: number = 0
  ) => {
    if (!data) return '';
    const start = data.slice(0, visibleStart);
    const end = visibleEnd > 0 ? data.slice(-visibleEnd) : '';
    const middle = '*'.repeat(
      Math.max(4, data.length - visibleStart - visibleEnd)
    );
    return start + middle + end;
  };

  return (
    <div className="max-w-4xl mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile sidebar */}
        <Card className="md:col-span-1">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="w-24 h-24 mb-4">
                <AvatarImage
                  src={userProfile?.photoURL || ''}
                  alt={userProfile?.name || 'User'}
                />
                <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                  {userProfile?.name ? getInitials(userProfile.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold">{userProfile?.name}</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Member since{' '}
                {userProfile?.createdAt
                  ? formatDate(userProfile.createdAt)
                  : 'N/A'}
              </p>
              <Button asChild className="w-full mb-2" variant="outline">
                <Link href="/profile/edit">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Profile
                </Link>
              </Button>
              <Button
                className="w-full"
                variant="destructive"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {loggingOut ? 'Logging out...' : 'Log Out'}
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t">
              <h3 className="font-medium mb-3">Account Menu</h3>
              <nav className="space-y-2">
                <Button
                  variant="ghost"
                  asChild
                  className="w-full justify-start"
                >
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    Personal Info
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  asChild
                  className="w-full justify-start"
                >
                  <Link href="/profile/balance">
                    <DollarSign className="mr-2 h-4 w-4" />
                    My Balances
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  asChild
                  className="w-full justify-start"
                >
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Account Settings
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  asChild
                  className="w-full justify-start"
                >
                  <Link href="/settings/security">
                    <Shield className="mr-2 h-4 w-4" />
                    Security
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  asChild
                  className="w-full justify-start"
                >
                  <Link href="/settings/notifications">
                    <BellRing className="mr-2 h-4 w-4" />
                    Notifications
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  asChild
                  className="w-full justify-start"
                >
                  <Link href="/help">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Help & Support
                  </Link>
                </Button>
              </nav>
            </div>
          </CardContent>
        </Card>

        {/* Profile details */}
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="personal">Personal Info</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="personal">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    Your personal details and contact information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 py-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Full Name</p>
                          <p className="text-sm text-muted-foreground">
                            {userProfile?.name || 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Email Address</p>
                          <p className="text-sm text-muted-foreground">
                            {userProfile?.email || 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Phone Number</p>
                          <p className="text-sm text-muted-foreground">
                            {userProfile?.phoneNumber
                              ? obscureData(userProfile.phoneNumber, 5, 2)
                              : 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/profile/edit">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Personal Information
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Manage your account security and login methods
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Key className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            Authentication Methods
                          </p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {userProfile?.authMethods?.some(
                              (m) => m.authMethod === 'google'
                            ) && (
                              <div className="bg-muted text-xs px-2 py-1 rounded-full flex items-center">
                                <svg
                                  className="h-3 w-3 mr-1"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                  />
                                  <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                  />
                                  <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                  />
                                  <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                  />
                                </svg>
                                Google
                              </div>
                            )}
                            {userProfile?.authMethods?.some(
                              (m) => m.authMethod === 'phone'
                            ) && (
                              <div className="bg-muted text-xs px-2 py-1 rounded-full flex items-center">
                                <Phone className="h-3 w-3 mr-1" />
                                Phone
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" disabled>
                        Manage
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            Two-Factor Authentication
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" disabled>
                        Set up
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
