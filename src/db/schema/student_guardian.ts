import { pgTable, text, boolean, timestamp, uuid, unique, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { school } from "./school";
import { student } from "./student";
import { appUser } from "./app_user";

export const RELATIONSHIP_TYPES = ["PARENT", "GRANDPARENT", "LEGAL_GUARDIAN", "OTHER"] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const studentGuardian = pgTable(
  "student_guardian",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => school.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => student.id, { onDelete: "cascade" }),
    guardianUserId: uuid("guardian_user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    relationship: text("relationship").notNull().default("PARENT"),
    isPrimary: boolean("is_primary").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    unique("student_guardian_student_user_unique").on(t.studentId, t.guardianUserId),
    check(
      "student_guardian_relationship_check",
      sql`${t.relationship} IN ('PARENT','GRANDPARENT','LEGAL_GUARDIAN','OTHER')`
    ),
  ]
);

export type StudentGuardian = typeof studentGuardian.$inferSelect;
export type NewStudentGuardian = typeof studentGuardian.$inferInsert;
