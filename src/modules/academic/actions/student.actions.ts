"use server";

import { db } from "@/db";
import { student, enrollment } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { can } from "@/lib/casbin";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { normalizeDiacritics } from "@/lib/diacritics";

const studentSchema = z.object({
  firstName: z.string().min(1, "Prenumele este obligatoriu"),
  lastName: z.string().min(1, "Numele este obligatoriu"),
  dateOfBirth: z.string().optional().nullable(),
  personalId: z.string().optional().nullable(),
  classId: z.string().uuid().optional().nullable(),
  academicYearId: z.string().uuid().optional().nullable(),
});

export async function createStudent(data: unknown) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Neautentificat" };

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "student", "create" as never))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const parsed = studentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) return { success: false, error: "Școala nu a fost găsită" };

  const { classId, academicYearId } = parsed.data;

  const s = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(student)
      .values({
        schoolId,
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
          schoolId,
          studentId: inserted.id,
          classId,
          academicYearId,
          enrolledAt: today,
          status: "ACTIVE",
        })
        .onConflictDoNothing();
    }

    return inserted;
  });

  revalidatePath("/admin/elevi");
  return { success: true, data: s };
}

export async function updateStudent(id: string, data: unknown) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Neautentificat" };

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "student", "create" as never))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const parsed = studentSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) return { success: false, error: "Școala nu a fost găsită" };

  const updateData: Partial<typeof parsed.data & { updatedAt: Date }> = {
    ...parsed.data,
    dateOfBirth: parsed.data.dateOfBirth || null,
    personalId: parsed.data.personalId?.trim() || null,
    updatedAt: new Date(),
  };
  if (parsed.data.firstName) updateData.firstName = normalizeDiacritics(parsed.data.firstName);
  if (parsed.data.lastName) updateData.lastName = normalizeDiacritics(parsed.data.lastName);

  const [s] = await db
    .update(student)
    .set(updateData)
    .where(and(eq(student.id, id), eq(student.schoolId, schoolId)))
    .returning();

  revalidatePath("/admin/elevi");
  return { success: true, data: s };
}

export async function enrollStudent(
  studentId: string,
  classId: string,
  academicYearId: string
) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Neautentificat" };

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "enrollment", "create" as never))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) return { success: false, error: "Școala nu a fost găsită" };

  const today = new Date().toISOString().split("T")[0];
  const [e] = await db
    .insert(enrollment)
    .values({
      schoolId,
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
  const session = await auth();
  if (!session?.user) return { success: false, error: "Neautentificat" };

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "student", "create" as never))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) return { success: false, error: "Școala nu a fost găsită" };

  await db
    .update(student)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(student.id, id), eq(student.schoolId, schoolId)));

  revalidatePath("/admin/elevi");
  return { success: true };
}

export async function unenrollStudent(enrollmentId: string, classId: string) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Neautentificat" };

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "enrollment", "create" as never))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) return { success: false, error: "Școala nu a fost găsită" };

  await db
    .update(enrollment)
    .set({ status: "WITHDRAWN", updatedAt: new Date() })
    .where(and(eq(enrollment.id, enrollmentId), eq(enrollment.schoolId, schoolId)));

  revalidatePath("/admin/elevi");
  revalidatePath(`/admin/clase/${classId}`);
  return { success: true };
}
