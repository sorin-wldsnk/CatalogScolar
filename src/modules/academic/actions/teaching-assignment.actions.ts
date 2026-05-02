"use server";

import { db } from "@/db";
import { teachingAssignment } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { can } from "@/lib/casbin";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const assignmentSchema = z.object({
  academicYearId: z.string().uuid("An școlar invalid"),
  teacherUserId: z.string().uuid("Profesor invalid"),
  classId: z.string().uuid("Clasa invalidă"),
  subjectId: z.string().uuid("Materia invalidă"),
});

export async function createAssignment(data: unknown) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Neautentificat" };

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "subject", "create" as never))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const parsed = assignmentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) return { success: false, error: "Școala nu a fost găsită" };

  const [a] = await db
    .insert(teachingAssignment)
    .values({ schoolId, ...parsed.data })
    .onConflictDoNothing()
    .returning();

  revalidatePath("/admin/incadrari");
  return { success: true, data: a };
}

export async function deleteAssignment(id: string) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Neautentificat" };

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "subject", "create" as never))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) return { success: false, error: "Școala nu a fost găsită" };

  await db
    .delete(teachingAssignment)
    .where(
      and(eq(teachingAssignment.id, id), eq(teachingAssignment.schoolId, schoolId))
    );

  revalidatePath("/admin/incadrari");
  return { success: true };
}
