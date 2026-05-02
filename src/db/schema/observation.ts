import { pgTable, text, boolean, timestamp, uuid, smallint, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { school } from "./school";
import { enrollment } from "./enrollment";
import { appUser } from "./app_user";
import { academicYear } from "./academic_year";

export const observation = pgTable(
  "observation",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => school.id, { onDelete: "cascade" }),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollment.id, { onDelete: "cascade" }),
    teacherUserId: uuid("teacher_user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "restrict" }),
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYear.id, { onDelete: "restrict" }),
    semester: smallint("semester").notNull(),
    body: text("body").notNull(),
    isVisibleToParent: boolean("is_visible_to_parent").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    check("observation_semester_check", sql`${t.semester} IN (1, 2)`),
  ]
);

export type Observation = typeof observation.$inferSelect;
export type NewObservation = typeof observation.$inferInsert;
