import { pgTable, text, timestamp, uuid, smallint, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { school } from "./school";
import { academicYear } from "./academic_year";
import { appUser } from "./app_user";

export const classGroup = pgTable(
  "class_group",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => school.id, { onDelete: "cascade" }),
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYear.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    gradeLevel: smallint("grade_level").notNull(),
    homeroomTeacherId: uuid("homeroom_teacher_id").references(() => appUser.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    unique("class_group_school_year_name_unique").on(
      t.schoolId,
      t.academicYearId,
      t.name
    ),
  ]
);

export type ClassGroup = typeof classGroup.$inferSelect;
export type NewClassGroup = typeof classGroup.$inferInsert;
