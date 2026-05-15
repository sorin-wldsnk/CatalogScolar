"use server";

import { db } from "@/db";
import { classGroup, appUser, schoolMembership, userRole, role } from "@/db/schema";
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

  const sessionRoles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(sessionRoles, "class", "create"))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) return { success: false, error: "Școala nu a fost găsită" };

  await db
    .update(classGroup)
    .set({ homeroomTeacherId: teacherUserId, updatedAt: new Date() })
    .where(and(eq(classGroup.id, classId), eq(classGroup.schoolId, schoolId)));

  // Dacă s-a alocat un profesor, asigură că are rolul HOMEROOM
  if (teacherUserId) {
    const [membership] = await db
      .select({ id: schoolMembership.id })
      .from(schoolMembership)
      .where(and(eq(schoolMembership.userId, teacherUserId), eq(schoolMembership.schoolId, schoolId)))
      .limit(1);

    if (membership) {
      const [homeroomRole] = await db
        .select({ id: role.id })
        .from(role)
        .where(eq(role.code, "HOMEROOM"))
        .limit(1);

      if (homeroomRole) {
        const existing = await db
          .select({ id: userRole.id })
          .from(userRole)
          .where(and(eq(userRole.membershipId, membership.id), eq(userRole.roleId, homeroomRole.id)))
          .limit(1);

        if (!existing.length) {
          await db.insert(userRole).values({ membershipId: membership.id, roleId: homeroomRole.id });
        }
      }
    }
  }

  revalidatePath("/admin/clase");
  revalidatePath(`/admin/clase/${classId}`);
  return { success: true };
}
