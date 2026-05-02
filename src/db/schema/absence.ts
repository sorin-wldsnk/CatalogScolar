import { pgTable, text, timestamp, uuid, smallint, date, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { school } from "./school";
import { enrollment } from "./enrollment";
import { subject } from "./subject";
import { appUser } from "./app_user";
import { academicYear } from "./academic_year";

export const ABSENCE_STATUSES = ["UNEXCUSED", "EXCUSED", "PENDING_EXCUSE"] as const;
export type AbsenceStatus = (typeof ABSENCE_STATUSES)[number];

export const absence = pgTable(
  "absence",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => school.id, { onDelete: "cascade" }),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollment.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subject.id, { onDelete: "restrict" }),
    teacherUserId: uuid("teacher_user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "restrict" }),
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYear.id, { onDelete: "restrict" }),
    semester: smallint("semester").notNull(),
    absentDate: date("absent_date").notNull(),
    period: smallint("period"),
    status: text("status").notNull().default("UNEXCUSED"),
    excusedByUserId: uuid("excused_by_user_id").references(() => appUser.id, {
      onDelete: "set null",
    }),
    excusedAt: timestamp("excused_at", { withTimezone: true }),
    excuseReason: text("excuse_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    check("absence_semester_check", sql`${t.semester} IN (1, 2)`),
    check(
      "absence_status_check",
      sql`${t.status} IN ('UNEXCUSED', 'EXCUSED', 'PENDING_EXCUSE')`
    ),
    check(
      "absence_period_check",
      sql`${t.period} IS NULL OR (${t.period} >= 1 AND ${t.period} <= 8)`
    ),
  ]
);

export type Absence = typeof absence.$inferSelect;
export type NewAbsence = typeof absence.$inferInsert;
