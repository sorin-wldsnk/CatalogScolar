import { db } from "@/db";
import { student, enrollment, classGroup } from "@/db/schema";
import { eq, and, ilike, or } from "drizzle-orm";

interface StudentFilters {
  classId?: string;
  academicYearId?: string;
  status?: string;
  search?: string;
}

export async function getStudents(schoolId: string, filters: StudentFilters = {}) {
  const conditions = [eq(student.schoolId, schoolId)];

  if (filters.status) {
    conditions.push(eq(student.status, filters.status));
  }

  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(ilike(student.firstName, term), ilike(student.lastName, term))!
    );
  }

  if (filters.classId && filters.academicYearId) {
    return db
      .select({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        dateOfBirth: student.dateOfBirth,
        personalId: student.personalId,
        status: student.status,
        enrollmentId: enrollment.id,
        enrollmentStatus: enrollment.status,
        classId: enrollment.classId,
        className: classGroup.name,
      })
      .from(student)
      .innerJoin(
        enrollment,
        and(
          eq(enrollment.studentId, student.id),
          eq(enrollment.classId, filters.classId),
          eq(enrollment.academicYearId, filters.academicYearId)
        )
      )
      .innerJoin(classGroup, eq(enrollment.classId, classGroup.id))
      .where(and(...conditions))
      .orderBy(student.lastName, student.firstName);
  }

  if (filters.academicYearId) {
    return db
      .select({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        dateOfBirth: student.dateOfBirth,
        personalId: student.personalId,
        status: student.status,
        enrollmentId: enrollment.id,
        enrollmentStatus: enrollment.status,
        classId: enrollment.classId,
        className: classGroup.name,
      })
      .from(student)
      .innerJoin(
        enrollment,
        and(
          eq(enrollment.studentId, student.id),
          eq(enrollment.academicYearId, filters.academicYearId)
        )
      )
      .innerJoin(classGroup, eq(enrollment.classId, classGroup.id))
      .where(and(...conditions))
      .orderBy(student.lastName, student.firstName);
  }

  return db
    .select()
    .from(student)
    .where(and(...conditions))
    .orderBy(student.lastName, student.firstName);
}

export async function getStudentById(id: string, schoolId: string) {
  const [s] = await db
    .select()
    .from(student)
    .where(and(eq(student.id, id), eq(student.schoolId, schoolId)))
    .limit(1);
  return s ?? null;
}

export async function getStudentWithEnrollment(studentId: string, academicYearId: string) {
  const [result] = await db
    .select({
      student,
      enrollment,
      class: classGroup,
    })
    .from(student)
    .leftJoin(
      enrollment,
      and(
        eq(enrollment.studentId, student.id),
        eq(enrollment.academicYearId, academicYearId)
      )
    )
    .leftJoin(classGroup, eq(enrollment.classId, classGroup.id))
    .where(eq(student.id, studentId))
    .limit(1);
  return result ?? null;
}
