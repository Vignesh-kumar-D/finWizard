// lib/firebase/migration/migrate-to-separate-collections.ts

import { db } from '../config';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  writeBatch,
} from 'firebase/firestore';

interface MigrationStats {
  groupsProcessed: number;
  expensesMigrated: number;
  settlementsMigrated: number;
  errors: string[];
}

/**
 * Migration script to move expenses and settlements from arrays inside group documents
 * to separate collections for better scalability
 */
export async function migrateToSeparateCollections(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    groupsProcessed: 0,
    expensesMigrated: 0,
    settlementsMigrated: 0,
    errors: [],
  };

  try {
    console.log('Starting migration to separate collections...');

    // Get all groups
    const groupsRef = collection(db, 'groups');
    const groupsSnapshot = await getDocs(groupsRef);

    const batch = writeBatch(db);
    let batchCount = 0;
    const MAX_BATCH_SIZE = 500;

    for (const groupDoc of groupsSnapshot.docs) {
      try {
        const groupData = groupDoc.data();
        const groupId = groupDoc.id;

        console.log(`Processing group: ${groupData.name} (${groupId})`);

        // Migrate expenses
        if (groupData.expenses && groupData.expenses.length > 0) {
          console.log(`  Migrating ${groupData.expenses.length} expenses...`);

          for (const expense of groupData.expenses) {
            try {
              // Create expense in separate collection
              const expenseData = {
                ...expense,
                groupId,
                createdAt: expense.createdAt || Date.now(),
              };

              // Remove the id from the expense data since addDoc will generate a new one
              const expenseWithoutId = { ...expenseData };
              delete expenseWithoutId.id;

              const expenseRef = await addDoc(
                collection(db, 'groupExpenses'),
                expenseWithoutId
              );

              console.log(
                `    Migrated expense: ${expense.description} -> ${expenseRef.id}`
              );
              stats.expensesMigrated++;
            } catch (error) {
              const errorMsg = `Failed to migrate expense ${expense.id}: ${error}`;
              console.error(errorMsg);
              stats.errors.push(errorMsg);
            }
          }
        }

        // Migrate settlements
        if (groupData.settlements && groupData.settlements.length > 0) {
          console.log(
            `  Migrating ${groupData.settlements.length} settlements...`
          );

          for (const settlement of groupData.settlements) {
            try {
              // Create settlement in separate collection
              const settlementData = {
                ...settlement,
                groupId,
                createdAt: Date.now(),
              };

              // Remove the id from the settlement data since addDoc will generate a new one
              const settlementWithoutId = { ...settlementData };
              delete settlementWithoutId.id;

              const settlementRef = await addDoc(
                collection(db, 'groupSettlements'),
                settlementWithoutId
              );

              console.log(
                `    Migrated settlement: ${settlement.from} -> ${settlement.to} -> ${settlementRef.id}`
              );
              stats.settlementsMigrated++;
            } catch (error) {
              const errorMsg = `Failed to migrate settlement ${settlement.id}: ${error}`;
              console.error(errorMsg);
              stats.errors.push(errorMsg);
            }
          }
        }

        // Update group document to remove expenses and settlements arrays
        // and add updatedAt timestamp
        const groupUpdate = {
          updatedAt: Date.now(),
        };

        batch.update(doc(db, 'groups', groupId), groupUpdate);
        batchCount++;

        // Commit batch if it gets too large
        if (batchCount >= MAX_BATCH_SIZE) {
          await batch.commit();
          console.log(`Committed batch of ${batchCount} updates`);
          batchCount = 0;
        }

        stats.groupsProcessed++;
      } catch (error) {
        const errorMsg = `Failed to process group ${groupDoc.id}: ${error}`;
        console.error(errorMsg);
        stats.errors.push(errorMsg);
      }
    }

    // Commit any remaining batch operations
    if (batchCount > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${batchCount} updates`);
    }

    console.log('Migration completed successfully!');
    console.log('Migration stats:', stats);

    return stats;
  } catch (error) {
    const errorMsg = `Migration failed: ${error}`;
    console.error(errorMsg);
    stats.errors.push(errorMsg);
    return stats;
  }
}

/**
 * Verify migration by checking if data exists in new collections
 */
export async function verifyMigration(): Promise<{
  groupsWithOldData: number;
  expensesInNewCollection: number;
  settlementsInNewCollection: number;
  verificationErrors: string[];
}> {
  const result: {
    groupsWithOldData: number;
    expensesInNewCollection: number;
    settlementsInNewCollection: number;
    verificationErrors: string[];
  } = {
    groupsWithOldData: 0,
    expensesInNewCollection: 0,
    settlementsInNewCollection: 0,
    verificationErrors: [],
  };

  try {
    console.log('Verifying migration...');

    // Check for groups that still have expenses/settlements arrays
    const groupsRef = collection(db, 'groups');
    const groupsSnapshot = await getDocs(groupsRef);

    for (const groupDoc of groupsSnapshot.docs) {
      const groupData = groupDoc.data();

      if (groupData.expenses && groupData.expenses.length > 0) {
        result.groupsWithOldData++;
        console.warn(
          `Group ${groupData.name} still has ${groupData.expenses.length} expenses in array`
        );
      }

      if (groupData.settlements && groupData.settlements.length > 0) {
        result.groupsWithOldData++;
        console.warn(
          `Group ${groupData.name} still has ${groupData.settlements.length} settlements in array`
        );
      }
    }

    // Count expenses in new collection
    const expensesRef = collection(db, 'groupExpenses');
    const expensesSnapshot = await getDocs(expensesRef);
    result.expensesInNewCollection = expensesSnapshot.size;

    // Count settlements in new collection
    const settlementsRef = collection(db, 'groupSettlements');
    const settlementsSnapshot = await getDocs(settlementsRef);
    result.settlementsInNewCollection = settlementsSnapshot.size;

    console.log('Verification completed:', result);
    return result;
  } catch (error) {
    const errorMsg = `Verification failed: ${error}`;
    console.error(errorMsg);
    result.verificationErrors.push(errorMsg);
    return result;
  }
}

// Export utility functions for manual migration
export const migrationUtils = {
  migrateToSeparateCollections,
  verifyMigration,
};
