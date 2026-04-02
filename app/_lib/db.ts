import { Pool } from "pg";
import { parse } from "pg-connection-string";

let _pool: Pool | null = null;

export function getPool(): Pool {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not defined in environment variables");
    }

    const config = parse(connectionString);
    _pool = new Pool({
      host: config.host || undefined,
      database: config.database || undefined,
      user: config.user || undefined,
      password: config.password || undefined,
      port: config.port ? parseInt(config.port, 10) : undefined,
      ssl: { rejectUnauthorized: false },
      // Serverless-friendly pool settings:
      // Keep the pool small — Vercel Serverless functions are short-lived and
      // there can be many concurrent invocations, so a large pool exhausts
      // Supabase's connection limit fast.
      max: 3,
      // Release idle connections quickly so they don't accumulate.
      idleTimeoutMillis: 10_000,
      // Fail fast if we can't get a connection; don't block requests.
      connectionTimeoutMillis: 5_000,
    });
  }
  return _pool;
}

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

// Keep initDb exported for backward compatibility, but it's now a no-op.
// Schema setup is handled by `scripts/migrate.ts` at deploy time.
export async function initDb(): Promise<void> {
  // intentional no-op — see scripts/migrate.ts
}

export { _pool as pool };
