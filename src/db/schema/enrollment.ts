import { pgTable, text, timestamp, uuid, date, uniqueIndex, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { school } from "./school";
import { student } from "./student";
import { classGroup } from "./class_group";
import { academicYear } from "./academic_year";

export const ENROLLMENT_STATUSES = ["ACTIVE", "WITHDRAWN", "TRANSFERRED"] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const enrollment = pgTable(
  "enrollment",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => school.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => student.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classGroup.id, { onDelete: "restrict" }),
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYear.id, { onDelete: "restrict" }),
    enrolledAt: date("enrolled_at").notNull().default(sql`now()`),
    status: text("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex("enrollment_student_year_active_unique")
      .on(t.studentId, t.academicYearId)
      .where(sql`${t.status} = 'ACTIVE'`),
    check(
      "enrollment_status_check",
      sql`${t.status} IN ('ACTIVE','WITHDRAWN','TRANSFERRED')`
    ),
  ]
);

export type Enrollment = typeof enrollment.$inferSelect;
export type NewEnrollment = typeof enrollment.$inferInsert;
