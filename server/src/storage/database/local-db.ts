import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'health.db');

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables();
  }
  return db;
}

function initTables(): void {
  const d = db;

  d.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nickname TEXT NOT NULL DEFAULT '',
      signature TEXT NOT NULL DEFAULT '',
      gender TEXT NOT NULL DEFAULT 'male',
      birth_date TEXT NOT NULL DEFAULT '1990-01-01',
      height REAL NOT NULL DEFAULT 170,
      target_weight REAL NOT NULL DEFAULT 70,
      target_waist REAL NOT NULL DEFAULT 80,
      avatar_url TEXT,
      reminder_time TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Add reminder_time column if it doesn't exist (migration for existing DBs)
  try { d.exec(`ALTER TABLE users ADD COLUMN reminder_time TEXT`); } catch (_e) { /* column already exists */ }

  d.exec(`
    CREATE TABLE IF NOT EXISTS checkin_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '1',
      record_date TEXT NOT NULL,
      weight REAL NOT NULL DEFAULT 0,
      waist REAL NOT NULL DEFAULT 0,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  d.exec(`CREATE INDEX IF NOT EXISTS idx_records_date ON checkin_records(record_date)`);
  d.exec(`CREATE INDEX IF NOT EXISTS idx_records_user ON checkin_records(user_id)`);

  d.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '1',
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  d.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`);

  // Seed default user if none exists
  const userCount = d.prepare('SELECT COUNT(*) as count FROM users').get() as any;
  if (userCount.count === 0) {
    d.prepare(`INSERT INTO users (id, nickname, signature, gender, birth_date, height, target_weight, target_waist)
      VALUES ('1', '两点丘', '每天进步一点点', 'male', '1975-11-03', 179, 70, 80)`).run();
    console.log('[LocalDB] Default user seeded');
  }

  console.log('[LocalDB] SQLite database initialized at', DB_PATH);
}

// ======== User operations ========

export function getUser(userId: string = '1') {
  const d = getDb();
  return d.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
}

export function updateUser(userId: string, fields: Record<string, any>) {
  const d = getDb();
  const keys = Object.keys(fields);
  if (keys.length === 0) return getUser(userId);
  const sets = keys.map(k => `${k} = @${k}`).join(', ');
  d.prepare(`UPDATE users SET ${sets} WHERE id = @id`).run({ ...fields, id: userId });
  return getUser(userId);
}

// ======== Records operations ========

export function getAllRecords(): any[] {
  const d = getDb();
  const today = new Date().toISOString().split('T')[0];
  return d.prepare('SELECT * FROM checkin_records WHERE record_date <= ? ORDER BY record_date DESC').all(today);
}

export function getRecordsByDateRange(startDate: string, endDate: string): any[] {
  const d = getDb();
  return d.prepare('SELECT * FROM checkin_records WHERE record_date >= ? AND record_date <= ? ORDER BY record_date DESC').all(startDate, endDate);
}

export function getRecordByDate(date: string) {
  const d = getDb();
  return d.prepare('SELECT * FROM checkin_records WHERE record_date = ?').get(date) as any;
}

export function getRecentRecords(days: number): any[] {
  const d = getDb();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];
  return d.prepare('SELECT * FROM checkin_records WHERE record_date >= ? ORDER BY record_date DESC').all(sinceStr);
}

export function upsertRecord(record: { id: string; user_id?: string; record_date: string; weight: number; waist: number; note?: string }): any {
  const d = getDb();
  const existing = d.prepare('SELECT * FROM checkin_records WHERE record_date = ?').get(record.record_date) as any;
  if (existing) {
    d.prepare(`UPDATE checkin_records SET weight = @weight, waist = @waist, note = @note WHERE record_date = @record_date`)
      .run({ weight: record.weight, waist: record.waist, note: record.note || '', record_date: record.record_date });
  } else {
    d.prepare(`INSERT INTO checkin_records (id, user_id, record_date, weight, waist, note) VALUES (@id, @user_id, @record_date, @weight, @waist, @note)`)
      .run({ id: record.id, user_id: record.user_id || '1', record_date: record.record_date, weight: record.weight, waist: record.waist, note: record.note || '' });
  }
  return d.prepare('SELECT * FROM checkin_records WHERE record_date = ?').get(record.record_date) as any;
}

export function getLatestRecord() {
  const d = getDb();
  const today = new Date().toISOString().split('T')[0];
  return d.prepare('SELECT * FROM checkin_records WHERE record_date <= ? ORDER BY record_date DESC LIMIT 1').get(today) as any;
}

export function getRecordStats(days: number = 90) {
  const d = getDb();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];
  const todayStr2 = new Date().toISOString().split('T')[0];
  const records = d.prepare('SELECT * FROM checkin_records WHERE record_date >= ? AND record_date <= ? ORDER BY record_date ASC').all(sinceStr, todayStr2) as any[];
  if (records.length === 0) return null;

  const weights = records.map((r: any) => r.weight);
  const waists = records.map((r: any) => r.waist);
  const avgWeight = weights.reduce((a: number, b: number) => a + b, 0) / weights.length;
  const avgWaist = waists.reduce((a: number, b: number) => a + b, 0) / waists.length;
  const maxWeight = Math.max(...weights);
  const minWeight = Math.min(...weights);
  const maxWaist = Math.max(...waists);
  const minWaist = Math.min(...waists);
  const maxWr = records.find((r: any) => r.weight === maxWeight);
  const minWr = records.find((r: any) => r.weight === minWeight);
  const maxWir = records.find((r: any) => r.waist === maxWaist);
  const minWir = records.find((r: any) => r.waist === minWaist);
  const today = new Date().toISOString().split('T')[0];
  const latest = records[records.length - 1];
  const todayCheckedIn = latest?.record_date === today;

  return {
    totalRecords: records.length,
    consecutiveDays: 1, // simplified
    monthRecords: records.filter((r: any) => r.record_date.startsWith(today.substring(0, 7))).length,
    latest: latest || null,
    todayCheckedIn,
    avgWeight, stdWeight: 0,
    maxWeight, maxWeightDate: maxWr?.record_date || '',
    minWeight, minWeightDate: minWr?.record_date || '',
    avgWaist, stdWaist: 0,
    maxWaist, maxWaistDate: maxWir?.record_date || '',
    minWaist, minWaistDate: minWir?.record_date || '',
  };
}

// ======== Notification operations ========

export function getNotifications(): any[] {
  const d = getDb();
  return d.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50').all();
}

export function getUnreadCount(): number {
  const d = getDb();
  const row = d.prepare('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0').get() as any;
  return row?.count || 0;
}

export function addNotification(title: string, content: string): any {
  const d = getDb();
  const id = 'n' + Date.now() + Math.random().toString(36).slice(2, 8);
  d.prepare('INSERT INTO notifications (id, title, content) VALUES (?, ?, ?)').run(id, title, content);
  return d.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
}

export function markNotificationRead(id: string): void {
  const d = getDb();
  d.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
}

export function markAllNotificationsRead(): void {
  const d = getDb();
  d.prepare('UPDATE notifications SET is_read = 1 WHERE is_read = 0').run();
}

export default { getDb, getUser, updateUser, getAllRecords, getRecordsByDateRange, getRecordByDate, getRecentRecords, upsertRecord, getLatestRecord, getRecordStats, getNotifications, getUnreadCount, addNotification, markNotificationRead, markAllNotificationsRead };
