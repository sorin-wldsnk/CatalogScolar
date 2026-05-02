import { db } from "@/db";
import { teachingAssignment, appUser, classGroup, subject } from "@/db/schema";
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
