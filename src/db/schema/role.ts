import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const ROLE_CODES = ["ADMIN", "TEACHER", "HOMEROOM", "PARENT", "SECRETARY"] as const;
export type RoleCode = (typeof ROLE_CODES)[number];

export const role = pgTable("role", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type Role = typeof role.$inferSelect;
export type NewRole = typeof role.$inferInsert;
