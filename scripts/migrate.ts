/**
 * Database migration script — run this once at deploy time (or as needed)
 * to set up or update the schema.
 *
 * Usage:
 *   npx tsx scripts/migrate.ts
 *
 * This is intentionally NOT called at runtime — it should only be executed
 * from a developer machine or a CI/CD step, not on every serverless request.
 */
import "dotenv/config";
import { Pool } from "pg";
import { parse } from "pg-connection-string";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: DATABASE_URL is not set.");
  process.exit(1);
}

const config = parse(connectionString);
const pool = new Pool({
  host: config.host || undefined,
  database: config.database || undefined,
  user: config.user || undefined,
  password: config.password || undefined,
  port: config.port ? parseInt(config.port, 10) : undefined,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

async function migrate() {
  console.log("⏳ Running migrations…");
  const client = await pool.connect();
  try {
    await client.query(`
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
        last_ink_replacement TIMESTAMPTZ,
        last_ink_replacement_shift TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS supplies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'other',
        sku TEXT,
        quantity INTEGER NOT NULL DEFAULT 0,
        min_quantity INTEGER NOT NULL DEFAULT 5,
        default_order_quantity INTEGER NOT NULL DEFAULT 10,
        unit TEXT NOT NULL DEFAULT 'pcs',
        notes TEXT,
        photo_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS printer_supplies (
        printer_id INTEGER NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
        supply_id INTEGER NOT NULL REFERENCES supplies(id) ON DELETE CASCADE,
        quantity_used INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (printer_id, supply_id)
      );

      ALTER TABLE supplies ADD COLUMN IF NOT EXISTS default_order_quantity INTEGER NOT NULL DEFAULT 10;
      ALTER TABLE printer_supplies ADD COLUMN IF NOT EXISTS quantity_used INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE printers ADD COLUMN IF NOT EXISTS last_ink_replacement TIMESTAMPTZ;
      ALTER TABLE printers ADD COLUMN IF NOT EXISTS last_ink_replacement_shift TEXT;

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

    // Seed admin user if DB is fresh
    const { rows } = await client.query<{ c: string }>("SELECT COUNT(*) AS c FROM users");
    if (parseInt(rows[0].c, 10) === 0) {
      const hash = await bcrypt.hash("password123", 10);
      await client.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)",
        ["Administrator", "admin@prysmo.com", hash, "admin"]
      );
      console.log("✅ Seeded admin user (admin@prysmo.com / password123)");
    }

    console.log("✅ Migrations complete.");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
