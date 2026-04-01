import { Pool } from "pg";
import { parse } from "pg-connection-string";
import bcrypt from "bcryptjs";

let _pool: Pool | null = null;

export function getPool(): Pool {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      // If we're in build mode, we might not have the DB URL, but we shouldn't throw 
      // at the top level. Throwing here only if someone actually tries to use the pool.
      throw new Error("DATABASE_URL is not defined in environment variables");
    }

    const config = parse(connectionString);
    _pool = new Pool({
      host: config.host || undefined,
      database: config.database || undefined,
      user: config.user || undefined,
      password: config.password || undefined,
      port: config.port ? parseInt(config.port, 10) : undefined,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
    });
  }
  return _pool;
}

export { _pool as pool }; // For backward compatibility if needed, but getPool() is preferred

/** Convenience wrapper — returns the QueryResult directly */
export async function query<T extends object = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
) {
  try {
    return await getPool().query<T>(sql, params);
  } catch (err) {
    console.error("DATABASE QUERY ERROR:", err);
    throw err;
  }
}

let _initialized = false;

export async function initDb(): Promise<void> {
  if (_initialized) return;
  _initialized = true;
  try {
    await initSchema();
  } catch (err) {
    console.error("DATABASE INITIALIZATION ERROR:", err);
    _initialized = false; // Allow retry on next request if it failed
    throw err;
  }
}

async function initSchema(): Promise<void> {
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS printers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      model TEXT NOT NULL,
      brand TEXT NOT NULL,
      location TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      photo_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS supplies (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'other',
      sku TEXT,
      quantity INTEGER NOT NULL DEFAULT 0,
      min_quantity INTEGER NOT NULL DEFAULT 5,
      unit TEXT NOT NULL DEFAULT 'pcs',
      notes TEXT,
      photo_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS printer_supplies (
      printer_id INTEGER NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
      supply_id INTEGER NOT NULL REFERENCES supplies(id) ON DELETE CASCADE,
      PRIMARY KEY (printer_id, supply_id)
    );

    CREATE TABLE IF NOT EXISTS stock_orders (
      id SERIAL PRIMARY KEY,
      supply_id INTEGER NOT NULL REFERENCES supplies(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      ordered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      fulfilled_at TIMESTAMPTZ,
      ordered_by INTEGER NOT NULL REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS print_runs (
      id SERIAL PRIMARY KEY,
      printer_id INTEGER NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      notes TEXT,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS print_run_items (
      id SERIAL PRIMARY KEY,
      run_id INTEGER NOT NULL REFERENCES print_runs(id) ON DELETE CASCADE,
      supply_id INTEGER NOT NULL REFERENCES supplies(id) ON DELETE CASCADE,
      quantity_needed INTEGER NOT NULL DEFAULT 1,
      is_packed BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);

  // Seed admin user if the DB is freshly set up
  const { rows } = await p.query<{ c: string }>("SELECT COUNT(*) AS c FROM users");
  if (parseInt(rows[0].c, 10) === 0) {
    const hash = await bcrypt.hash("password123", 10);
    await p.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)",
      ["Administrator", "admin@prysmo.com", hash, "admin"]
    );
  }
}
