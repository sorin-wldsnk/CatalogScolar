"use server";

import { db } from "@/db";
import { subject } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { can } from "@/lib/casbin";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { normalizeDiacritics } from "@/lib/diacritics";

const subjectSchema = z.object({
  name: z.string().min(1, "Numele materiei este obligatoriu"),
  code: z
    .string()
    .min(1, "Codul este obligatoriu")
    .max(10, "Codul poate avea maxim 10 caractere")
    .toUpperCase(),
  gradeLevels: z.array(z.number().int().min(0).max(8)).optional(),
});

export async function createSubject(data: unknown) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Neautentificat" };

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "subject", "create" as never))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const parsed = subjectSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) return { success: false, error: "Școala nu a fost găsită" };

  const [s] = await db
    .insert(subject)
    .values({
      schoolId,
      name: normalizeDiacritics(parsed.data.name),
      code: parsed.data.code,
      gradeLevels: parsed.data.gradeLevels ?? [],
    })
    .returning();

  revalidatePath("/admin/materii");
  return { success: true, data: s };
}

export async function updateSubjectGradeLevels(id: string, gradeLevels: number[]) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Neautentificat" };

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "subject", "create" as never))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) return { success: false, error: "Școala nu a fost găsită" };

  await db
    .update(subject)
    .set({ gradeLevels, updatedAt: new Date() })
    .where(and(eq(subject.id, id), eq(subject.schoolId, schoolId)));

  revalidatePath("/admin/materii");
  return { success: true };
}

export async function updateSubject(id: string, data: unknown) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Neautentificat" };

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "subject", "create" as never))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const parsed = subjectSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) return { success: false, error: "Școala nu a fost găsită" };

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.name) updateData.name = normalizeDiacritics(parsed.data.name);
  if (parsed.data.code) updateData.code = parsed.data.code;

  const [s] = await db
    .update(subject)
    .set(updateData)
    .where(and(eq(subject.id, id), eq(subject.schoolId, schoolId)))
    .returning();

  revalidatePath("/admin/materii");
  return { success: true, data: s };
}
