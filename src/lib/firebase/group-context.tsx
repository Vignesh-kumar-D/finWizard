// lib/firebase/group-context.tsx
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useFirebase } from './firebase-context';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import { toast } from 'sonner';
import { Group, GroupMember, SharedExpense } from '@/types';
import { db } from './config';

interface GroupContextType {
  groups: Group[];
  loading: boolean;
  refreshGroups: () => Promise<void>;
  getGroup: (id: string) => Promise<Group | null>;
  createGroup: (groupData: Group) => Promise<string>;
  addExpenseToGroup: (
    groupId: string,
    expenseData: SharedExpense
  ) => Promise<void>;
  updateGroup: (groupId: string, groupData: Group) => Promise<void>;
  deleteExpense: (groupId: string, expenseId: string) => Promise<void>;
  addMemberToGroup: (groupId: string, memberData: GroupMember) => Promise<void>;
  removeMemberFromGroup: (groupId: string, userId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export const useGroups = () => {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error('useGroups must be used within a GroupProvider');
  }
  return context;
};

export const GroupProvider = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useFirebase();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const refreshGroups = useCallback(async () => {
    if (!currentUser || !db) return;

    setLoading(true);
    try {
      // Query groups where the current user is a member
      const groupsCollection = collection(db, 'groups');
      //   const memberQuery = query(
      //     groupsCollection,
      //     where('members', 'array-contains', { userId: currentUser.uid })
      //   );

      // This approach might not work with Firebase security rules
      // Alternative: store memberIds separately for querying
      const querySnapshot = await getDocs(groupsCollection);

      const userGroups: Group[] = [];

      querySnapshot.forEach(
        (docSnapshot) => {
          const groupData = {
            id: docSnapshot.id,
            ...(docSnapshot.data() as Omit<Group, 'id'>),
          };

          // Check if current user is a member
          const isMember = groupData.members.some(
            (member: GroupMember) => member.userId === currentUser.uid
          );

          if (isMember) {
            userGroups.push(groupData);
          }
        },
        [currentUser]
      );

      setGroups(userGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);
  // Fetch groups when user changes
  useEffect(() => {
    if (currentUser) {
      refreshGroups();
    } else {
      setGroups([]);
      setLoading(false);
    }
  }, [currentUser, refreshGroups]);

  // Refresh groups data

  // Get a single group by ID
  const getGroup = async (id: string) => {
    if (!db) return null;

    try {
      const groupDoc = await getDoc(doc(db, 'groups', id));

      if (groupDoc.exists()) {
        const groupData = {
          id: groupDoc.id,
          ...(groupDoc.data() as Omit<Group, 'id'>),
        };

        // Check if current user is a member
        if (
          currentUser &&
          groupData.members.some(
            (member: GroupMember) => member.userId === currentUser.uid
          )
        ) {
          return groupData;
        }
      }

      return null;
    } catch (error) {
      console.error('Error fetching group:', error);
      throw error;
    }
  };

  // Create a new group
  const createGroup = async (groupData: Group) => {
    if (!currentUser || !db) {
      throw new Error('User must be logged in to create a group');
    }

    try {
      // Make sure the current user is included as a member and admin
      if (
        !groupData.members.some(
          (member: GroupMember) => member.userId === currentUser.uid
        )
      ) {
        groupData.members.push({
          userId: currentUser.uid,
          name: currentUser.displayName || 'You',
          email: currentUser.email || '',
          role: 'admin',
          joinedAt: 0,
        });
      }

      // Create the group
      const docRef = await addDoc(collection(db, 'groups'), {
        ...groupData,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Refresh the groups list
      await refreshGroups();

      return docRef.id;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  };

  // Add an expense to a group
  const addExpenseToGroup = async (
    groupId: string,
    expenseData: SharedExpense
  ) => {
    if (!currentUser || !db) {
      throw new Error('User must be logged in to add an expense');
    }

    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupDoc = await getDoc(groupRef);

      if (!groupDoc.exists()) {
        throw new Error('Group not found');
      }

      // Add the expense to the group's expenses array
      await updateDoc(groupRef, {
        expenses: arrayUnion(expenseData),
        updatedAt: serverTimestamp(),
      });

      // Refresh the groups list
      await refreshGroups();
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  };

  // Update a group
  const updateGroup = async (groupId: string, groupData: Group) => {
    if (!currentUser || !db) {
      throw new Error('User must be logged in to update a group');
    }

    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupDoc = await getDoc(groupRef);

      if (!groupDoc.exists()) {
        throw new Error('Group not found');
      }

      // Check if the current user is an admin
      const groupMembers = groupDoc.data().members;
      const isAdmin = groupMembers.some(
        (member: GroupMember) =>
          member.userId === currentUser.uid && member.role === 'admin'
      );

      if (!isAdmin) {
        throw new Error('Only group admins can update group details');
      }

      // Update the group
      await updateDoc(groupRef, {
        ...groupData,
        updatedAt: serverTimestamp(),
      });

      // Refresh the groups list
      await refreshGroups();
    } catch (error) {
      console.error('Error updating group:', error);
      throw error;
    }
  };

  // Delete an expense from a group
  const deleteExpense = async (groupId: string, expenseId: string) => {
    if (!currentUser || !db) {
      throw new Error('User must be logged in to delete an expense');
    }

    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupDoc = await getDoc(groupRef);

      if (!groupDoc.exists()) {
        throw new Error('Group not found');
      }

      const groupData = groupDoc.data();

      // Check if the expense exists and the current user is the creator or an admin
      const expense = groupData.expenses.find(
        (e: SharedExpense) => e.id === expenseId
      );

      if (!expense) {
        throw new Error('Expense not found');
      }

      const isCreator = expense.createdBy === currentUser.uid;
      const isAdmin = groupData.members.some(
        (member: GroupMember) =>
          member.userId === currentUser.uid && member.role === 'admin'
      );

      if (!isCreator && !isAdmin) {
        throw new Error(
          'Only the expense creator or group admins can delete expenses'
        );
      }

      // Remove the expense from the expenses array
      const updatedExpenses = groupData.expenses.filter(
        (e: SharedExpense) => e.id !== expenseId
      );

      // Update the group
      await updateDoc(groupRef, {
        expenses: updatedExpenses,
        updatedAt: serverTimestamp(),
      });

      // Refresh the groups list
      await refreshGroups();
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  };

  // Add a member to a group
  const addMemberToGroup = async (groupId: string, memberData: GroupMember) => {
    if (!currentUser || !db) {
      throw new Error('User must be logged in to add a member');
    }

    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupDoc = await getDoc(groupRef);

      if (!groupDoc.exists()) {
        throw new Error('Group not found');
      }

      const groupData = groupDoc.data();

      // Check if the current user is an admin
      const isAdmin = groupData.members.some(
        (member: GroupMember) =>
          member.userId === currentUser.uid && member.role === 'admin'
      );

      if (!isAdmin) {
        throw new Error('Only group admins can add members');
      }

      // Check if the member is already in the group
      const isMember = groupData.members.some(
        (member: GroupMember) => member.userId === memberData.userId
      );

      if (isMember) {
        throw new Error('This person is already a member of the group');
      }

      // Add the member to the group
      await updateDoc(groupRef, {
        members: arrayUnion(memberData),
        updatedAt: serverTimestamp(),
      });

      // Refresh the groups list
      await refreshGroups();
    } catch (error) {
      console.error('Error adding member:', error);
      throw error;
    }
  };

  // Remove a member from a group
  const removeMemberFromGroup = async (groupId: string, userId: string) => {
    if (!currentUser || !db) {
      throw new Error('User must be logged in to remove a member');
    }

    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupDoc = await getDoc(groupRef);

      if (!groupDoc.exists()) {
        throw new Error('Group not found');
      }

      const groupData = groupDoc.data();

      // Check if the current user is an admin
      const isAdmin = groupData.members.some(
        (member: GroupMember) =>
          member.userId === currentUser.uid && member.role === 'admin'
      );

      // Users can remove themselves, or admins can remove others
      const isSelf = userId === currentUser.uid;

      if (!isAdmin && !isSelf) {
        throw new Error('Only group admins can remove members');
      }

      // Can't remove the last admin
      const adminCount = groupData.members.filter(
        (m: GroupMember) => m.role === 'admin'
      ).length;
      const isRemovingAdmin = groupData.members.find(
        (m: GroupMember) => m.userId === userId
      )?.isAdmin;

      if (isRemovingAdmin && adminCount <= 1) {
        throw new Error('Cannot remove the last admin from the group');
      }

      // Remove the member from the group
      const updatedMembers = groupData.members.filter(
        (member: GroupMember) => member.userId !== userId
      );

      // Update the group
      await updateDoc(groupRef, {
        members: updatedMembers,
        updatedAt: serverTimestamp(),
      });

      // Refresh the groups list
      await refreshGroups();
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  };

  // Leave a group (wrapper for removeMemberFromGroup with current user)
  const leaveGroup = async (groupId: string) => {
    if (!currentUser) {
      throw new Error('User must be logged in to leave a group');
    }

    try {
      await removeMemberFromGroup(groupId, currentUser.uid);
    } catch (error) {
      console.error('Error leaving group:', error);
      throw error;
    }
  };

  const value = {
    groups,
    loading,
    refreshGroups,
    getGroup,
    createGroup,
    addExpenseToGroup,
    updateGroup,
    deleteExpense,
    addMemberToGroup,
    removeMemberFromGroup,
    leaveGroup,
  };

  return (
    <GroupContext.Provider value={value}>{children}</GroupContext.Provider>
  );
};
