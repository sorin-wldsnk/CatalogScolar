"use server";

import { db } from "@/db";
import { absence } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const absenceSchema = z.object({
  enrollmentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  semester: z.coerce.number().int().min(1).max(2),
  absentDate: z.string(),
  period: z.coerce.number().int().min(1).max(8).optional().nullable(),
});

async function getSessionCtx() {
  const session = await auth();
  if (!session?.user) return null;
  const schoolId = (session as { schoolId?: string }).schoolId;
  const roles = (session as { roles?: string[] }).roles ?? [];
  const userId = (session as { userId?: string }).userId;
  if (!schoolId || !userId) return null;
  return { schoolId, roles, userId };
}

export async function addAbsence(data: unknown) {
  const ctx = await getSessionCtx();
  if (!ctx) return { success: false, error: "Neautentificat" };

  const isTeacher = ctx.roles.some((r) => ["TEACHER", "HOMEROOM", "ADMIN"].includes(r));
  if (!isTeacher) return { success: false, error: "Nu aveți permisiunea necesară" };

  const parsed = absenceSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const [inserted] = await db
    .insert(absence)
    .values({
      schoolId: ctx.schoolId,
      enrollmentId: parsed.data.enrollmentId,
      subjectId: parsed.data.subjectId,
      teacherUserId: ctx.userId,
      academicYearId: parsed.data.academicYearId,
      semester: parsed.data.semester,
      absentDate: parsed.data.absentDate,
      period: parsed.data.period ?? null,
      status: "UNEXCUSED",
    })
    .returning();

  revalidatePath("/catalog");
  return { success: true, data: inserted };
}

export async function deleteAbsence(id: string) {
  const ctx = await getSessionCtx();
  if (!ctx) return { success: false, error: "Neautentificat" };

  const isAdmin = ctx.roles.includes("ADMIN");

  const [existing] = await db
    .select({ teacherUserId: absence.teacherUserId, absentDate: absence.absentDate })
    .from(absence)
    .where(and(eq(absence.id, id), eq(absence.schoolId, ctx.schoolId)))
    .limit(1);

  if (!existing) return { success: false, error: "Absența nu a fost găsită" };

  if (!isAdmin) {
    if (existing.teacherUserId !== ctx.userId) {
      return { success: false, error: "Puteți șterge doar propriile absențe" };
    }
    const today = new Date().toISOString().split("T")[0];
    if (existing.absentDate !== today) {
      return { success: false, error: "Puteți șterge absențe doar din ziua curentă" };
    }
  }

  await db.delete(absence).where(eq(absence.id, id));

  revalidatePath("/catalog");
  return { success: true };
}

export async function excuseAbsence(id: string, reason: string) {
  const ctx = await getSessionCtx();
  if (!ctx) return { success: false, error: "Neautentificat" };

  const canExcuse = ctx.roles.some((r) => ["HOMEROOM", "ADMIN"].includes(r));
  if (!canExcuse) {
    return { success: false, error: "Doar dirigintele sau administratorul poate motiva absențe" };
  }

  await db
    .update(absence)
    .set({
      status: "EXCUSED",
      excusedByUserId: ctx.userId,
      excusedAt: new Date(),
      excuseReason: reason,
      updatedAt: new Date(),
    })
    .where(and(eq(absence.id, id), eq(absence.schoolId, ctx.schoolId)));

  revalidatePath("/catalog");
  return { success: true };
}
