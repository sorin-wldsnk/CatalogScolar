import { db } from "@/db";
import { academicYear } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function getAcademicYears(schoolId: string) {
  return db
    .select()
    .from(academicYear)
    .where(eq(academicYear.schoolId, schoolId))
    .orderBy(desc(academicYear.name));
}

export async function getActiveAcademicYear(schoolId: string) {
  const [year] = await db
    .select()
    .from(academicYear)
    .where(and(eq(academicYear.schoolId, schoolId), eq(academicYear.isActive, true)))
    .limit(1);
  return year ?? null;
}

export async function getAcademicYearById(id: string, schoolId: string) {
  const [year] = await db
    .select()
    .from(academicYear)
    .where(and(eq(academicYear.id, id), eq(academicYear.schoolId, schoolId)))
    .limit(1);
  return year ?? null;
}
