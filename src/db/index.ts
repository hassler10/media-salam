import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const useSsl =
  !/localhost|127\.0\.0\.1/.test(databaseUrl) &&
  (process.env.NODE_ENV === "production" || databaseUrl.includes("sslmode"));

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    max: process.env.NODE_ENV === "production" ? 1 : 5,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });

globalForDb.__arenaNextJsPostgresqlPool = pool;

export const db = drizzle(pool);
