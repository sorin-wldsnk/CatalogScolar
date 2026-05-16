"use server";

import { db } from "@/db";
import { appUser, schoolMembership, userRole, role, teacherSubject } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { can } from "@/lib/casbin";
import { normalizeDiacritics } from "@/lib/diacritics";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const createSchema = z.object({
  firstName: z.string().min(1, "Prenumele este obligatoriu"),
  lastName: z.string().min(1, "Numele este obligatoriu"),
  email: z.string().email("Email invalid"),
  roles: z.array(z.enum(["TEACHER", "HOMEROOM"])).min(1, "Selectați cel puțin un rol"),
});

const updateSchema = z.object({
  firstName: z.string().min(1, "Prenumele este obligatoriu"),
  lastName: z.string().min(1, "Numele este obligatoriu"),
  email: z.string().email("Email invalid"),
});

async function getSessionCtx() {
  const session = await auth();
  if (!session?.user) return null;
  const schoolId = (session as { schoolId?: string }).schoolId;
  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!schoolId) return null;
  return { schoolId, roles };
}

const createSchemaWithSubjects = createSchema.extend({
  subjectIds: z.array(z.string().uuid()).optional(),
});

export async function createTeacher(data: unknown) {
  const ctx = await getSessionCtx();
  if (!ctx) return { success: false, error: "Neautentificat" };

  if (!(await can(ctx.roles, "class", "create"))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const parsed = createSchemaWithSubjects.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { firstName, lastName, email, roles: roleCodes, subjectIds } = parsed.data;
  const tempPassword = randomBytes(8).toString("base64url");
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  try {
    await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(appUser)
        .values({
          firstName: normalizeDiacritics(firstName),
          lastName: normalizeDiacritics(lastName),
          email: email.toLowerCase().trim(),
          passwordHash,
          mustChangeOnLogin: true,
          isActive: true,
        })
        .returning({ id: appUser.id });

      const [membership] = await tx
        .insert(schoolMembership)
        .values({ schoolId: ctx.schoolId, userId: user.id, isActive: true })
        .returning({ id: schoolMembership.id });

      const roleRows = await tx
        .select({ id: role.id })
        .from(role)
        .where(inArray(role.code, roleCodes));

      for (const r of roleRows) {
        await tx.insert(userRole).values({ membershipId: membership.id, roleId: r.id });
      }

      if (subjectIds && subjectIds.length > 0) {
        await tx.insert(teacherSubject).values(
          subjectIds.map((sid) => ({
            schoolId: ctx.schoolId,
            teacherUserId: user.id,
            subjectId: sid,
          }))
        );
      }
    });

    revalidatePath("/admin/profesori");
    return { success: true, password: tempPassword };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return { success: false, error: "Există deja un cont cu acest email" };
    }
    return { success: false, error: "Eroare la creare" };
  }
}

export async function updateTeacherSubjects(teacherUserId: string, subjectIds: string[]) {
  const ctx = await getSessionCtx();
  if (!ctx) return { success: false, error: "Neautentificat" };

  if (!(await can(ctx.roles, "class", "create"))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(teacherSubject)
      .where(
        and(
          eq(teacherSubject.teacherUserId, teacherUserId),
          eq(teacherSubject.schoolId, ctx.schoolId)
        )
      );

    if (subjectIds.length > 0) {
      await tx.insert(teacherSubject).values(
        subjectIds.map((sid) => ({
          schoolId: ctx.schoolId,
          teacherUserId,
          subjectId: sid,
        }))
      );
    }
  });

  revalidatePath(`/admin/profesori/${teacherUserId}`);
  return { success: true };
}

export async function toggleTeacherSubject(teacherUserId: string, subjectId: string, add: boolean) {
  const ctx = await getSessionCtx();
  if (!ctx) return { success: false, error: "Neautentificat" };

  if (!(await can(ctx.roles, "class", "create"))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  if (add) {
    await db
      .insert(teacherSubject)
      .values({ schoolId: ctx.schoolId, teacherUserId, subjectId })
      .onConflictDoNothing();
  } else {
    await db
      .delete(teacherSubject)
      .where(
        and(
          eq(teacherSubject.teacherUserId, teacherUserId),
          eq(teacherSubject.subjectId, subjectId),
          eq(teacherSubject.schoolId, ctx.schoolId)
        )
      );
  }

  revalidatePath(`/admin/profesori/${teacherUserId}`);
  return { success: true };
}

export async function addRoleToTeacher(teacherId: string, roleCode: "HOMEROOM") {
  const ctx = await getSessionCtx();
  if (!ctx) return { success: false, error: "Neautentificat" };

  if (!(await can(ctx.roles, "class", "create"))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const [membership] = await db
    .select({ id: schoolMembership.id })
    .from(schoolMembership)
    .where(
      and(
        eq(schoolMembership.userId, teacherId),
        eq(schoolMembership.schoolId, ctx.schoolId),
        eq(schoolMembership.isActive, true)
      )
    )
    .limit(1);

  if (!membership) return { success: false, error: "Profesorul nu a fost găsit" };

  const [roleRow] = await db
    .select({ id: role.id })
    .from(role)
    .where(eq(role.code, roleCode))
    .limit(1);

  if (!roleRow) return { success: false, error: "Rolul nu a fost găsit" };

  await db
    .insert(userRole)
    .values({ membershipId: membership.id, roleId: roleRow.id })
    .onConflictDoNothing();

  revalidatePath("/admin/profesori");
  revalidatePath(`/admin/profesori/${teacherId}`);
  return { success: true };
}

export async function removeRoleFromTeacher(teacherId: string, roleCode: "HOMEROOM") {
  const ctx = await getSessionCtx();
  if (!ctx) return { success: false, error: "Neautentificat" };

  if (!(await can(ctx.roles, "class", "create"))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const [membership] = await db
    .select({ id: schoolMembership.id })
    .from(schoolMembership)
    .where(
      and(
        eq(schoolMembership.userId, teacherId),
        eq(schoolMembership.schoolId, ctx.schoolId),
        eq(schoolMembership.isActive, true)
      )
    )
    .limit(1);

  if (!membership) return { success: false, error: "Profesorul nu a fost găsit" };

  const [roleRow] = await db
    .select({ id: role.id })
    .from(role)
    .where(eq(role.code, roleCode))
    .limit(1);

  if (!roleRow) return { success: false, error: "Rolul nu a fost găsit" };

  await db
    .delete(userRole)
    .where(
      and(
        eq(userRole.membershipId, membership.id),
        eq(userRole.roleId, roleRow.id)
      )
    );

  revalidatePath("/admin/profesori");
  revalidatePath(`/admin/profesori/${teacherId}`);
  return { success: true };
}

export async function updateTeacher(id: string, data: unknown) {
  const ctx = await getSessionCtx();
  if (!ctx) return { success: false, error: "Neautentificat" };

  if (!(await can(ctx.roles, "class", "create"))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const parsed = updateSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // Verify teacher belongs to this school
  const [membership] = await db
    .select({ id: schoolMembership.id })
    .from(schoolMembership)
    .where(
      and(
        eq(schoolMembership.userId, id),
        eq(schoolMembership.schoolId, ctx.schoolId),
        eq(schoolMembership.isActive, true)
      )
    )
    .limit(1);

  if (!membership) return { success: false, error: "Profesorul nu a fost găsit" };

  try {
    await db
      .update(appUser)
      .set({
        firstName: normalizeDiacritics(parsed.data.firstName),
        lastName: normalizeDiacritics(parsed.data.lastName),
        email: parsed.data.email.toLowerCase().trim(),
        updatedAt: new Date(),
      })
      .where(eq(appUser.id, id));

    revalidatePath("/admin/profesori");
    revalidatePath(`/admin/profesori/${id}`);
    return { success: true };
  } catch {
    return { success: false, error: "Eroare la actualizare" };
  }
}
