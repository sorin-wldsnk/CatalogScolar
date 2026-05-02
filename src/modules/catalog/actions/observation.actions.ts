"use server";

import { db } from "@/db";
import { observation, enrollment } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { normalizeDiacritics } from "@/lib/diacritics";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getObservationsForEnrollment } from "@/modules/catalog/queries/observation.queries";

const schema = z.object({
  enrollmentId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  semester: z.coerce.number().int().min(1).max(2),
  body: z.string().min(1, "Observația nu poate fi goală"),
  isVisibleToParent: z.boolean().default(true),
});

async function getSessionCtx() {
  const session = await auth();
  if (!session?.user) return null;
  const schoolId = (session as { schoolId?: string }).schoolId;
  const roles = (session as { roles?: string[] }).roles ?? [];
  const userId = session?.user?.id;
  if (!schoolId || !userId) return null;
  return { schoolId, roles, userId };
}

export async function addObservation(data: unknown) {
  const ctx = await getSessionCtx();
  if (!ctx) return { success: false, error: "Neautentificat" };

  const isTeacher = ctx.roles.some((r) => ["TEACHER", "HOMEROOM", "ADMIN"].includes(r));
  if (!isTeacher) return { success: false, error: "Nu aveți permisiunea necesară" };

  const parsed = schema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const [enroll] = await db
    .select({ id: enrollment.id })
    .from(enrollment)
    .where(and(eq(enrollment.id, parsed.data.enrollmentId), eq(enrollment.schoolId, ctx.schoolId)))
    .limit(1);

  if (!enroll) return { success: false, error: "Înscrierea nu a fost găsită" };

  const [inserted] = await db
    .insert(observation)
    .values({
      schoolId: ctx.schoolId,
      enrollmentId: parsed.data.enrollmentId,
      teacherUserId: ctx.userId,
      academicYearId: parsed.data.academicYearId,
      semester: parsed.data.semester,
      body: normalizeDiacritics(parsed.data.body),
      isVisibleToParent: parsed.data.isVisibleToParent,
    })
    .returning();

  revalidatePath("/catalog");
  return { success: true, data: inserted };
}

export async function getObservations(enrollmentId: string) {
  return getObservationsForEnrollment(enrollmentId);
}
