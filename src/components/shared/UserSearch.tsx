'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useGroups } from '@/lib/firebase/group-context-scalable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Search, User, Plus, ChevronsUpDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { UserProfile } from '@/types';

interface UserSearchProps {
  onUserSelect: (user: UserProfile) => void;
  excludeUsers?: string[]; // User IDs to exclude from search
  placeholder?: string;
  buttonText?: string;
  trigger?: React.ReactNode;
  disabled?: boolean;
}

export default function UserSearch({
  onUserSelect,
  excludeUsers = [],
  placeholder = 'Search users by name, email, or phone...',
  buttonText = 'Add Member',
  trigger,
  disabled = false,
}: UserSearchProps) {
  const { searchUsers } = useGroups();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);

  const performSearch = useCallback(async () => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchUsers(searchTerm);
      // Filter out excluded users
      const filteredResults = results.filter(
        (user: UserProfile) => !excludeUsers.includes(user.id)
      );
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchTerm, searchUsers, excludeUsers]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        performSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, performSearch]);

  const handleUserSelect = (user: UserProfile) => {
    setOpen(false);
    onUserSelect(user);
    setSearchTerm('');
    setSearchResults([]);
  };

  const getDisplayName = (user: UserProfile) => {
    if (user.name) return user.name;
    if (user.email) return user.email.split('@')[0];
    if (user.phoneNumber) return user.phoneNumber;
    return 'Unknown User';
  };

  const getDisplayInfo = (user: UserProfile) => {
    const info = [];
    if (user.email) info.push(user.email);
    if (user.phoneNumber) info.push(user.phoneNumber);
    return info.join(' • ');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button disabled={disabled}>
            <Plus className="h-4 w-4 mr-2" />
            {buttonText}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Search and Add User</DialogTitle>
          <DialogDescription>
            Search for users by name, email, or phone number to add them to your
            group.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search Users</Label>
            <div className="flex space-x-2">
              <Input
                id="search"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={performSearch}
                disabled={searching || !searchTerm.trim()}
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {searching && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">
                Searching...
              </span>
            </div>
          )}

          {!searching && searchResults.length > 0 && (
            <div className="space-y-2">
              <Label>Search Results ({searchResults.length})</Label>
              <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleUserSelect(user)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{getDisplayName(user)}</p>
                        <p className="text-sm text-muted-foreground">
                          {getDisplayInfo(user)}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!searching &&
            searchTerm.trim().length >= 2 &&
            searchResults.length === 0 && (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No users found</p>
                <p className="text-sm text-muted-foreground">
                  Try searching with a different name, email, or phone number
                </p>
              </div>
            )}

          {!searching && searchTerm.trim().length < 2 && (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Enter at least 2 characters to search for users
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Alternative component for inline user selection (like a combobox)
export function UserSearchCombobox({
  onUserSelect,
  excludeUsers = [],
  placeholder = 'Search users...',
  disabled = false,
}: {
  onUserSelect: (user: UserProfile) => void;
  excludeUsers?: string[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const { searchUsers } = useGroups();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);

  const performSearch = useCallback(async () => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchUsers(searchTerm);
      const filteredResults = results.filter(
        (user: UserProfile) => !excludeUsers.includes(user.id)
      );
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchTerm, searchUsers, excludeUsers]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        performSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, performSearch]);

  const handleUserSelect = (user: UserProfile) => {
    onUserSelect(user);
    setOpen(false);
    setSearchTerm('');
    setSearchResults([]);
  };

  const getDisplayName = (user: UserProfile) => {
    if (user.name) return user.name;
    if (user.email) return user.email.split('@')[0];
    if (user.phoneNumber) return user.phoneNumber;
    return 'Unknown User';
  };

  const getDisplayInfo = (user: UserProfile) => {
    const info = [];
    if (user.email) info.push(user.email);
    if (user.phoneNumber) info.push(user.phoneNumber);
    return info.join(' • ');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {searchTerm || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <div className="p-2">
          <Input
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-2"
          />
          {searching && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm">Searching...</span>
            </div>
          )}
          {!searching &&
            searchResults.length === 0 &&
            searchTerm.trim().length >= 2 && (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">No users found.</p>
              </div>
            )}
          {!searching && searchTerm.trim().length < 2 && (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                Start typing to search...
              </p>
            </div>
          )}
          <div className="max-h-60 overflow-y-auto space-y-1">
            {searchResults.map((user) => (
              <div
                key={user.id}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => handleUserSelect(user)}
              >
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{getDisplayName(user)}</p>
                  <p className="text-xs text-muted-foreground">
                    {getDisplayInfo(user)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
