import { db } from "@/db";
import { teachingAssignment, appUser, classGroup, subject, academicYear } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function getAssignmentsForClass(classId: string, academicYearId: string) {
  return db
    .select({
      id: teachingAssignment.id,
      teacherUserId: teachingAssignment.teacherUserId,
      teacherName: appUser.firstName,
      teacherLastName: appUser.lastName,
      subjectId: teachingAssignment.subjectId,
      subjectName: subject.name,
      subjectCode: subject.code,
    })
    .from(teachingAssignment)
    .innerJoin(appUser, eq(teachingAssignment.teacherUserId, appUser.id))
    .innerJoin(subject, eq(teachingAssignment.subjectId, subject.id))
    .where(
      and(
        eq(teachingAssignment.classId, classId),
        eq(teachingAssignment.academicYearId, academicYearId)
      )
    )
    .orderBy(subject.name);
}

export async function getAssignmentsForTeacher(
  teacherUserId: string,
  academicYearId: string
) {
  return db
    .select({
      id: teachingAssignment.id,
      classId: teachingAssignment.classId,
      className: classGroup.name,
      gradeLevel: classGroup.gradeLevel,
      subjectId: teachingAssignment.subjectId,
      subjectName: subject.name,
      subjectCode: subject.code,
    })
    .from(teachingAssignment)
    .innerJoin(classGroup, eq(teachingAssignment.classId, classGroup.id))
    .innerJoin(subject, eq(teachingAssignment.subjectId, subject.id))
    .where(
      and(
        eq(teachingAssignment.teacherUserId, teacherUserId),
        eq(teachingAssignment.academicYearId, academicYearId)
      )
    )
    .orderBy(classGroup.gradeLevel, classGroup.name, subject.name);
}

export async function getAssignmentsAll(schoolId: string, academicYearId: string) {
  return db
    .select({
      id: teachingAssignment.id,
      teacherUserId: teachingAssignment.teacherUserId,
      teacherFirstName: appUser.firstName,
      teacherLastName: appUser.lastName,
      classId: teachingAssignment.classId,
      className: classGroup.name,
      gradeLevel: classGroup.gradeLevel,
      subjectId: teachingAssignment.subjectId,
      subjectName: subject.name,
      subjectCode: subject.code,
    })
    .from(teachingAssignment)
    .innerJoin(appUser, eq(teachingAssignment.teacherUserId, appUser.id))
    .innerJoin(classGroup, eq(teachingAssignment.classId, classGroup.id))
    .innerJoin(subject, eq(teachingAssignment.subjectId, subject.id))
    .where(
      and(
        eq(teachingAssignment.schoolId, schoolId),
        eq(teachingAssignment.academicYearId, academicYearId)
      )
    )
    .orderBy(classGroup.gradeLevel, classGroup.name, subject.name);
}

export async function getClassSubjectMatrix(
  classId: string,
  academicYearId: string,
  schoolId: string
) {
  return db
    .select({
      subjectId: subject.id,
      subjectName: subject.name,
      subjectCode: subject.code,
      assignmentId: teachingAssignment.id,
      teacherUserId: teachingAssignment.teacherUserId,
      teacherFirstName: appUser.firstName,
      teacherLastName: appUser.lastName,
    })
    .from(subject)
    .leftJoin(
      teachingAssignment,
      and(
        eq(teachingAssignment.subjectId, subject.id),
        eq(teachingAssignment.classId, classId),
        eq(teachingAssignment.academicYearId, academicYearId)
      )
    )
    .leftJoin(appUser, eq(appUser.id, teachingAssignment.teacherUserId))
    .where(eq(subject.schoolId, schoolId))
    .orderBy(subject.name);
}

export async function getAssignmentsFiltered(
  schoolId: string,
  academicYearId: string,
  filters: { teacherUserId?: string; classId?: string; subjectId?: string }
) {
  const conditions = [
    eq(teachingAssignment.schoolId, schoolId),
    eq(teachingAssignment.academicYearId, academicYearId),
  ];
  if (filters.teacherUserId) conditions.push(eq(teachingAssignment.teacherUserId, filters.teacherUserId));
  if (filters.classId) conditions.push(eq(teachingAssignment.classId, filters.classId));
  if (filters.subjectId) conditions.push(eq(teachingAssignment.subjectId, filters.subjectId));

  return db
    .select({
      id: teachingAssignment.id,
      teacherFirstName: appUser.firstName,
      teacherLastName: appUser.lastName,
      className: classGroup.name,
      gradeLevel: classGroup.gradeLevel,
      subjectName: subject.name,
      subjectCode: subject.code,
      academicYearName: academicYear.name,
    })
    .from(teachingAssignment)
    .innerJoin(appUser, eq(teachingAssignment.teacherUserId, appUser.id))
    .innerJoin(classGroup, eq(teachingAssignment.classId, classGroup.id))
    .innerJoin(subject, eq(teachingAssignment.subjectId, subject.id))
    .innerJoin(academicYear, eq(teachingAssignment.academicYearId, academicYear.id))
    .where(and(...conditions))
    .orderBy(classGroup.gradeLevel, classGroup.name, subject.name);
}
