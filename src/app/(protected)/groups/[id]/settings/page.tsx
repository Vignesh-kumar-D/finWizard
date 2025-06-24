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
import { Textarea } from '@/components/ui/textarea';
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
  Users,
  Trash2,
  UserPlus,
  UserMinus,
  Crown,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Group, GroupMember } from '@/types';

export default function GroupSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useFirebase();
  const { getGroup, updateGroup, removeMemberFromGroup, leaveGroup } =
    useGroups();

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');

  // Form state
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');

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
          setDescription(groupData.description || '');
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

  // Handle save group details
  const handleSaveGroup = async () => {
    if (!group || !isCurrentUserAdmin()) return;

    setSaving(true);
    try {
      const updatedGroup: Group = {
        ...group,
        name: groupName.trim(),
        description: description.trim(),
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
              The group you're looking for doesn't exist or you don't have
              access to it.
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

  const currentMember = getCurrentUserMember();
  const isAdmin = isCurrentUserAdmin();

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link href={`/groups/${groupId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Group
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Settings className="h-6 w-6 mr-2" />
              Group Settings
            </h1>
            <p className="text-muted-foreground">
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
                disabled={!isAdmin}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!isAdmin}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Created</Label>
              <p className="text-sm text-muted-foreground">
                {new Date(group.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Members</Label>
              <p className="text-sm text-muted-foreground">
                {group.members.length} members
              </p>
            </div>

            {isAdmin && (
              <Button onClick={handleSaveGroup} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Members Management */}
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              Manage group members and their roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {group.members.map((member) => (
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
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {isAdmin && member.userId !== currentUser?.uid && (
                      <Select
                        value={member.role}
                        onValueChange={(value: 'admin' | 'member') =>
                          handleChangeRole(member.userId, value)
                        }
                      >
                        <SelectTrigger className="w-24">
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
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}

                    {!isAdmin && member.userId === currentUser?.uid && (
                      <Badge variant="secondary">{member.role}</Badge>
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
              <Button
                variant="destructive"
                disabled
                className="opacity-50 cursor-not-allowed"
              >
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
