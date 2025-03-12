// app/(protected)/accounts/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAccounts } from '@/lib/firebase/account-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PlusCircle,
  MoreVertical,
  Building,
  CreditCard,
  Wallet,
  LineChart,
  Smartphone,
  IndianRupee,
  ReceiptIndianRupee,
  Edit,
  Trash2,
  Copy,
  Star,
  Loader2,
} from 'lucide-react';

import { AccountType } from '@/types';
import { formatAccountBalance } from '@/lib/firebase/utils/account';
import { toast } from 'sonner';

export default function AccountsPage() {
  const router = useRouter();
  const { accounts, totalBalance, loading, removeAccount, editAccount } =
    useAccounts();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter accounts by type
  const filterAccounts = (type: 'all' | AccountType) => {
    if (type === 'all') return accounts;
    return accounts.filter((account) => account.type === type);
  };

  // Get icon based on account type
  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case 'checking-bank':
      case 'saving-bank':
        return <Building className="h-5 w-5" />;
      case 'cash':
        return <Wallet className="h-5 w-5" />;
      case 'investment':
        return <LineChart className="h-5 w-5" />;
      case 'credit-card':
        return <CreditCard className="h-5 w-5" />;
      case 'upi':
        return <Smartphone className="h-5 w-5" />;
      case 'loan':
        return <IndianRupee className="h-5 w-5" />;
      default:
        return <ReceiptIndianRupee className="h-5 w-5" />;
    }
  };

  // Get background and text color based on account type
  const getAccountColors = (type: AccountType) => {
    switch (type) {
      case 'checking-bank':
      case 'saving-bank':
        return 'bg-blue-100 text-blue-600';
      case 'cash':
        return 'bg-green-100 text-green-600';
      case 'investment':
        return 'bg-purple-100 text-purple-600';
      case 'credit-card':
        return 'bg-red-100 text-red-600';
      case 'upi':
        return 'bg-orange-100 text-orange-600';
      case 'loan':
        return 'bg-pink-100 text-pink-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Get account type display name
  const getAccountTypeName = (type: AccountType) => {
    switch (type) {
      case 'checking-bank':
      case 'saving-bank':
        return 'Bank Account';
      case 'cash':
        return 'Cash';
      case 'investment':
        return 'Investment';
      case 'credit-card':
        return 'Credit Card';
      case 'upi':
        return 'UPI';
      case 'loan':
        return 'Loan';
      default:
        return type;
    }
  };

  // Handle account deletion
  const handleDelete = async (id: string) => {
    if (
      confirm(
        'Are you sure you want to delete this account? This action cannot be undone.'
      )
    ) {
      setDeletingId(id);
      try {
        await removeAccount(id);
        toast.success('Account deleted successfully');
      } catch (error) {
        toast.error('Failed to delete account');
        console.error('Error deleting account:', error);
      } finally {
        setDeletingId(null);
      }
    }
  };

  // Handle setting account as default
  const handleSetDefault = async (id: string) => {
    try {
      await editAccount(id, { isDefault: true });
      toast.success('Default account updated');
    } catch (error) {
      toast.error('Failed to update default account');
      console.error('Error setting default account:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Accounts</h1>
          <p className="text-muted-foreground">
            Manage your financial accounts
          </p>
        </div>
        <Button asChild className="mt-4 sm:mt-0">
          <Link href="/accounts/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Account
          </Link>
        </Button>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Summary</CardTitle>
          <CardDescription>Your financial overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Balance</span>
              <span className="text-2xl font-bold">
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(totalBalance)
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Number of Accounts</span>
              <span className="text-lg font-semibold">{accounts.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts List */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid grid-cols-3 sm:grid-cols-7">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="bank">Bank</TabsTrigger>
          <TabsTrigger value="cash">Cash</TabsTrigger>
          <TabsTrigger value="credit">Credit</TabsTrigger>
          <TabsTrigger value="investment">Investment</TabsTrigger>
          <TabsTrigger value="upi">UPI</TabsTrigger>
          <TabsTrigger value="loan">Loan</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : accounts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-6">
                <div className="rounded-full bg-muted p-3 mb-4">
                  <Wallet className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No accounts yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Start managing your finances by adding your first account.
                </p>
                <Button asChild>
                  <Link href="/accounts/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Account
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            filterAccounts('all').map((account) => (
              <Card key={account.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center p-4">
                    <div
                      className={`p-2.5 rounded-full mr-4 ${getAccountColors(
                        account.type
                      )}`}
                    >
                      {getAccountIcon(account.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <h3 className="text-base font-medium truncate">
                          {account.name}
                        </h3>
                        {account.isDefault && (
                          <span className="ml-2">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getAccountTypeName(account.type)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatAccountBalance(account)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Last updated:{' '}
                        {new Date(account.lastUpdated).toLocaleDateString()}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="ml-2">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => router.push(`/accounts/${account.id}`)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/accounts/edit/${account.id}`)
                          }
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        {!account.isDefault && (
                          <DropdownMenuItem
                            onClick={() => handleSetDefault(account.id)}
                          >
                            <Star className="mr-2 h-4 w-4" />
                            Set as Default
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => handleDelete(account.id)}
                          disabled={deletingId === account.id}
                        >
                          {deletingId === account.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                          )}
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Create a tab content for each account type */}
        {(
          [
            'checking-bank',
            'saving-bank',
            'cash',
            'credit-card',
            'investment',
            'upi',
            'loan',
          ] as const
        ).map((type) => (
          <TabsContent key={type} value={type} className="space-y-4">
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filterAccounts(type).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <div className="rounded-full bg-muted p-3 mb-4">
                    {getAccountIcon(type)}
                  </div>
                  <h3 className="text-lg font-medium mb-2">
                    No {type} accounts
                  </h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Add a {type} account to see it here.
                  </p>
                  <Button asChild>
                    <Link href={`/accounts/new?type=${type}`}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add {getAccountTypeName(type)}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filterAccounts(type).map((account) => (
                <Card key={account.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-center p-4">
                      <div
                        className={`p-2.5 rounded-full mr-4 ${getAccountColors(
                          account.type
                        )}`}
                      >
                        {getAccountIcon(account.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <h3 className="text-base font-medium truncate">
                            {account.name}
                          </h3>
                          {account.isDefault && (
                            <span className="ml-2">
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {getAccountTypeName(account.type)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {formatAccountBalance(account)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Last updated:{' '}
                          {new Date(account.lastUpdated).toLocaleDateString()}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="ml-2">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/accounts/${account.id}`)
                            }
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/accounts/edit/${account.id}`)
                            }
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {!account.isDefault && (
                            <DropdownMenuItem
                              onClick={() => handleSetDefault(account.id)}
                            >
                              <Star className="mr-2 h-4 w-4" />
                              Set as Default
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => handleDelete(account.id)}
                            disabled={deletingId === account.id}
                          >
                            {deletingId === account.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
