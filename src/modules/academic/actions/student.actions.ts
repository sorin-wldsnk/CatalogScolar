"use server";

import { db } from "@/db";
import { student, enrollment, appUser, schoolMembership, userRole, role, studentGuardian } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { can } from "@/lib/casbin";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { normalizeDiacritics } from "@/lib/diacritics";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const studentSchema = z.object({
  firstName: z.string().min(1, "Prenumele este obligatoriu"),
  lastName: z.string().min(1, "Numele este obligatoriu"),
  dateOfBirth: z.string().optional().nullable(),
  personalId: z.string().optional().nullable(),
  classId: z.string().uuid().optional().nullable(),
  academicYearId: z.string().uuid().optional().nullable(),
  // optional parent fields
  parentFirstName: z.string().optional().nullable(),
  parentLastName: z.string().optional().nullable(),
  parentEmail: z.string().email("Email părinte invalid").optional().or(z.literal("")).nullable(),
  parentPhone: z.string().optional().nullable(),
  parentRelationship: z.enum(["PARENT", "GRANDPARENT", "LEGAL_GUARDIAN", "OTHER"]).optional().nullable(),
});

async function getSessionCtx() {
  const session = await auth();
  if (!session?.user) return null;
  const schoolId = (session as { schoolId?: string }).schoolId;
  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!schoolId) return null;
  return { schoolId, roles };
}

export async function createStudent(data: unknown) {
  const ctx = await getSessionCtx();
  if (!ctx) return { success: false, error: "Neautentificat" };

  if (!(await can(ctx.roles, "student", "create" as never))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const parsed = studentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { classId, academicYearId, parentEmail, parentFirstName, parentLastName, parentPhone, parentRelationship } = parsed.data;
  const hasParent = !!(parentEmail && parentEmail.trim());

  try {
    const result = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(student)
        .values({
          schoolId: ctx.schoolId,
          firstName: normalizeDiacritics(parsed.data.firstName),
          lastName: normalizeDiacritics(parsed.data.lastName),
          dateOfBirth: parsed.data.dateOfBirth || null,
          personalId: parsed.data.personalId?.trim() || null,
          status: "ACTIVE",
        })
        .returning();

      if (classId && academicYearId) {
        const today = new Date().toISOString().split("T")[0];
        await tx
          .insert(enrollment)
          .values({
            schoolId: ctx.schoolId,
            studentId: inserted.id,
            classId,
            academicYearId,
            enrolledAt: today,
            status: "ACTIVE",
          })
          .onConflictDoNothing();
      }

      let tempPassword: string | undefined;

      if (hasParent) {
        tempPassword = randomBytes(8).toString("base64url");
        const passwordHash = await bcrypt.hash(tempPassword, 12);

        const [parentUser] = await tx
          .insert(appUser)
          .values({
            firstName: normalizeDiacritics(parentFirstName?.trim() || "Tutore"),
            lastName: normalizeDiacritics(parentLastName?.trim() || ""),
            email: parentEmail!.toLowerCase().trim(),
            passwordHash,
            phone: parentPhone?.trim() || null,
            mustChangeOnLogin: true,
            isActive: true,
          })
          .returning({ id: appUser.id });

        const [membership] = await tx
          .insert(schoolMembership)
          .values({ schoolId: ctx.schoolId, userId: parentUser.id, isActive: true })
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
          studentId: inserted.id,
          guardianUserId: parentUser.id,
          relationship: parentRelationship ?? "PARENT",
          isPrimary: true,
        });
      }

      return { student: inserted, tempPassword };
    });

    revalidatePath("/admin/elevi");
    return { success: true, data: result.student, parentPassword: result.tempPassword };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return { success: false, error: "Există deja un cont cu acest email" };
    }
    return { success: false, error: "Eroare la creare" };
  }
}

export async function updateStudent(id: string, data: unknown) {
  const ctx = await getSessionCtx();
  if (!ctx) return { success: false, error: "Neautentificat" };

  if (!(await can(ctx.roles, "student", "create" as never))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const updateSchema = z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    dateOfBirth: z.string().optional().nullable(),
    personalId: z.string().optional().nullable(),
  });

  const parsed = updateSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const updateData: Record<string, unknown> = {
    dateOfBirth: parsed.data.dateOfBirth || null,
    personalId: parsed.data.personalId?.trim() || null,
    updatedAt: new Date(),
  };
  if (parsed.data.firstName) updateData.firstName = normalizeDiacritics(parsed.data.firstName);
  if (parsed.data.lastName) updateData.lastName = normalizeDiacritics(parsed.data.lastName);

  const [s] = await db
    .update(student)
    .set(updateData)
    .where(and(eq(student.id, id), eq(student.schoolId, ctx.schoolId)))
    .returning();

  revalidatePath("/admin/elevi");
  return { success: true, data: s };
}

export async function enrollStudent(
  studentId: string,
  classId: string,
  academicYearId: string
) {
  const ctx = await getSessionCtx();
  if (!ctx) return { success: false, error: "Neautentificat" };

  if (!(await can(ctx.roles, "enrollment", "create" as never))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const today = new Date().toISOString().split("T")[0];
  const [e] = await db
    .insert(enrollment)
    .values({
      schoolId: ctx.schoolId,
      studentId,
      classId,
      academicYearId,
      enrolledAt: today,
      status: "ACTIVE",
    })
    .onConflictDoNothing()
    .returning();

  revalidatePath("/admin/elevi");
  return { success: true, data: e };
}

export async function updateStudentStatus(id: string, status: string) {
  const ctx = await getSessionCtx();
  if (!ctx) return { success: false, error: "Neautentificat" };

  if (!(await can(ctx.roles, "student", "create" as never))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  await db
    .update(student)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(student.id, id), eq(student.schoolId, ctx.schoolId)));

  revalidatePath("/admin/elevi");
  return { success: true };
}

export async function unenrollStudent(enrollmentId: string, classId: string) {
  const ctx = await getSessionCtx();
  if (!ctx) return { success: false, error: "Neautentificat" };

  if (!(await can(ctx.roles, "enrollment", "create" as never))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  await db
    .update(enrollment)
    .set({ status: "WITHDRAWN", updatedAt: new Date() })
    .where(and(eq(enrollment.id, enrollmentId), eq(enrollment.schoolId, ctx.schoolId)));

  revalidatePath("/admin/elevi");
  revalidatePath(`/admin/clase/${classId}`);
  return { success: true };
}

export async function transferStudent(
  enrollmentId: string,
  newClassId: string,
  currentClassId: string,
  academicYearId: string
) {
  const ctx = await getSessionCtx();
  if (!ctx) return { success: false, error: "Neautentificat" };

  if (!(await can(ctx.roles, "enrollment", "create" as never))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const [existing] = await db
    .select()
    .from(enrollment)
    .where(and(eq(enrollment.id, enrollmentId), eq(enrollment.schoolId, ctx.schoolId)))
    .limit(1);

  if (!existing) return { success: false, error: "Înscrierea nu a fost găsită" };

  const today = new Date().toISOString().split("T")[0];

  await db.transaction(async (tx) => {
    await tx
      .update(enrollment)
      .set({ status: "TRANSFERRED", updatedAt: new Date() })
      .where(eq(enrollment.id, enrollmentId));

    await tx
      .insert(enrollment)
      .values({
        schoolId: ctx.schoolId,
        studentId: existing.studentId,
        classId: newClassId,
        academicYearId,
        enrolledAt: today,
        status: "ACTIVE",
      })
      .onConflictDoNothing();
  });

  revalidatePath("/admin/elevi");
  revalidatePath(`/admin/clase/${currentClassId}`);
  revalidatePath(`/admin/clase/${newClassId}`);
  return { success: true };
}

export async function withdrawStudent(enrollmentId: string, studentId: string, classId: string) {
  const ctx = await getSessionCtx();
  if (!ctx) return { success: false, error: "Neautentificat" };

  if (!(await can(ctx.roles, "enrollment", "create" as never))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(enrollment)
      .set({ status: "WITHDRAWN", updatedAt: new Date() })
      .where(and(eq(enrollment.id, enrollmentId), eq(enrollment.schoolId, ctx.schoolId)));

    await tx
      .update(student)
      .set({ status: "WITHDRAWN", updatedAt: new Date() })
      .where(and(eq(student.id, studentId), eq(student.schoolId, ctx.schoolId)));
  });

  revalidatePath("/admin/elevi");
  revalidatePath(`/admin/clase/${classId}`);
  return { success: true };
}
