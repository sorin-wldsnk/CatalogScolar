import { db } from "@/db";
import { school } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getSchool(schoolId: string) {
  const [s] = await db
    .select()
    .from(school)
    .where(eq(school.id, schoolId))
    .limit(1);
  return s ?? null;
}
