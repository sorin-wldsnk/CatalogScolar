import { db } from "@/db";
import { enrollment, student, studentGuardian, appUser } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export type ClassParentRow = {
  studentId: string;
  studentName: string;
  guardianId: string | null;
  guardianUserId: string | null;
  parentName: string | null;
  email: string | null;
  phone: string | null;
  mustChangeOnLogin: boolean | null;
  hasAccount: boolean;
};

export async function getClassParents(
  classId: string,
  academicYearId: string,
  schoolId: string
): Promise<ClassParentRow[]> {
  const rows = await db
    .select({
      studentId: student.id,
      studentFirstName: student.firstName,
      studentLastName: student.lastName,
      guardianId: studentGuardian.id,
      guardianUserId: studentGuardian.guardianUserId,
      parentFirstName: appUser.firstName,
      parentLastName: appUser.lastName,
      email: appUser.email,
      phone: appUser.phone,
      mustChangeOnLogin: appUser.mustChangeOnLogin,
    })
    .from(enrollment)
    .innerJoin(student, eq(enrollment.studentId, student.id))
    .leftJoin(
      studentGuardian,
      and(
        eq(studentGuardian.studentId, student.id),
        eq(studentGuardian.schoolId, schoolId),
        eq(studentGuardian.isPrimary, true)
      )
    )
    .leftJoin(appUser, eq(studentGuardian.guardianUserId, appUser.id))
    .where(
      and(
        eq(enrollment.classId, classId),
        eq(enrollment.academicYearId, academicYearId),
        eq(enrollment.schoolId, schoolId),
        eq(enrollment.status, "ACTIVE")
      )
    )
    .orderBy(student.lastName, student.firstName);

  return rows.map((r) => ({
    studentId: r.studentId,
    studentName: `${r.studentLastName} ${r.studentFirstName}`,
    guardianId: r.guardianId,
    guardianUserId: r.guardianUserId,
    parentName: r.parentFirstName && r.parentLastName
      ? `${r.parentLastName} ${r.parentFirstName}`
      : null,
    email: r.email,
    phone: r.phone,
    mustChangeOnLogin: r.mustChangeOnLogin,
    hasAccount: !!r.guardianUserId,
  }));
}
