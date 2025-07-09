import { useState, useCallback, useEffect } from 'react';
import { QueryDocumentSnapshot } from 'firebase/firestore';
import { useGroups } from '@/lib/firebase/group-context-scalable';

interface PaginationOptions {
  initialLimit?: number;
  loadMoreLimit?: number;
}

interface PaginationState<T> {
  data: T[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  lastDoc: QueryDocumentSnapshot | null;
}

interface PaginationActions {
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

export function usePagination<T>(
  fetchFunction: (options: {
    limit: number;
    lastDoc?: QueryDocumentSnapshot;
  }) => Promise<{
    data: T[];
    lastDoc: QueryDocumentSnapshot | null;
    hasMore: boolean;
  }>,
  options: PaginationOptions = {}
): PaginationState<T> & PaginationActions {
  const { initialLimit = 20, loadMoreLimit = 20 } = options;

  const [state, setState] = useState<PaginationState<T>>({
    data: [],
    loading: true,
    loadingMore: false,
    hasMore: false,
    error: null,
    lastDoc: null,
  });

  const loadData = useCallback(
    async (
      limit: number,
      lastDoc?: QueryDocumentSnapshot | null,
      append = false
    ) => {
      try {
        const result = await fetchFunction({
          limit,
          lastDoc: lastDoc || undefined,
        });

        setState((prev) => ({
          ...prev,
          data: append ? [...prev.data, ...result.data] : result.data,
          lastDoc: result.lastDoc,
          hasMore: result.hasMore,
          loading: false,
          loadingMore: false,
          error: null,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          loadingMore: false,
          error: error instanceof Error ? error.message : 'An error occurred',
        }));
      }
    },
    [fetchFunction]
  );

  const loadMore = useCallback(async () => {
    if (state.loadingMore || !state.hasMore) return;

    setState((prev) => ({ ...prev, loadingMore: true }));
    await loadData(loadMoreLimit, state.lastDoc, true);
  }, [
    state.loadingMore,
    state.hasMore,
    state.lastDoc,
    loadData,
    loadMoreLimit,
  ]);

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    await loadData(initialLimit);
  }, [loadData, initialLimit]);

  const reset = useCallback(() => {
    setState({
      data: [],
      loading: true,
      loadingMore: false,
      hasMore: false,
      error: null,
      lastDoc: null,
    });
  }, []);

  // Initial load
  useEffect(() => {
    loadData(initialLimit);
  }, [loadData, initialLimit]);

  return {
    ...state,
    loadMore,
    refresh,
    reset,
  };
}

// Specialized hook for group expenses
export function useGroupExpenses(
  groupId: string,
  options: {
    initialLimit?: number;
    loadMoreLimit?: number;
    startDate?: number;
    endDate?: number;
  } = {}
) {
  const { getGroupExpenses } = useGroups();

  const fetchExpenses = useCallback(
    async ({
      limit,
      lastDoc,
    }: {
      limit: number;
      lastDoc?: QueryDocumentSnapshot;
    }) => {
      const result = await getGroupExpenses(groupId, {
        limit,
        lastDoc,
        startDate: options.startDate,
        endDate: options.endDate,
      });

      return {
        data: result.expenses,
        lastDoc: result.lastDoc,
        hasMore: result.hasMore,
      };
    },
    [groupId, getGroupExpenses, options.startDate, options.endDate]
  );

  return usePagination(fetchExpenses, {
    initialLimit: options.initialLimit,
    loadMoreLimit: options.loadMoreLimit,
  });
}

// Specialized hook for group settlements
export function useGroupSettlements(
  groupId: string,
  options: {
    initialLimit?: number;
    loadMoreLimit?: number;
  } = {}
) {
  const { getGroupSettlements } = useGroups();

  const fetchSettlements = useCallback(
    async ({
      limit,
      lastDoc,
    }: {
      limit: number;
      lastDoc?: QueryDocumentSnapshot;
    }) => {
      const result = await getGroupSettlements(groupId, {
        limit,
        lastDoc,
      });

      return {
        data: result.settlements,
        lastDoc: result.lastDoc,
        hasMore: result.hasMore,
      };
    },
    [groupId, getGroupSettlements]
  );

  return usePagination(fetchSettlements, {
    initialLimit: options.initialLimit,
    loadMoreLimit: options.loadMoreLimit,
  });
}

// Specialized hook for user expenses across all groups
export function useUserExpenses(
  userId: string,
  options: {
    initialLimit?: number;
    loadMoreLimit?: number;
    startDate?: number;
    endDate?: number;
  } = {}
) {
  const { getUserExpenses } = useGroups();

  const fetchUserExpenses = useCallback(
    async ({
      limit,
      lastDoc,
    }: {
      limit: number;
      lastDoc?: QueryDocumentSnapshot;
    }) => {
      const result = await getUserExpenses(userId, {
        limit,
        lastDoc,
        startDate: options.startDate,
        endDate: options.endDate,
      });

      return {
        data: result.expenses,
        lastDoc: result.lastDoc,
        hasMore: result.hasMore,
      };
    },
    [userId, getUserExpenses, options.startDate, options.endDate]
  );

  return usePagination(fetchUserExpenses, {
    initialLimit: options.initialLimit,
    loadMoreLimit: options.loadMoreLimit,
  });
}
