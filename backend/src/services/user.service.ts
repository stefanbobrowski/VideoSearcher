import { v4 as uuidv4 } from 'uuid';

interface User {
  id: string;
  email: string;
  createdAt: Date;
  requestCount: number;
  lastRequestAt: Date;
  dailyQuota: number;
  quotaResetAt: Date;
}

// In-memory user store (in production, use a database like Firestore or PostgreSQL)
const users: Map<string, User> = new Map();

// Daily quota per user
// Reduced to 1 to help avoid Vertex AI rate limiting (429 errors)
// Once GCP quotas are increased, this can be raised to 5-10
const DAILY_QUOTA = 1;

/**
 * Get or create a user by email
 */
export function getOrCreateUser(email: string): User {
  let user = Array.from(users.values()).find(u => u.email === email);
  
  if (!user) {
    user = {
      id: uuidv4(),
      email,
      createdAt: new Date(),
      requestCount: 0,
      lastRequestAt: new Date(),
      dailyQuota: DAILY_QUOTA,
      quotaResetAt: getNextMidnight(),
    };
    users.set(user.id, user);
  }
  
  return user;
}

/**
 * Get user by ID
 */
export function getUserById(userId: string): User | undefined {
  return users.get(userId);
}

/**
 * Check if user has remaining quota
 */
export function checkQuota(userId: string): { allowed: boolean; remaining: number; resetAt: Date } {
  const user = users.get(userId);
  
  if (!user) {
    return { allowed: false, remaining: 0, resetAt: new Date() };
  }

  // Reset quota if it's a new day
  if (new Date() >= user.quotaResetAt) {
    user.requestCount = 0;
    user.quotaResetAt = getNextMidnight();
  }

  const remaining = user.dailyQuota - user.requestCount;
  const allowed = remaining > 0;

  return { allowed, remaining, resetAt: user.quotaResetAt };
}

/**
 * Increment user's request count
 */
export function incrementRequestCount(userId: string): void {
  const user = users.get(userId);
  
  if (user) {
    user.requestCount++;
    user.lastRequestAt = new Date();
  }
}

/**
 * Get user's current quota status
 */
export function getQuotaStatus(userId: string): { used: number; total: number; remaining: number; resetAt: Date } | null {
  const user = users.get(userId);
  
  if (!user) {
    return null;
  }

  // Reset if needed
  if (new Date() >= user.quotaResetAt) {
    user.requestCount = 0;
    user.quotaResetAt = getNextMidnight();
  }

  return {
    used: user.requestCount,
    total: user.dailyQuota,
    remaining: user.dailyQuota - user.requestCount,
    resetAt: user.quotaResetAt,
  };
}

/**
 * Helper: Get next midnight (quota reset time)
 */
function getNextMidnight(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

/**
 * Get all users (for admin purposes)
 */
export function getAllUsers(): User[] {
  return Array.from(users.values());
}
