import {
  boolean,
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  subscriptionNumber: varchar("subscription_number", { length: 32 })
    .notNull()
    .unique(),
  lastName: varchar("last_name", { length: 120 }).notNull(),
  firstName: varchar("first_name", { length: 180 }).notNull(),
  gender: varchar("gender", { length: 12 }).notNull(),
  profession: varchar("profession", { length: 180 }),
  phone: varchar("phone", { length: 40 }).notNull(),
  registrationDate: date("registration_date", { mode: "string" }).notNull(),
  validityDate: date("validity_date", { mode: "string" }).notNull(),
  photoData: text("photo_data"),
  notes: text("notes"),
  isDemo: boolean("is_demo").default(false).notNull(),
  cardGeneratedAt: timestamp("card_generated_at"),
  lastPrintedAt: timestamp("last_printed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptionCounter = pgTable("subscription_counter", {
  year: integer("year").primaryKey(),
  lastNumber: integer("last_number").notNull(),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  action: varchar("action", { length: 80 }).notNull(),
  details: text("details"),
  entityType: varchar("entity_type", { length: 40 }),
  entityId: integer("entity_id"),
  actor: varchar("actor", { length: 80 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 80 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 160 }).notNull(),
  displayName: varchar("display_name", { length: 120 }).notNull(),
  role: varchar("role", { length: 40 }).default("administrateur").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: text("value").notNull(),
});

export const cardErrors = pgTable("card_errors", {
  id: serial("id").primaryKey(),
  subscriberId: integer("subscriber_id"),
  subscriptionNumber: varchar("subscription_number", { length: 32 }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Compteur d'événements par clé, en base pour rester fiable d'une instance à l'autre. */
export const guardEntries = pgTable("guard_entries", {
  key: varchar("key", { length: 120 }).primaryKey(),
  count: integer("count").notNull().default(1),
  startedAt: timestamp("started_at").notNull(),
});

/** Sessions déclarées mortes avant leur expiration (déconnexion, mot de passe changé). */
export const revokedSessions = pgTable("revoked_sessions", {
  jti: varchar("jti", { length: 32 }).primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
});
