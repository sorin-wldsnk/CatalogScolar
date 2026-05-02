"use server";

import { db } from "@/db";
import { appUser, schoolMembership, userRole, role, studentGuardian } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { can } from "@/lib/casbin";
import { normalizeDiacritics } from "@/lib/diacritics";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const createSchema = z.object({
  studentId: z.string().uuid(),
  firstName: z.string().min(1, "Prenumele este obligatoriu"),
  lastName: z.string().min(1, "Numele este obligatoriu"),
  email: z.string().email("Email invalid"),
  relationship: z.enum(["PARENT", "GRANDPARENT", "LEGAL_GUARDIAN", "OTHER"]).default("PARENT"),
});

async function getSessionCtx() {
  const session = await auth();
  if (!session?.user) return null;
  const schoolId = (session as { schoolId?: string }).schoolId;
  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!schoolId) return null;
  return { schoolId, roles };
}

export async function fetchStudentGuardians(studentId: string) {
  const ctx = await getSessionCtx();
  if (!ctx) return { success: false, error: "Neautentificat", data: [] };

  const rows = await db
    .select({
      id: studentGuardian.id,
      relationship: studentGuardian.relationship,
      isPrimary: studentGuardian.isPrimary,
      userId: appUser.id,
      firstName: appUser.firstName,
      lastName: appUser.lastName,
      email: appUser.email,
      mustChangeOnLogin: appUser.mustChangeOnLogin,
    })
    .from(studentGuardian)
    .innerJoin(appUser, eq(studentGuardian.guardianUserId, appUser.id))
    .where(
      and(
        eq(studentGuardian.studentId, studentId),
        eq(studentGuardian.schoolId, ctx.schoolId)
      )
    )
    .orderBy(studentGuardian.isPrimary, appUser.lastName);

  return { success: true, data: rows };
}

export async function createParent(data: unknown) {
  const ctx = await getSessionCtx();
  if (!ctx) return { success: false, error: "Neautentificat" };

  if (!(await can(ctx.roles, "class", "create"))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const parsed = createSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { studentId, firstName, lastName, email, relationship } = parsed.data;
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

      const [parentRole] = await tx
        .select({ id: role.id })
        .from(role)
        .where(eq(role.code, "PARENT"))
        .limit(1);

      if (parentRole) {
        await tx.insert(userRole).values({ membershipId: membership.id, roleId: parentRole.id });
      }

      await tx.insert(studentGuardian).values({
        schoolId: ctx.schoolId,
        studentId,
        guardianUserId: user.id,
        relationship,
        isPrimary: true,
      });
    });

    revalidatePath("/admin/elevi");
    return { success: true, password: tempPassword };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return { success: false, error: "Există deja un cont cu acest email sau tutorele e deja adăugat" };
    }
    return { success: false, error: "Eroare la creare" };
  }
}
