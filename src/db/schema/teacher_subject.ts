import { pgTable, timestamp, uuid, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { school } from "./school";
import { appUser } from "./app_user";
import { subject } from "./subject";

export const teacherSubject = pgTable(
  "teacher_subject",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => school.id, { onDelete: "cascade" }),
    teacherUserId: uuid("teacher_user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subject.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    unique("teacher_subject_unique").on(t.schoolId, t.teacherUserId, t.subjectId),
  ]
);

export type TeacherSubject = typeof teacherSubject.$inferSelect;
export type NewTeacherSubject = typeof teacherSubject.$inferInsert;
