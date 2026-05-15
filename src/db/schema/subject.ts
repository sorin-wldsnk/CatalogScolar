import { pgTable, text, timestamp, uuid, unique, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { school } from "./school";

export const subject = pgTable(
  "subject",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => school.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code").notNull(),
    gradeLevels: integer("grade_levels").array().notNull().default([0,1,2,3,4,5,6,7,8]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [unique("subject_school_code_unique").on(t.schoolId, t.code)]
);

export type Subject = typeof subject.$inferSelect;
export type NewSubject = typeof subject.$inferInsert;
