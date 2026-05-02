import { pgTable, text, timestamp, uuid, smallint, numeric, date, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { school } from "./school";
import { enrollment } from "./enrollment";
import { subject } from "./subject";
import { appUser } from "./app_user";
import { academicYear } from "./academic_year";

export const GRADE_TYPES = ["REGULAR", "THESIS", "ORAL", "PRACTICAL"] as const;
export type GradeType = (typeof GRADE_TYPES)[number];

export const QUALITATIVE_VALUES = ["I", "S", "B", "FB"] as const;
export type QualitativeValue = (typeof QUALITATIVE_VALUES)[number];

export const grade = pgTable(
  "grade",
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
    valueNumeric: numeric("value_numeric", { precision: 4, scale: 2 }),
    valueQualitative: text("value_qualitative"),
    gradeType: text("grade_type").notNull().default("REGULAR"),
    weight: numeric("weight", { precision: 3, scale: 1 }).notNull().default("1"),
    notes: text("notes"),
    gradedAt: date("graded_at").notNull().default(sql`now()`),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    check("grade_semester_check", sql`${t.semester} IN (1, 2)`),
    check(
      "grade_value_numeric_check",
      sql`${t.valueNumeric} IS NULL OR (${t.valueNumeric} >= 1 AND ${t.valueNumeric} <= 10)`
    ),
    check(
      "grade_value_qualitative_check",
      sql`${t.valueQualitative} IS NULL OR ${t.valueQualitative} IN ('I', 'S', 'B', 'FB')`
    ),
    check(
      "grade_type_check",
      sql`${t.gradeType} IN ('REGULAR', 'THESIS', 'ORAL', 'PRACTICAL')`
    ),
  ]
);

export type Grade = typeof grade.$inferSelect;
export type NewGrade = typeof grade.$inferInsert;
