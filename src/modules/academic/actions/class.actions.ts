"use server";

import { db } from "@/db";
import { classGroup } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { can } from "@/lib/casbin";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const createSchema = z.object({
  academicYearId: z.string().uuid("An școlar invalid"),
  name: z.string().min(1, "Numele clasei este obligatoriu"),
  gradeLevel: z.coerce.number().int().min(0).max(8),
  homeroomTeacherId: z.string().uuid().optional().nullable(),
});

export async function createClass(data: unknown) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Neautentificat" };

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "class", "create"))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const parsed = createSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) return { success: false, error: "Școala nu a fost găsită" };

  const [cls] = await db
    .insert(classGroup)
    .values({ schoolId, ...parsed.data })
    .returning();

  revalidatePath("/admin/clase");
  return { success: true, data: cls };
}

export async function updateClass(id: string, data: unknown) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Neautentificat" };

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "class", "create"))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const parsed = createSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) return { success: false, error: "Școala nu a fost găsită" };

  const [cls] = await db
    .update(classGroup)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(classGroup.id, id), eq(classGroup.schoolId, schoolId)))
    .returning();

  revalidatePath("/admin/clase");
  return { success: true, data: cls };
}

export async function assignHomeroomTeacher(classId: string, teacherUserId: string | null) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Neautentificat" };

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "class", "create"))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) return { success: false, error: "Școala nu a fost găsită" };

  await db
    .update(classGroup)
    .set({ homeroomTeacherId: teacherUserId, updatedAt: new Date() })
    .where(and(eq(classGroup.id, classId), eq(classGroup.schoolId, schoolId)));

  revalidatePath("/admin/clase");
  return { success: true };
}
