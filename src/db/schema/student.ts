import { pgTable, text, timestamp, uuid, date, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { school } from "./school";

export const STUDENT_STATUSES = ["ACTIVE", "GRADUATED", "TRANSFERRED", "WITHDRAWN", "REPEATING"] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const student = pgTable(
  "student",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => school.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    dateOfBirth: date("date_of_birth"),
    personalId: text("personal_id"),
    status: text("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    check(
      "student_status_check",
      sql`${t.status} IN ('ACTIVE','GRADUATED','TRANSFERRED','WITHDRAWN','REPEATING')`
    ),
  ]
);

export type Student = typeof student.$inferSelect;
export type NewStudent = typeof student.$inferInsert;
