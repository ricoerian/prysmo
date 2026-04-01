import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "prysmo.db");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initSchema(_db);
    runMigrations(_db);
  }
  return _db;
}

function columnExists(db: Database.Database, table: string, column: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return cols.some((c) => c.name === column);
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS printers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      model TEXT NOT NULL,
      brand TEXT NOT NULL,
      location TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      photo_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS supplies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'other',
      sku TEXT,
      quantity INTEGER NOT NULL DEFAULT 0,
      min_quantity INTEGER NOT NULL DEFAULT 5,
      unit TEXT NOT NULL DEFAULT 'pcs',
      notes TEXT,
      photo_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS printer_supplies (
      printer_id INTEGER NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
      supply_id INTEGER NOT NULL REFERENCES supplies(id) ON DELETE CASCADE,
      PRIMARY KEY (printer_id, supply_id)
    );

    CREATE TABLE IF NOT EXISTS stock_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supply_id INTEGER NOT NULL REFERENCES supplies(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      ordered_at TEXT NOT NULL DEFAULT (datetime('now')),
      fulfilled_at TEXT,
      ordered_by INTEGER NOT NULL REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS print_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      printer_id INTEGER NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      notes TEXT,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS print_run_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL REFERENCES print_runs(id) ON DELETE CASCADE,
      supply_id INTEGER NOT NULL REFERENCES supplies(id) ON DELETE CASCADE,
      quantity_needed INTEGER NOT NULL DEFAULT 1,
      is_packed INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Seed admin user if the DB is freshly created
  const count = (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c;
  if (count === 0) {
    const hash = bcrypt.hashSync("password123", 10);
    db.prepare(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)"
    ).run("Administrator", "admin@prysmo.com", hash, "admin");
  }
}

/** Add columns to existing DBs that were created before this version */
function runMigrations(db: Database.Database) {
  if (!columnExists(db, "printers", "photo_url")) {
    db.prepare("ALTER TABLE printers ADD COLUMN photo_url TEXT").run();
  }
  if (!columnExists(db, "supplies", "photo_url")) {
    db.prepare("ALTER TABLE supplies ADD COLUMN photo_url TEXT").run();
  }
}
