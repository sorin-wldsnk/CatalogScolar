"use server";

import { db } from "@/db";
import { grade, enrollment, classGroup } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { normalizeDiacritics } from "@/lib/diacritics";
import { getGradingScale, validateGrade } from "@/lib/grading";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const gradeSchema = z.object({
  enrollmentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  semester: z.coerce.number().int().min(1).max(2),
  valueNumeric: z.coerce.number().min(1).max(10).optional().nullable(),
  valueQualitative: z.enum(["I", "S", "B", "FB"]).optional().nullable(),
  gradeType: z.enum(["REGULAR", "THESIS", "ORAL", "PRACTICAL"]).default("REGULAR"),
  weight: z.coerce.number().min(0.1).max(9.9).default(1),
  notes: z.string().optional().nullable(),
  gradedAt: z.string().optional(),
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

export async function addGrade(data: unknown) {
  const ctx = await getSessionCtx();
  if (!ctx) return { success: false, error: "Neautentificat" };

  const isAdmin = ctx.roles.includes("ADMIN");
  const isTeacher = ctx.roles.some((r) => ["TEACHER", "HOMEROOM"].includes(r));
  if (!isAdmin && !isTeacher) return { success: false, error: "Nu aveți permisiunea necesară" };

  const parsed = gradeSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const [enroll] = await db
    .select({ gradeLevel: classGroup.gradeLevel })
    .from(enrollment)
    .innerJoin(classGroup, eq(enrollment.classId, classGroup.id))
    .where(and(eq(enrollment.id, parsed.data.enrollmentId), eq(enrollment.schoolId, ctx.schoolId)))
    .limit(1);

  if (!enroll) return { success: false, error: "Înscrierea nu a fost găsită" };

  const scale = getGradingScale(enroll.gradeLevel);

  if (scale === "NUMERIC") {
    if (!parsed.data.valueNumeric) return { success: false, error: "Introduceți o notă numerică (1-10)" };
    if (!validateGrade(parsed.data.valueNumeric, scale)) return { success: false, error: "Nota trebuie să fie între 1 și 10" };
  } else {
    if (!parsed.data.valueQualitative) return { success: false, error: "Selectați un calificativ (I/S/B/FB)" };
    if (!validateGrade(parsed.data.valueQualitative, scale)) return { success: false, error: "Calificativ invalid" };
  }

  const teacherUserId = ctx.userId;

  const [inserted] = await db
    .insert(grade)
    .values({
      schoolId: ctx.schoolId,
      enrollmentId: parsed.data.enrollmentId,
      subjectId: parsed.data.subjectId,
      teacherUserId,
      academicYearId: parsed.data.academicYearId,
      semester: parsed.data.semester,
      valueNumeric: scale === "NUMERIC" ? String(parsed.data.valueNumeric) : null,
      valueQualitative: scale === "QUALITATIVE" ? parsed.data.valueQualitative : null,
      gradeType: parsed.data.gradeType,
      weight: String(parsed.data.weight ?? 1),
      notes: parsed.data.notes ? normalizeDiacritics(parsed.data.notes) : null,
      gradedAt: parsed.data.gradedAt ?? new Date().toISOString().split("T")[0],
    })
    .returning();

  revalidatePath("/catalog");
  return { success: true, data: inserted };
}

export async function deleteGrade(id: string) {
  const ctx = await getSessionCtx();
  if (!ctx) return { success: false, error: "Neautentificat" };

  if (!ctx.roles.includes("ADMIN")) {
    return { success: false, error: "Doar administratorii pot șterge note" };
  }

  await db
    .delete(grade)
    .where(and(eq(grade.id, id), eq(grade.schoolId, ctx.schoolId)));

  revalidatePath("/catalog");
  return { success: true };
}
