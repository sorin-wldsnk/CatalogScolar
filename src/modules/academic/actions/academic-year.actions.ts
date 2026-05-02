"use server";

import { db } from "@/db";
import { academicYear } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { auth } from "@/auth";
import { can } from "@/lib/casbin";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const createSchema = z.object({
  name: z.string().min(1, "Numele este obligatoriu"),
  startDate: z.string().min(1, "Data de început este obligatorie"),
  endDate: z.string().min(1, "Data de sfârșit este obligatorie"),
});

export async function createAcademicYear(data: unknown) {
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

  const [year] = await db
    .insert(academicYear)
    .values({ schoolId, ...parsed.data })
    .returning();

  revalidatePath("/admin/ani-scolari");
  return { success: true, data: year };
}

export async function setActiveAcademicYear(id: string) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Neautentificat" };

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "class", "create"))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) return { success: false, error: "Școala nu a fost găsită" };

  // Deactivate all, then activate the target
  await db
    .update(academicYear)
    .set({ isActive: false })
    .where(and(eq(academicYear.schoolId, schoolId), ne(academicYear.id, id)));

  await db
    .update(academicYear)
    .set({ isActive: true })
    .where(and(eq(academicYear.id, id), eq(academicYear.schoolId, schoolId)));

  revalidatePath("/admin/ani-scolari");
  return { success: true };
}
