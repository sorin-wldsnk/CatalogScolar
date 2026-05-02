import { pgTable, timestamp, uuid, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { school } from "./school";
import { academicYear } from "./academic_year";
import { appUser } from "./app_user";
import { classGroup } from "./class_group";
import { subject } from "./subject";

export const teachingAssignment = pgTable(
  "teaching_assignment",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => school.id, { onDelete: "cascade" }),
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYear.id, { onDelete: "cascade" }),
    teacherUserId: uuid("teacher_user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classGroup.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subject.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    unique("teaching_assignment_year_class_subject_unique").on(
      t.academicYearId,
      t.classId,
      t.subjectId
    ),
  ]
);

export type TeachingAssignment = typeof teachingAssignment.$inferSelect;
export type NewTeachingAssignment = typeof teachingAssignment.$inferInsert;
