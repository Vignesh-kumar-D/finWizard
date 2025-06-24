'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/lib/firebase/firebase-context';
import { useGroups } from '@/lib/firebase/group-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Users, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Group, GroupMember, UserProfile } from '@/types';
import Link from 'next/link';
import UserSearch from '@/components/shared/UserSearch';

export default function CreateGroupPage() {
  const router = useRouter();
  const { currentUser } = useFirebase();
  const { createGroup } = useGroups();

  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAddMember = (user: UserProfile) => {
    // Check if member already exists
    const existingMember = members.find((m) => m.userId === user.id);
    if (existingMember) {
      toast.error('Member already added');
      return;
    }

    const newMember: GroupMember = {
      userId: user.id,
      name: user.name || user.email?.split('@')[0] || 'Unknown',
      email: user.email || '',
      photoURL: user.photoURL,
      role: 'member',
      joinedAt: Date.now(),
    };

    setMembers([...members, newMember]);
    toast.success(`${newMember.name} added to group`);
  };

  const handleRemoveMember = (userId: string) => {
    setMembers(members.filter((m) => m.userId !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!groupName.trim()) {
      toast.error('Group name is required');
      return;
    }

    setLoading(true);
    try {
      const groupData: Omit<Group, 'id'> = {
        name: groupName.trim(),
        createdBy: currentUser?.uid || '',
        createdAt: Date.now(),
        members: [
          // Add current user as admin
          {
            userId: currentUser?.uid || '',
            name: currentUser?.displayName || 'You',
            email: currentUser?.email || '',
            role: 'admin',
            joinedAt: Date.now(),
          },
          ...members,
        ],
        expenses: [],
        settlements: [],
      };

      const groupId = await createGroup(groupData as Group);
      toast.success('Group created successfully!');
      router.push(`/groups/${groupId}`);
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  // Get excluded user IDs (current user and already added members)
  const excludedUserIds = [
    currentUser?.uid,
    ...members.map((m) => m.userId),
  ].filter(Boolean) as string[];

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="flex items-center mb-6">
        <Link href="/groups">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Groups
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Create New Group
          </CardTitle>
          <CardDescription>
            Create a group to split expenses with friends and family
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name *</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this group"
                rows={3}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Add Members</Label>
                <UserSearch
                  onUserSelect={handleAddMember}
                  excludeUsers={excludedUserIds}
                  buttonText="Add Member"
                  placeholder="Search users by name, email, or phone..."
                />
              </div>

              {members.length > 0 && (
                <div className="space-y-2">
                  <Label>Members ({members.length})</Label>
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {member.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {member.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">{member.role}</Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member.userId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Group'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
