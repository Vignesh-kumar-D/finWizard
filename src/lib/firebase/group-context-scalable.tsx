// lib/firebase/group-context-scalable.tsx
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
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  QueryDocumentSnapshot,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { toast } from 'sonner';
import {
  Group,
  GroupMember,
  SharedExpense,
  Settlement,
  UserProfile,
} from '@/types';
import { db } from './config';
import { searchUsers } from './utils/user';

interface GroupContextType {
  // Groups
  groups: Group[];
  loading: boolean;
  refreshGroups: () => Promise<void>;
  getGroup: (id: string) => Promise<Group | null>;
  createGroup: (groupData: Group) => Promise<string>;
  updateGroup: (groupId: string, groupData: Partial<Group>) => Promise<void>;

  // Expenses with pagination
  getGroupExpenses: (
    groupId: string,
    options?: {
      limit?: number;
      lastDoc?: QueryDocumentSnapshot;
      startDate?: number;
      endDate?: number;
    }
  ) => Promise<{
    expenses: SharedExpense[];
    lastDoc: QueryDocumentSnapshot | null;
    hasMore: boolean;
  }>;
  getExpenseById: (
    groupId: string,
    expenseId: string
  ) => Promise<SharedExpense | null>;
  addExpenseToGroup: (
    groupId: string,
    expenseData: Omit<SharedExpense, 'id'>
  ) => Promise<string>;
  updateExpense: (
    groupId: string,
    expenseId: string,
    expenseData: Partial<SharedExpense>
  ) => Promise<void>;
  deleteExpense: (groupId: string, expenseId: string) => Promise<void>;

  // Settlements with pagination
  getGroupSettlements: (
    groupId: string,
    options?: {
      limit?: number;
      lastDoc?: QueryDocumentSnapshot;
    }
  ) => Promise<{
    settlements: Settlement[];
    lastDoc: QueryDocumentSnapshot | null;
    hasMore: boolean;
  }>;
  addSettlementToGroup: (
    groupId: string,
    settlementData: Omit<Settlement, 'id'>
  ) => Promise<string>;
  updateSettlement: (
    groupId: string,
    settlementId: string,
    settlementData: Partial<Settlement>
  ) => Promise<void>;
  deleteSettlement: (groupId: string, settlementId: string) => Promise<void>;

  // User expenses across all groups
  getUserExpenses: (
    userId: string,
    options?: {
      limit?: number;
      lastDoc?: QueryDocumentSnapshot;
      startDate?: number;
      endDate?: number;
    }
  ) => Promise<{
    expenses: SharedExpense[];
    lastDoc: QueryDocumentSnapshot | null;
    hasMore: boolean;
  }>;

  // Real-time listeners
  subscribeToGroupExpenses: (
    groupId: string,
    callback: (expenses: SharedExpense[]) => void,
    options?: { limit?: number }
  ) => () => void;
  subscribeToGroupSettlements: (
    groupId: string,
    callback: (settlements: Settlement[]) => void,
    options?: { limit?: number }
  ) => () => void;

  // Group management
  addMemberToGroup: (groupId: string, memberData: GroupMember) => Promise<void>;
  removeMemberFromGroup: (groupId: string, userId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;

  // Utilities
  searchUsers: (searchTerm: string) => Promise<UserProfile[]>;
  getUserBalance: (userId: string) => Promise<{
    totalOwed: number;
    totalPaid: number;
    netBalance: number;
    groupBalances: Record<
      string,
      {
        groupName: string;
        owed: number;
        paid: number;
        net: number;
      }
    >;
  }>;
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

  // Refresh groups with efficient querying
  const refreshGroups = useCallback(async () => {
    if (!currentUser || !db) return;

    setLoading(true);
    try {
      const groupsRef = collection(db, 'groups');

      // Get all groups and filter client-side since Firestore doesn't support
      // array-contains with partial object matches
      const q = query(
        groupsRef,
        orderBy('createdAt', 'desc'),
        limit(100) // Limit to prevent loading too many groups
      );

      const querySnapshot = await getDocs(q);
      const userGroups: Group[] = [];

      querySnapshot.forEach((docSnapshot) => {
        const groupData = {
          id: docSnapshot.id,
          ...(docSnapshot.data() as Omit<Group, 'id'>),
        };

        // Check if current user is a member of this group
        if (
          groupData.members &&
          groupData.members.some(
            (member: GroupMember) => member.userId === currentUser.uid
          )
        ) {
          userGroups.push(groupData);
        }
      });

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

  // Get a single group by ID
  const getGroup = useCallback(
    async (id: string) => {
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
    },
    [currentUser]
  );

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
          joinedAt: Date.now(),
        });
      }

      // Create the group (without expenses/settlements arrays)
      // Ensure all member timestamps are regular numbers, not serverTimestamp()
      const membersWithRegularTimestamps = groupData.members.map((member) => ({
        ...member,
        joinedAt:
          typeof member.joinedAt === 'number' ? member.joinedAt : Date.now(),
      }));

      const docRef = await addDoc(collection(db, 'groups'), {
        name: groupData.name,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        members: membersWithRegularTimestamps,
      });

      // Refresh the groups list
      await refreshGroups();

      return docRef.id;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  };

  // Get group expenses with pagination
  const getGroupExpenses = async (
    groupId: string,
    options: {
      limit?: number;
      lastDoc?: QueryDocumentSnapshot;
      startDate?: number;
      endDate?: number;
    } = {}
  ) => {
    if (!db) {
      return { expenses: [], lastDoc: null, hasMore: false };
    }

    try {
      const { limit: limitCount = 50, lastDoc, startDate, endDate } = options;
      const expensesRef = collection(db, 'groupExpenses');

      let q = query(
        expensesRef,
        where('groupId', '==', groupId),
        orderBy('date', 'desc'),
        limit(limitCount)
      );

      // Add date filters if provided
      if (startDate) {
        q = query(q, where('date', '>=', startDate));
      }
      if (endDate) {
        q = query(q, where('date', '<=', endDate));
      }

      // Add pagination
      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const querySnapshot = await getDocs(q);
      const expenses: SharedExpense[] = [];

      querySnapshot.forEach((doc) => {
        expenses.push({
          id: doc.id,
          ...(doc.data() as Omit<SharedExpense, 'id'>),
        });
      });

      const lastVisible =
        querySnapshot.docs[querySnapshot.docs.length - 1] || null;
      const hasMore = querySnapshot.docs.length === limitCount;

      return {
        expenses,
        lastDoc: lastVisible,
        hasMore,
      };
    } catch (error) {
      console.error('Error fetching group expenses:', error);
      throw error;
    }
  };

  // Get expense by ID
  const getExpenseById = async (groupId: string, expenseId: string) => {
    if (!db) {
      return null;
    }

    try {
      const expenseRef = doc(db, 'groupExpenses', expenseId);
      const expenseDoc = await getDoc(expenseRef);

      if (expenseDoc.exists()) {
        const expenseData = expenseDoc.data();

        // Verify the expense belongs to the specified group
        if (expenseData.groupId === groupId) {
          return {
            id: expenseDoc.id,
            ...expenseData,
          } as SharedExpense;
        }
      }

      return null;
    } catch (error) {
      console.error('Error fetching expense by ID:', error);
      throw error;
    }
  };

  // Add expense to group
  const addExpenseToGroup = async (
    groupId: string,
    expenseData: Omit<SharedExpense, 'id'>
  ) => {
    if (!currentUser || !db) {
      throw new Error('User must be logged in to add an expense');
    }

    try {
      // Verify user is a member of the group
      const group = await getGroup(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      const isMember = group.members.some(
        (member: GroupMember) => member.userId === currentUser.uid
      );

      if (!isMember) {
        throw new Error('You must be a member of the group to add expenses');
      }

      // Create expense in separate collection
      const expensesRef = collection(db, 'groupExpenses');
      const expenseWithId = {
        description: expenseData.description,
        amount: expenseData.amount,
        date: expenseData.date || Date.now(),
        paidBy: expenseData.paidBy,
        splits: expenseData.splits || [],
        category: expenseData.category || '',
        receiptImageUrl: expenseData.receiptImageUrl || '',
        groupId,
        createdBy: currentUser.uid,
        createdAt: Date.now(),
      };

      const docRef = await addDoc(expensesRef, expenseWithId);

      // Update group's updatedAt timestamp
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        updatedAt: serverTimestamp(),
      });

      return docRef.id;
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  };

  // Update expense
  const updateExpense = async (
    groupId: string,
    expenseId: string,
    expenseData: Partial<SharedExpense>
  ) => {
    if (!currentUser || !db) {
      throw new Error('User must be logged in to update an expense');
    }

    try {
      const expenseRef = doc(db, 'groupExpenses', expenseId);

      // Filter out undefined values
      const cleanExpenseData = Object.fromEntries(
        Object.entries(expenseData).filter(([, value]) => value !== undefined)
      );

      await updateDoc(expenseRef, {
        ...cleanExpenseData,
        updatedAt: Date.now(),
      });

      // Update group's updatedAt timestamp
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  };

  // Delete expense
  const deleteExpense = async (groupId: string, expenseId: string) => {
    if (!currentUser || !db) {
      throw new Error('User must be logged in to delete an expense');
    }

    try {
      const expenseRef = doc(db, 'groupExpenses', expenseId);
      await deleteDoc(expenseRef);

      // Update group's updatedAt timestamp
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  };

  // Get group settlements with pagination
  const getGroupSettlements = async (
    groupId: string,
    options: {
      limit?: number;
      lastDoc?: QueryDocumentSnapshot;
    } = {}
  ) => {
    if (!db) {
      return { settlements: [], lastDoc: null, hasMore: false };
    }

    try {
      const { limit: limitCount = 50, lastDoc } = options;
      const settlementsRef = collection(db, 'groupSettlements');

      let q = query(
        settlementsRef,
        where('groupId', '==', groupId),
        orderBy('date', 'desc'),
        limit(limitCount)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const querySnapshot = await getDocs(q);
      const settlements: Settlement[] = [];

      querySnapshot.forEach((doc) => {
        settlements.push({
          id: doc.id,
          ...(doc.data() as Omit<Settlement, 'id'>),
        });
      });

      const lastVisible =
        querySnapshot.docs[querySnapshot.docs.length - 1] || null;
      const hasMore = querySnapshot.docs.length === limitCount;

      return {
        settlements,
        lastDoc: lastVisible,
        hasMore,
      };
    } catch (error) {
      console.error('Error fetching group settlements:', error);
      throw error;
    }
  };

  // Add settlement to group
  const addSettlementToGroup = async (
    groupId: string,
    settlementData: Omit<Settlement, 'id'>
  ) => {
    if (!currentUser || !db) {
      throw new Error('User must be logged in to add a settlement');
    }

    try {
      // Verify user is a member of the group
      const group = await getGroup(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      const isMember = group.members.some(
        (member: GroupMember) => member.userId === currentUser.uid
      );

      if (!isMember) {
        throw new Error('You must be a member of the group to add settlements');
      }

      // Create settlement in separate collection
      const settlementsRef = collection(db, 'groupSettlements');
      const settlementWithId = {
        from: settlementData.from,
        to: settlementData.to,
        amount: settlementData.amount,
        date: settlementData.date || Date.now(),
        notes: settlementData.notes || '',
        groupId,
        createdBy: currentUser.uid,
        createdAt: Date.now(),
      };

      const docRef = await addDoc(settlementsRef, settlementWithId);

      // Update group's updatedAt timestamp
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        updatedAt: serverTimestamp(),
      });

      return docRef.id;
    } catch (error) {
      console.error('Error adding settlement:', error);
      throw error;
    }
  };

  // Update settlement
  const updateSettlement = async (
    groupId: string,
    settlementId: string,
    settlementData: Partial<Settlement>
  ) => {
    if (!currentUser || !db) {
      throw new Error('User must be logged in to update a settlement');
    }

    try {
      const settlementRef = doc(db, 'groupSettlements', settlementId);

      // Filter out undefined values
      const cleanSettlementData = Object.fromEntries(
        Object.entries(settlementData).filter(
          ([, value]) => value !== undefined
        )
      );

      await updateDoc(settlementRef, {
        ...cleanSettlementData,
        updatedAt: Date.now(),
      });

      // Update group's updatedAt timestamp
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating settlement:', error);
      throw error;
    }
  };

  // Delete settlement
  const deleteSettlement = async (groupId: string, settlementId: string) => {
    if (!currentUser || !db) {
      throw new Error('User must be logged in to delete a settlement');
    }

    try {
      const settlementRef = doc(db, 'groupSettlements', settlementId);
      await deleteDoc(settlementRef);

      // Update group's updatedAt timestamp
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error deleting settlement:', error);
      throw error;
    }
  };

  // Get user expenses across all groups
  const getUserExpenses = async (
    userId: string,
    options: {
      limit?: number;
      lastDoc?: QueryDocumentSnapshot;
      startDate?: number;
      endDate?: number;
    } = {}
  ) => {
    if (!db) {
      return { expenses: [], lastDoc: null, hasMore: false };
    }

    try {
      const { limit: limitCount = 50, lastDoc, startDate, endDate } = options;
      const expensesRef = collection(db, 'groupExpenses');

      let q = query(
        expensesRef,
        where('splits', 'array-contains', { userId }),
        orderBy('date', 'desc'),
        limit(limitCount)
      );

      // Add date filters if provided
      if (startDate) {
        q = query(q, where('date', '>=', startDate));
      }
      if (endDate) {
        q = query(q, where('date', '<=', endDate));
      }

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const querySnapshot = await getDocs(q);
      const expenses: SharedExpense[] = [];

      querySnapshot.forEach((doc) => {
        expenses.push({
          id: doc.id,
          ...(doc.data() as Omit<SharedExpense, 'id'>),
        });
      });

      const lastVisible =
        querySnapshot.docs[querySnapshot.docs.length - 1] || null;
      const hasMore = querySnapshot.docs.length === limitCount;

      return {
        expenses,
        lastDoc: lastVisible,
        hasMore,
      };
    } catch (error) {
      console.error('Error fetching user expenses:', error);
      throw error;
    }
  };

  // Real-time listeners
  const subscribeToGroupExpenses = (
    groupId: string,
    callback: (expenses: SharedExpense[]) => void,
    options: { limit?: number } = {}
  ) => {
    if (!db) return () => {};

    const { limit: limitCount = 50 } = options;
    const expensesRef = collection(db, 'groupExpenses');
    const q = query(
      expensesRef,
      where('groupId', '==', groupId),
      orderBy('date', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
      const expenses: SharedExpense[] = [];
      snapshot.forEach((doc) => {
        expenses.push({
          id: doc.id,
          ...(doc.data() as Omit<SharedExpense, 'id'>),
        });
      });
      callback(expenses);
    });
  };

  const subscribeToGroupSettlements = (
    groupId: string,
    callback: (settlements: Settlement[]) => void,
    options: { limit?: number } = {}
  ) => {
    if (!db) return () => {};

    const { limit: limitCount = 50 } = options;
    const settlementsRef = collection(db, 'groupSettlements');
    const q = query(
      settlementsRef,
      where('groupId', '==', groupId),
      orderBy('date', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
      const settlements: Settlement[] = [];
      snapshot.forEach((doc) => {
        settlements.push({
          id: doc.id,
          ...(doc.data() as Omit<Settlement, 'id'>),
        });
      });
      callback(settlements);
    });
  };

  // Group management functions
  const addMemberToGroup = async (groupId: string, memberData: GroupMember) => {
    if (!currentUser || !db) {
      throw new Error('User must be logged in to add a member');
    }

    try {
      // Ensure joinedAt is a regular number, not serverTimestamp()
      const memberWithRegularTimestamp = {
        ...memberData,
        joinedAt:
          typeof memberData.joinedAt === 'number'
            ? memberData.joinedAt
            : Date.now(),
      };

      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        members: arrayUnion(memberWithRegularTimestamp),
        updatedAt: serverTimestamp(),
      });

      await refreshGroups();
    } catch (error) {
      console.error('Error adding member to group:', error);
      throw error;
    }
  };

  const removeMemberFromGroup = async (groupId: string, userId: string) => {
    if (!currentUser || !db) {
      throw new Error('User must be logged in to remove a member');
    }

    try {
      const group = await getGroup(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      const updatedMembers = group.members.filter(
        (member) => member.userId !== userId
      );

      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        members: updatedMembers,
        updatedAt: serverTimestamp(),
      });

      await refreshGroups();
    } catch (error) {
      console.error('Error removing member from group:', error);
      throw error;
    }
  };

  const leaveGroup = async (groupId: string) => {
    if (!currentUser) {
      throw new Error('User must be logged in to leave a group');
    }

    await removeMemberFromGroup(groupId, currentUser.uid);
  };

  // Update group
  const updateGroup = async (groupId: string, groupData: Partial<Group>) => {
    if (!currentUser || !db) {
      throw new Error('User must be logged in to update a group');
    }

    try {
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        ...groupData,
        updatedAt: serverTimestamp(),
      });

      await refreshGroups();
    } catch (error) {
      console.error('Error updating group:', error);
      throw error;
    }
  };

  // Search users for adding to groups
  const searchUsersForGroup = async (searchTerm: string) => {
    try {
      const users = await searchUsers(searchTerm, 10);
      return users.filter((user) => user.id !== currentUser?.uid);
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  };

  // Calculate user balance across all groups
  const getUserBalance = async (userId: string) => {
    try {
      const userGroups = groups.filter((group) =>
        group.members.some((member) => member.userId === userId)
      );

      let totalOwed = 0;
      let totalPaid = 0;
      const groupBalances: Record<
        string,
        {
          groupName: string;
          owed: number;
          paid: number;
          net: number;
        }
      > = {};

      // Get all expenses for user's groups
      for (const group of userGroups) {
        let groupOwed = 0;
        let groupPaid = 0;

        // Get expenses for this group
        const { expenses } = await getGroupExpenses(group.id, { limit: 1000 });

        expenses.forEach((expense) => {
          if (expense.paidBy === userId) {
            groupPaid += expense.amount;
          }

          expense.splits?.forEach((split) => {
            if (split.userId === userId) {
              if (split.userId === expense.paidBy) {
                // If the person who paid is also in the splits, they already paid their share
                // So they don't owe anything additional
              } else {
                groupOwed += split.amount;
              }
            }
          });
        });

        // Get settlements for this group
        const { settlements } = await getGroupSettlements(group.id, {
          limit: 1000,
        });

        settlements.forEach((settlement) => {
          if (settlement.from === userId) {
            groupPaid += settlement.amount;
          } else if (settlement.to === userId) {
            groupOwed += settlement.amount;
          }
        });

        const groupNet = groupPaid - groupOwed;
        groupBalances[group.id] = {
          groupName: group.name,
          owed: groupOwed,
          paid: groupPaid,
          net: groupNet,
        };

        totalOwed += groupOwed;
        totalPaid += groupPaid;
      }

      return {
        totalOwed,
        totalPaid,
        netBalance: totalPaid - totalOwed,
        groupBalances,
      };
    } catch (error) {
      console.error('Error calculating user balance:', error);
      throw error;
    }
  };

  const value: GroupContextType = {
    // Groups
    groups,
    loading,
    refreshGroups,
    getGroup,
    createGroup,
    updateGroup,

    // Expenses
    getGroupExpenses,
    getExpenseById,
    addExpenseToGroup,
    updateExpense,
    deleteExpense,

    // Settlements
    getGroupSettlements,
    addSettlementToGroup,
    updateSettlement,
    deleteSettlement,

    // User expenses
    getUserExpenses,

    // Real-time listeners
    subscribeToGroupExpenses,
    subscribeToGroupSettlements,

    // Group management
    addMemberToGroup,
    removeMemberFromGroup,
    leaveGroup,

    // Utilities
    searchUsers: searchUsersForGroup,
    getUserBalance,
  };

  return (
    <GroupContext.Provider value={value}>{children}</GroupContext.Provider>
  );
};
