"use server";

import { db } from "@/db";
import { teachingAssignment } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { can } from "@/lib/casbin";
import { z } from "zod";
import { revalidatePath } from "next/cache";

async function getSessionCtx() {
  const session = await auth();
  if (!session?.user) return null;
  const schoolId = (session as { schoolId?: string }).schoolId;
  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!schoolId) return null;
  return { schoolId, roles };
}

const classSubjectSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  teacherUserId: z.string().uuid(),
});

export async function setClassSubjectTeacher(data: unknown) {
  const ctx = await getSessionCtx();
  if (!ctx) return { success: false, error: "Neautentificat" };

  if (!(await can(ctx.roles, "subject", "create" as never))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const parsed = classSubjectSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  await db
    .insert(teachingAssignment)
    .values({ schoolId: ctx.schoolId, ...parsed.data })
    .onConflictDoUpdate({
      target: [
        teachingAssignment.academicYearId,
        teachingAssignment.classId,
        teachingAssignment.subjectId,
      ],
      set: { teacherUserId: parsed.data.teacherUserId, updatedAt: new Date() },
    });

  revalidatePath("/admin/incadrari");
  revalidatePath(`/admin/clase/${parsed.data.classId}`);
  return { success: true };
}

export async function removeClassSubjectTeacher(assignmentId: string, classId: string) {
  const ctx = await getSessionCtx();
  if (!ctx) return { success: false, error: "Neautentificat" };

  if (!(await can(ctx.roles, "subject", "create" as never))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  await db
    .delete(teachingAssignment)
    .where(
      and(
        eq(teachingAssignment.id, assignmentId),
        eq(teachingAssignment.schoolId, ctx.schoolId)
      )
    );

  revalidatePath("/admin/incadrari");
  revalidatePath(`/admin/clase/${classId}`);
  return { success: true };
}

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
