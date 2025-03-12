// components/layout/Header.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFirebase } from '@/lib/firebase/firebase-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Home,
  Wallet,
  PlusCircle,
  PieChart,
  User,
  LogOut,
  ChevronDown,
  Bell,
} from 'lucide-react';
import Image from 'next/image';

const Header = () => {
  const pathname = usePathname();
  const { userProfile, logout } = useFirebase();
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect for desktop header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Check if the path is active
  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(`${path}/`);
  };

  return (
    <>
      {/* Desktop Header */}
      <header
        className={`hidden md:flex fixed top-0 left-0 right-0 z-50 bg-background ${
          scrolled ? 'border-b shadow-sm' : ''
        } transition-all duration-200`}
      >
        <div className="container flex items-center justify-between h-16 px-4 mx-auto">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="flex items-center justify-center p-1.5 bg-primary rounded-md">
              <Wallet className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">FinanceTrack</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center space-x-1">
            <Link
              href="/dashboard"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                isActive('/dashboard') ? 'bg-accent text-accent-foreground' : ''
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/accounts"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                isActive('/accounts') ? 'bg-accent text-accent-foreground' : ''
              }`}
            >
              Accounts
            </Link>
            <Link
              href="/budget"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                isActive('/budget') ? 'bg-accent text-accent-foreground' : ''
              }`}
            >
              Budget
            </Link>
            <Button asChild variant="default" className="ml-2">
              <Link href="/transactions/new">
                <PlusCircle className="w-4 h-4 mr-2" />
                New Transaction
              </Link>
            </Button>
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="icon" className="rounded-full">
              <Bell className="w-5 h-5" />
              <span className="sr-only">Notifications</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-secondary text-secondary-foreground">
                    {userProfile?.photoURL ? (
                      <Image
                        src={userProfile.photoURL}
                        alt={userProfile.name}
                        width={10}
                        height={10}
                        priority
                        className="w-7 h-7 rounded-full"
                      />
                    ) : (
                      <span className="text-sm font-medium">
                        {userProfile?.name?.charAt(0) || 'U'}
                      </span>
                    )}
                  </div>
                  <span className="text-sm max-w-[120px] truncate">
                    {userProfile?.name || 'User'}
                  </span>
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href="/profile"
                    className="flex items-center w-full cursor-pointer"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-sm">
        <div className="flex items-center justify-around h-16">
          <Link
            href="/dashboard"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive('/dashboard') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs mt-1">Dashboard</span>
          </Link>

          <Link
            href="/accounts"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive('/accounts') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-xs mt-1">Accounts</span>
          </Link>

          <Link
            href="/transactions/new"
            className="flex flex-col items-center justify-center flex-1 h-full"
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground -mt-6 mb-1 shadow-md">
              <PlusCircle className="w-6 h-6" />
            </div>
            <span className="text-xs text-muted-foreground">Add</span>
          </Link>

          <Link
            href="/budget"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive('/budget') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <PieChart className="w-5 h-5" />
            <span className="text-xs mt-1">Budget</span>
          </Link>

          <Link
            href="/profile"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive('/profile') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-xs mt-1">Profile</span>
          </Link>
        </div>
      </nav>

      {/* Mobile spacing to prevent content from being hidden behind the bottom nav */}
      <div className="block md:hidden h-16"></div>

      {/* Desktop spacing to prevent content from being hidden behind the top header */}
      <div className="hidden md:block h-16"></div>
    </>
  );
};

export default Header;
