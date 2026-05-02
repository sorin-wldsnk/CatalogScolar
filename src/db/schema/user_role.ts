import { pgTable, timestamp, uuid, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { schoolMembership } from "./school_membership";
import { role } from "./role";

export const userRole = pgTable(
  "user_role",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => schoolMembership.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [unique("user_role_membership_role_unique").on(t.membershipId, t.roleId)]
);

export type UserRole = typeof userRole.$inferSelect;
export type NewUserRole = typeof userRole.$inferInsert;
