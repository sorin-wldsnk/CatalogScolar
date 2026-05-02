"use server";

import { db } from "@/db";
import { academicYear, classGroup, enrollment, student, teachingAssignment } from "@/db/schema";
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

export async function previewCloseAcademicYear(activeYearId: string) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Neautentificat" };

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "class", "create"))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) return { success: false, error: "Școala nu a fost găsită" };

  const classes = await db
    .select({ id: classGroup.id, gradeLevel: classGroup.gradeLevel, name: classGroup.name })
    .from(classGroup)
    .where(and(eq(classGroup.schoolId, schoolId), eq(classGroup.academicYearId, activeYearId)));

  const promotableClasses = classes.filter((c) => c.gradeLevel < 8).length;
  const graduatingClasses = classes.filter((c) => c.gradeLevel === 8).length;

  const activeEnrollments = await db
    .select({ id: enrollment.id, classId: enrollment.classId })
    .from(enrollment)
    .where(
      and(
        eq(enrollment.academicYearId, activeYearId),
        eq(enrollment.status, "ACTIVE"),
        eq(enrollment.schoolId, schoolId)
      )
    );

  const graduatingClassIds = new Set(
    classes.filter((c) => c.gradeLevel === 8).map((c) => c.id)
  );
  const promotedCount = activeEnrollments.filter(
    (e) => !graduatingClassIds.has(e.classId)
  ).length;
  const graduatesCount = activeEnrollments.filter(
    (e) => graduatingClassIds.has(e.classId)
  ).length;

  const assignments = await db
    .select({ id: teachingAssignment.id })
    .from(teachingAssignment)
    .where(
      and(
        eq(teachingAssignment.schoolId, schoolId),
        eq(teachingAssignment.academicYearId, activeYearId)
      )
    );

  const assignmentsToCopy = assignments.filter(() => {
    // All assignments except for grade 8 classes are copied
    return true;
  }).length - classes.filter((c) => c.gradeLevel === 8).length;

  return {
    success: true,
    preview: {
      promotedCount,
      graduatesCount,
      classesCopied: promotableClasses,
      graduatingClasses,
      assignmentsCopied: Math.max(0, assignmentsToCopy),
    },
  };
}

export async function closeAcademicYear(activeYearId: string, newYearName: string) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Neautentificat" };

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "class", "create"))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) return { success: false, error: "Școala nu a fost găsită" };

  if (!newYearName.trim()) return { success: false, error: "Introduceți numele noului an" };

  // Verify the year is active
  const [activeYear] = await db
    .select()
    .from(academicYear)
    .where(and(eq(academicYear.id, activeYearId), eq(academicYear.schoolId, schoolId), eq(academicYear.isActive, true)))
    .limit(1);

  if (!activeYear) return { success: false, error: "Anul selectat nu este activ" };

  const classes = await db
    .select({ id: classGroup.id, gradeLevel: classGroup.gradeLevel, name: classGroup.name })
    .from(classGroup)
    .where(and(eq(classGroup.schoolId, schoolId), eq(classGroup.academicYearId, activeYearId)));

  const activeEnrollments = await db
    .select({ id: enrollment.id, studentId: enrollment.studentId, classId: enrollment.classId })
    .from(enrollment)
    .where(
      and(
        eq(enrollment.academicYearId, activeYearId),
        eq(enrollment.status, "ACTIVE"),
        eq(enrollment.schoolId, schoolId)
      )
    );

  const existingAssignments = await db
    .select()
    .from(teachingAssignment)
    .where(
      and(
        eq(teachingAssignment.schoolId, schoolId),
        eq(teachingAssignment.academicYearId, activeYearId)
      )
    );

  const summary = { classesCopied: 0, promoted: 0, graduates: 0, assignmentsCopied: 0 };

  try {
    await db.transaction(async (tx) => {
      // Create new academic year
      const newYearStartDate = new Date(activeYear.endDate);
      newYearStartDate.setFullYear(newYearStartDate.getFullYear() + 1);
      const startStr = newYearStartDate.toISOString().split("T")[0];
      const endDate = new Date(newYearStartDate);
      endDate.setFullYear(endDate.getFullYear() + 1);
      const endStr = endDate.toISOString().split("T")[0];

      const [newYear] = await tx
        .insert(academicYear)
        .values({
          schoolId,
          name: newYearName.trim(),
          startDate: startStr,
          endDate: endStr,
          isActive: false,
        })
        .returning();

      // Map old classId → new classId
      const classIdMap = new Map<string, string>();

      for (const cls of classes) {
        if (cls.gradeLevel >= 8) continue; // skip graduating classes
        const [newClass] = await tx
          .insert(classGroup)
          .values({
            schoolId,
            academicYearId: newYear.id,
            name: cls.name,
            gradeLevel: (cls.gradeLevel + 1) as number,
          })
          .onConflictDoNothing()
          .returning();
        if (newClass) {
          classIdMap.set(cls.id, newClass.id);
          summary.classesCopied++;
        }
      }

      const graduatingClassIds = new Set(
        classes.filter((c) => c.gradeLevel === 8).map((c) => c.id)
      );

      // Promote / graduate students
      const today = new Date().toISOString().split("T")[0];
      for (const enroll of activeEnrollments) {
        if (graduatingClassIds.has(enroll.classId)) {
          // Graduate
          await tx
            .update(student)
            .set({ status: "GRADUATED", updatedAt: new Date() })
            .where(eq(student.id, enroll.studentId));
          summary.graduates++;
        } else {
          const newClassId = classIdMap.get(enroll.classId);
          if (!newClassId) continue;
          await tx
            .insert(enrollment)
            .values({
              schoolId,
              studentId: enroll.studentId,
              classId: newClassId,
              academicYearId: newYear.id,
              enrolledAt: today,
              status: "ACTIVE",
            })
            .onConflictDoNothing();
          summary.promoted++;
        }
      }

      // Copy teaching assignments (only for non-graduating classes)
      for (const assignment of existingAssignments) {
        const newClassId = classIdMap.get(assignment.classId);
        if (!newClassId) continue;
        await tx
          .insert(teachingAssignment)
          .values({
            schoolId,
            academicYearId: newYear.id,
            teacherUserId: assignment.teacherUserId,
            classId: newClassId,
            subjectId: assignment.subjectId,
          })
          .onConflictDoNothing();
        summary.assignmentsCopied++;
      }

      // Deactivate current year, activate new year
      await tx
        .update(academicYear)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(academicYear.id, activeYearId));

      await tx
        .update(academicYear)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(academicYear.id, newYear.id));
    });

    revalidatePath("/admin/ani-scolari");
    return { success: true, summary };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique")) return { success: false, error: "Există deja un an cu acest nume" };
    return { success: false, error: "Eroare la închiderea anului" };
  }
}
