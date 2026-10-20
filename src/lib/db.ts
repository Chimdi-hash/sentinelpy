import { DatabaseSync } from 'node:sqlite';
import path from 'path';

export interface UserRecord {
  address: string;
  displayName: string | null;
  avatarUrl: string | null;
  headline: string | null;
  bio: string | null;
  roles: string | null; // JSON string
  skills: string | null; // JSON string
  linkedin: string | null;
  twitter: string | null;
  github: string | null;
  email: string | null;
  website: string | null;
  isFlagged: number; // 0 or 1
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VisitorLogRecord {
  id: number;
  visitorHash: string;
  page: string;
  referrer: string | null;
  userAgent: string | null;
  timestamp: string;
}

const dbPath = path.join(process.cwd(), 'trustlesswork.db');

// Global singleton to avoid multiple connections in Next.js development
const globalForDb = globalThis as unknown as {
  trustlessDb: DatabaseSync | undefined;
};

export function getDb(): DatabaseSync {
  if (!globalForDb.trustlessDb) {
    const db = new DatabaseSync(dbPath);
    
    // Enable WAL mode for high performance concurrency
    db.exec(`
      PRAGMA journal_mode = WAL;
      
      CREATE TABLE IF NOT EXISTS users (
        address TEXT PRIMARY KEY,
        displayName TEXT,
        avatarUrl TEXT,
        headline TEXT,
        bio TEXT,
        roles TEXT,
        skills TEXT,
        linkedin TEXT,
        twitter TEXT,
        github TEXT,
        email TEXT,
        website TEXT,
        isFlagged INTEGER DEFAULT 0,
        adminNotes TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS visitor_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visitorHash TEXT NOT NULL,
        page TEXT NOT NULL,
        referrer TEXT,
        userAgent TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admin_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        adminAddress TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    globalForDb.trustlessDb = db;
  }
  return globalForDb.trustlessDb;
}

// User Helpers
export function getUser(address: string): UserRecord | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM users WHERE LOWER(address) = LOWER(?) LIMIT 1');
  const result = stmt.get(address) as UserRecord | undefined;
  return result || null;
}

export function upsertUser(data: {
  address: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  headline?: string | null;
  bio?: string | null;
  roles?: string | null;
  skills?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  github?: string | null;
  email?: string | null;
  website?: string | null;
}) {
  const db = getDb();
  const normalized = data.address.toLowerCase();
  const now = new Date().toISOString();

  const existing = getUser(normalized);
  if (existing) {
    const stmt = db.prepare(`
      UPDATE users SET
        displayName = COALESCE(?, displayName),
        avatarUrl = COALESCE(?, avatarUrl),
        headline = COALESCE(?, headline),
        bio = COALESCE(?, bio),
        roles = COALESCE(?, roles),
        skills = COALESCE(?, skills),
        linkedin = COALESCE(?, linkedin),
        twitter = COALESCE(?, twitter),
        github = COALESCE(?, github),
        email = COALESCE(?, email),
        website = COALESCE(?, website),
        updatedAt = ?
      WHERE LOWER(address) = LOWER(?)
    `);
    stmt.run(
      data.displayName ?? null,
      data.avatarUrl ?? null,
      data.headline ?? null,
      data.bio ?? null,
      data.roles ?? null,
      data.skills ?? null,
      data.linkedin ?? null,
      data.twitter ?? null,
      data.github ?? null,
      data.email ?? null,
      data.website ?? null,
      now,
      normalized
    );
  } else {
    const stmt = db.prepare(`
      INSERT INTO users (
        address, displayName, avatarUrl, headline, bio, roles, skills,
        linkedin, twitter, github, email, website, isFlagged, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `);
    stmt.run(
      normalized,
      data.displayName ?? null,
      data.avatarUrl ?? null,
      data.headline ?? null,
      data.bio ?? null,
      data.roles ?? null,
      data.skills ?? null,
      data.linkedin ?? null,
      data.twitter ?? null,
      data.github ?? null,
      data.email ?? null,
      data.website ?? null,
      now,
      now
    );
  }
  return getUser(normalized);
}

export function listUsers(searchQuery?: string, limit: number = 100): UserRecord[] {
  const db = getDb();
  if (searchQuery && searchQuery.trim()) {
    const term = `%${searchQuery.trim().toLowerCase()}%`;
    const stmt = db.prepare(`
      SELECT * FROM users
      WHERE LOWER(address) LIKE ?
         OR LOWER(COALESCE(displayName, '')) LIKE ?
         OR LOWER(COALESCE(headline, '')) LIKE ?
         OR LOWER(COALESCE(skills, '')) LIKE ?
      ORDER BY createdAt DESC
      LIMIT ?
    `);
    return stmt.all(term, term, term, term, limit) as unknown as UserRecord[];
  }

  const stmt = db.prepare('SELECT * FROM users ORDER BY createdAt DESC LIMIT ?');
  return stmt.all(limit) as unknown as UserRecord[];
}

export function countUsers(): number {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  return row ? Number(row.count) : 0;
}

export function countFlaggedUsers(): number {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM users WHERE isFlagged = 1').get() as { count: number };
  return row ? Number(row.count) : 0;
}

// Analytics Helpers
export function logVisitor(data: {
  visitorHash: string;
  page: string;
  referrer?: string | null;
  userAgent?: string | null;
}) {
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO visitor_logs (visitorHash, page, referrer, userAgent, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(
    data.visitorHash,
    data.page,
    data.referrer ?? null,
    data.userAgent ?? null,
    now
  );
}

export function getAnalyticsMetrics(): {
  totalPageviews: number;
  uniqueVisitors: number;
} {
  const db = getDb();
  const pvRow = db.prepare('SELECT COUNT(*) as count FROM visitor_logs').get() as { count: number };
  const uvRow = db.prepare('SELECT COUNT(DISTINCT visitorHash) as count FROM visitor_logs').get() as { count: number };

  return {
    totalPageviews: pvRow ? Number(pvRow.count) : 0,
    uniqueVisitors: uvRow ? Number(uvRow.count) : 0,
  };
}

export function getRecentVisitorLogs(limit: number = 20): VisitorLogRecord[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM visitor_logs ORDER BY id DESC LIMIT ?');
  return stmt.all(limit) as unknown as VisitorLogRecord[];
}

export function logAdminAction(adminAddress: string, action: string, details?: string | null) {
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare('INSERT INTO admin_logs (adminAddress, action, details, timestamp) VALUES (?, ?, ?, ?)');
  stmt.run(adminAddress.toLowerCase(), action, details ?? null, now);
}
