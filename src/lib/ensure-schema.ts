import { sql } from "drizzle-orm";
import { db } from "@/db";

let done: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  done ??= createSchema().catch((error) => {
    done = null;
    throw error;
  });
  return done;
}

async function createSchema() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS admins (
      id serial PRIMARY KEY,
      username varchar(80) NOT NULL UNIQUE,
      password_hash varchar(160) NOT NULL,
      display_name varchar(120) NOT NULL,
      role varchar(40) NOT NULL DEFAULT 'administrateur',
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS subscribers (
      id serial PRIMARY KEY,
      subscription_number varchar(32) NOT NULL UNIQUE,
      last_name varchar(120) NOT NULL,
      first_name varchar(180) NOT NULL,
      gender varchar(12) NOT NULL,
      profession varchar(180),
      phone varchar(40) NOT NULL,
      registration_date date NOT NULL,
      validity_date date NOT NULL,
      photo_data text,
      photo_consent boolean NOT NULL DEFAULT false,
      notes text,
      is_demo boolean NOT NULL DEFAULT false,
      card_generated_at timestamp,
      last_printed_at timestamp,
      deleted_at timestamp,
      deleted_by varchar(80),
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `);
  // Colonnes apparues après le premier déploiement : les bases existantes doivent rattraper.
  await db.execute(sql`
    ALTER TABLE subscribers
      ADD COLUMN IF NOT EXISTS deleted_at timestamp,
      ADD COLUMN IF NOT EXISTS deleted_by varchar(80),
      ADD COLUMN IF NOT EXISTS photo_consent boolean NOT NULL DEFAULT false
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS subscription_counter (
      year integer PRIMARY KEY,
      last_number integer NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id serial PRIMARY KEY,
      action varchar(80) NOT NULL,
      details text,
      entity_type varchar(40),
      entity_id integer,
      actor varchar(80),
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS settings (
      key varchar(80) PRIMARY KEY,
      value text NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS card_errors (
      id serial PRIMARY KEY,
      subscriber_id integer,
      subscription_number varchar(32),
      message text NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS guard_entries (
      key varchar(120) PRIMARY KEY,
      count integer NOT NULL DEFAULT 1,
      started_at timestamp NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS revoked_sessions (
      jti varchar(32) PRIMARY KEY,
      expires_at timestamp NOT NULL
    )
  `);
}
