'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Settings,
  Trash2,
  UserMinus,
  Crown,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Group, UserProfile } from '@/types';
import UserSearch from '@/components/shared/UserSearch';

export default function GroupSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useFirebase();
  const {
    getGroup,
    updateGroup,
    removeMemberFromGroup,
    leaveGroup,
    addMemberToGroup,
  } = useGroups();

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Form state
  const [groupName, setGroupName] = useState('');

  const groupId = params.id as string;

  useEffect(() => {
    const fetchGroup = async () => {
      if (!groupId) return;

      setLoading(true);
      try {
        const groupData = await getGroup(groupId);
        setGroup(groupData);

        if (groupData) {
          setGroupName(groupData.name);
        }
      } catch (error) {
        console.error('Error fetching group:', error);
        toast.error('Failed to load group');
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [groupId, getGroup]);

  // Check if current user is admin
  const isCurrentUserAdmin = () => {
    if (!currentUser || !group) return false;
    const member = group.members.find((m) => m.userId === currentUser.uid);
    return member?.role === 'admin';
  };

  // Get current user's member info
  const getCurrentUserMember = () => {
    if (!currentUser || !group) return null;
    return group.members.find((m) => m.userId === currentUser.uid);
  };

  // Format date helper function
  const formatDate = (timestamp: number | { toDate: () => Date } | unknown) => {
    if (!timestamp) {
      return 'Unknown date';
    }

    let date: Date;

    // Handle Firebase Timestamp objects
    if (
      timestamp &&
      typeof timestamp === 'object' &&
      'toDate' in timestamp &&
      typeof timestamp.toDate === 'function'
    ) {
      date = timestamp.toDate();
    } else if (typeof timestamp === 'number') {
      // Handle regular number timestamps
      if (isNaN(timestamp)) {
        return 'Unknown date';
      }
      date = new Date(timestamp);
    } else {
      return 'Unknown date';
    }

    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Handle save group details
  const handleSaveGroup = async () => {
    if (!group || !isCurrentUserAdmin()) return;

    setSaving(true);
    try {
      const updatedGroup: Group = {
        ...group,
        name: groupName.trim(),
      };

      await updateGroup(groupId, updatedGroup);
      setGroup(updatedGroup);
      toast.success('Group updated successfully');
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error('Failed to update group');
    } finally {
      setSaving(false);
    }
  };

  // Handle remove member
  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!group) return;

    if (
      !confirm(`Are you sure you want to remove ${memberName} from the group?`)
    ) {
      return;
    }

    try {
      await removeMemberFromGroup(groupId, userId);
      toast.success(`${memberName} removed from group`);

      // Refresh group data
      const updatedGroup = await getGroup(groupId);
      setGroup(updatedGroup);
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  // Handle leave group
  const handleLeaveGroup = async () => {
    if (!group) return;

    const currentMember = getCurrentUserMember();
    if (!currentMember) return;

    if (!confirm('Are you sure you want to leave this group?')) {
      return;
    }

    try {
      await leaveGroup(groupId);
      toast.success('You have left the group');
      router.push('/groups');
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('Failed to leave group');
    }
  };

  // Handle change member role
  const handleChangeRole = async (
    userId: string,
    newRole: 'admin' | 'member'
  ) => {
    if (!group || !isCurrentUserAdmin()) return;

    try {
      const updatedMembers = group.members.map((member) =>
        member.userId === userId ? { ...member, role: newRole } : member
      );

      const updatedGroup: Group = {
        ...group,
        members: updatedMembers,
      };

      await updateGroup(groupId, updatedGroup);
      setGroup(updatedGroup);
      toast.success('Member role updated');
    } catch (error) {
      console.error('Error updating member role:', error);
      toast.error('Failed to update member role');
    }
  };

  // Handle add member
  const handleAddMember = async (user: UserProfile) => {
    if (!group || !isCurrentUserAdmin()) return;

    try {
      const memberData = {
        userId: user.id,
        name: user.name || user.email?.split('@')[0] || 'Unknown',
        email: user.email || '',
        photoURL: user.photoURL,
        role: 'member' as const,
        joinedAt: Date.now(), // Will be converted to serverTimestamp in the context
      };

      await addMemberToGroup(groupId, memberData);
      toast.success(`${memberData.name} added to group`);

      // Refresh group data
      const updatedGroup = await getGroup(groupId);
      setGroup(updatedGroup);
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add member');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mx-auto py-8">
        <Card className="text-center p-8">
          <CardHeader>
            <CardTitle>Group Not Found</CardTitle>
            <CardDescription>
              The group you&apos;re looking for doesn&apos;t exist or you
              don&apos;t have access to it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/groups">Back to Groups</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAdmin = isCurrentUserAdmin();

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col space-y-4 mb-6 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
          <Link href={`/groups/${groupId}`}>
            <Button variant="ghost" size="sm" className="w-fit">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Group
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
              <Settings className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
              Group Settings
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage your group settings and members
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Group Details */}
        <Card>
          <CardHeader>
            <CardTitle>Group Details</CardTitle>
            <CardDescription>
              {isAdmin ? 'Edit group information' : 'View group information'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Created</Label>
              <p className="text-sm text-muted-foreground">
                {formatDate(group.createdAt)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Members</Label>
              <p className="text-sm text-muted-foreground">
                {group.members.length} members
              </p>
            </div>

            <Button onClick={handleSaveGroup} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Members Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Members
              <Badge variant="secondary" className="ml-2">
                {group.members.length}{' '}
                {group.members.length === 1 ? 'member' : 'members'}
              </Badge>
            </CardTitle>
            <CardDescription>
              Manage group members and their roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Add Members Section - Only for Admins */}

            <div className="mb-6 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium">Add New Members</Label>
                <UserSearch
                  onUserSelect={handleAddMember}
                  excludeUsers={group.members.map((m) => m.userId)}
                  buttonText="Add Member"
                  placeholder="Search users by name, email, or phone..."
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Search for users to add them to this group. They will be added
                as regular members.
              </p>
            </div>
            <div className="space-y-4">
              {group.members.map((member) => (
                <div
                  key={member.userId}
                  className="flex flex-col space-y-3 p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">{member.name}</p>
                        {member.role === 'admin' && (
                          <Crown className="h-4 w-4 text-yellow-600" />
                        )}
                        {member.userId === currentUser?.uid && (
                          <Badge variant="secondary">You</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {member.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined {formatDate(member.joinedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
                    {isAdmin && member.userId !== currentUser?.uid && (
                      <Select
                        value={member.role}
                        onValueChange={(value: 'admin' | 'member') =>
                          handleChangeRole(member.userId, value)
                        }
                      >
                        <SelectTrigger className="w-full sm:w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {isAdmin && member.userId !== currentUser?.uid && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleRemoveMember(member.userId, member.name)
                        }
                        className="w-full sm:w-auto"
                      >
                        <UserMinus className="h-4 w-4 mr-2" />
                        <span>Remove Member</span>
                      </Button>
                    )}

                    {!isAdmin && member.userId === currentUser?.uid && (
                      <Badge variant="secondary" className="w-fit">
                        {member.role}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone */}
      <Card className="mt-6 border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
            <div>
              <h4 className="font-medium">Leave Group</h4>
              <p className="text-sm text-muted-foreground">
                You will no longer have access to this group or its expenses
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleLeaveGroup}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              Leave Group
            </Button>
          </div>

          {isAdmin && (
            <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
              <div>
                <h4 className="font-medium">Delete Group</h4>
                <p className="text-sm text-muted-foreground">
                  This will permanently delete the group and all its data
                </p>
              </div>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Group
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
