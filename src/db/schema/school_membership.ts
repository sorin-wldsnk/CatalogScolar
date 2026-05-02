import { pgTable, text, boolean, timestamp, uuid, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { school } from "./school";
import { appUser } from "./app_user";

export const schoolMembership = pgTable(
  "school_membership",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => school.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [unique("school_membership_school_user_unique").on(t.schoolId, t.userId)]
);

export type SchoolMembership = typeof schoolMembership.$inferSelect;
export type NewSchoolMembership = typeof schoolMembership.$inferInsert;
