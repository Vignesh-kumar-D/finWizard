// lib/firebase/performance/cache-manager.ts

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheOptions {
  ttl?: number; // Default TTL in milliseconds
  maxSize?: number; // Maximum number of entries
}

class CacheManager<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly defaultTtl: number;
  private readonly maxSize: number;

  constructor(options: CacheOptions = {}) {
    this.defaultTtl = options.ttl || 5 * 60 * 1000; // 5 minutes default
    this.maxSize = options.maxSize || 100; // 100 entries default
  }

  set(key: string, data: T, ttl?: number): void {
    // Remove expired entries first
    this.cleanup();

    // If cache is full, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry is expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  get size(): number {
    this.cleanup();
    return this.cache.size;
  }

  get keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Specialized cache managers for different data types
export const groupCache = new CacheManager<unknown>({
  ttl: 10 * 60 * 1000, // 10 minutes for groups
  maxSize: 50,
});

export const expenseCache = new CacheManager<unknown>({
  ttl: 5 * 60 * 1000, // 5 minutes for expenses
  maxSize: 200,
});

export const settlementCache = new CacheManager<unknown>({
  ttl: 5 * 60 * 1000, // 5 minutes for settlements
  maxSize: 100,
});

export const userCache = new CacheManager<unknown>({
  ttl: 15 * 60 * 1000, // 15 minutes for users
  maxSize: 100,
});

// Cache key generators
export const cacheKeys = {
  group: (groupId: string) => `group:${groupId}`,
  groupExpenses: (groupId: string, limit?: number, lastDoc?: string) =>
    `groupExpenses:${groupId}:${limit || 50}:${lastDoc || 'first'}`,
  groupSettlements: (groupId: string, limit?: number, lastDoc?: string) =>
    `groupSettlements:${groupId}:${limit || 50}:${lastDoc || 'first'}`,
  userExpenses: (userId: string, limit?: number, lastDoc?: string) =>
    `userExpenses:${userId}:${limit || 50}:${lastDoc || 'first'}`,
  user: (userId: string) => `user:${userId}`,
  userGroups: (userId: string) => `userGroups:${userId}`,
};

// Cache invalidation helpers
export const invalidateCache = {
  group: (groupId: string) => {
    groupCache.delete(cacheKeys.group(groupId));
    // Invalidate related caches
    expenseCache.keys.forEach((key) => {
      if (key.includes(`groupExpenses:${groupId}`)) {
        expenseCache.delete(key);
      }
    });
    settlementCache.keys.forEach((key) => {
      if (key.includes(`groupSettlements:${groupId}`)) {
        settlementCache.delete(key);
      }
    });
  },

  groupExpenses: (groupId: string) => {
    expenseCache.keys.forEach((key) => {
      if (key.includes(`groupExpenses:${groupId}`)) {
        expenseCache.delete(key);
      }
    });
  },

  groupSettlements: (groupId: string) => {
    settlementCache.keys.forEach((key) => {
      if (key.includes(`groupSettlements:${groupId}`)) {
        settlementCache.delete(key);
      }
    });
  },

  userExpenses: (userId: string) => {
    expenseCache.keys.forEach((key) => {
      if (key.includes(`userExpenses:${userId}`)) {
        expenseCache.delete(key);
      }
    });
  },

  user: (userId: string) => {
    userCache.delete(cacheKeys.user(userId));
    userCache.delete(cacheKeys.userGroups(userId));
  },
};

// Query optimization helpers
export const queryOptimizer = {
  // Batch multiple queries together
  batchQueries: async <T>(
    queries: Array<() => Promise<T>>,
    batchSize: number = 10
  ): Promise<T[]> => {
    const results: T[] = [];

    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map((query) => query()));
      results.push(...batchResults);
    }

    return results;
  },

  // Debounce function calls
  debounce: <T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  // Throttle function calls
  throttle: <T extends (...args: unknown[]) => unknown>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },
};

// Performance monitoring
export const performanceMonitor = {
  queryTimes: new Map<string, number[]>(),

  startQuery: (queryName: string): string => {
    const startTime = performance.now();
    return `${queryName}:${startTime}`;
  },

  endQuery: (queryId: string): void => {
    const [queryName, startTimeStr] = queryId.split(':');
    const startTime = parseFloat(startTimeStr);
    const endTime = performance.now();
    const duration = endTime - startTime;

    if (!performanceMonitor.queryTimes.has(queryName)) {
      performanceMonitor.queryTimes.set(queryName, []);
    }

    performanceMonitor.queryTimes.get(queryName)!.push(duration);

    // Keep only last 100 measurements
    const queryTimes = performanceMonitor.queryTimes.get(queryName)!;
    if (queryTimes.length > 100) {
      queryTimes.splice(0, queryTimes.length - 100);
    }
  },

  getAverageQueryTime: (queryName: string): number => {
    const times = performanceMonitor.queryTimes.get(queryName);
    if (!times || times.length === 0) return 0;

    return times.reduce((sum, time) => sum + time, 0) / times.length;
  },

  getSlowQueries: (
    threshold: number = 1000
  ): Array<{ query: string; avgTime: number }> => {
    const slowQueries: Array<{ query: string; avgTime: number }> = [];

    for (const [queryName] of performanceMonitor.queryTimes.entries()) {
      const avgTime = performanceMonitor.getAverageQueryTime(queryName);
      if (avgTime > threshold) {
        slowQueries.push({ query: queryName, avgTime });
      }
    }

    return slowQueries.sort((a, b) => b.avgTime - a.avgTime);
  },

  clear: (): void => {
    performanceMonitor.queryTimes.clear();
  },
};

// Export the main CacheManager class for custom use
export { CacheManager };
