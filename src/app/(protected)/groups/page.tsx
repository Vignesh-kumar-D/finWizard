// app/groups/page.tsx
'use client';

import Link from 'next/link';
import { useGroups } from '@/lib/firebase/group-context-scalable';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Plus, Users } from 'lucide-react';

export default function GroupsPage() {
  const { groups, loading } = useGroups();

  return (
    <div className="space-y-4 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Groups</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your group expenses and settlements
          </p>
        </div>
        <Button asChild className="mt-4 sm:mt-0 w-full sm:w-auto">
          <Link href="/groups/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Group
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card className="text-center p-8">
          <CardHeader>
            <CardTitle>No Groups Yet</CardTitle>
            <CardDescription>
              Create your first group to start tracking shared expenses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/groups/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Group
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <Card key={group.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground flex-shrink-0">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base truncate">
                        {group.name}
                      </h3>
                      <p className="text-muted-foreground text-xs sm:text-sm">
                        {group.members.length} member
                        {group.members.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/groups/${group.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
