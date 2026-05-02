import { db } from "@/db";
import { subject } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function getSubjects(schoolId: string) {
  return db
    .select()
    .from(subject)
    .where(eq(subject.schoolId, schoolId))
    .orderBy(subject.name);
}

export async function getSubjectById(id: string, schoolId: string) {
  const [s] = await db
    .select()
    .from(subject)
    .where(and(eq(subject.id, id), eq(subject.schoolId, schoolId)))
    .limit(1);
  return s ?? null;
}
