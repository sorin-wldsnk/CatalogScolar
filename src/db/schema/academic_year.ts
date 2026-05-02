import { pgTable, text, boolean, timestamp, uuid, date, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { school } from "./school";

export const academicYear = pgTable(
  "academic_year",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => school.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    isActive: boolean("is_active").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [unique("academic_year_school_name_unique").on(t.schoolId, t.name)]
);

export type AcademicYear = typeof academicYear.$inferSelect;
export type NewAcademicYear = typeof academicYear.$inferInsert;
