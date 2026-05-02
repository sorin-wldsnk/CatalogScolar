import { db } from "@/db";
import { grade, subject, appUser, enrollment, classGroup } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function getGradesForEnrollment(enrollmentId: string, semester?: number) {
  const conditions = [eq(grade.enrollmentId, enrollmentId)];
  if (semester) conditions.push(eq(grade.semester, semester));

  return db
    .select({
      id: grade.id,
      subjectId: grade.subjectId,
      subjectName: subject.name,
      subjectCode: subject.code,
      teacherUserId: grade.teacherUserId,
      teacherFirstName: appUser.firstName,
      teacherLastName: appUser.lastName,
      semester: grade.semester,
      valueNumeric: grade.valueNumeric,
      valueQualitative: grade.valueQualitative,
      gradeType: grade.gradeType,
      weight: grade.weight,
      notes: grade.notes,
      gradedAt: grade.gradedAt,
    })
    .from(grade)
    .innerJoin(subject, eq(grade.subjectId, subject.id))
    .innerJoin(appUser, eq(grade.teacherUserId, appUser.id))
    .where(and(...conditions))
    .orderBy(grade.gradedAt, subject.name);
}

export async function getGradesForClass(
  classId: string,
  subjectId: string,
  academicYearId: string,
  semester?: number
) {
  const conditions = [
    eq(grade.subjectId, subjectId),
    eq(grade.academicYearId, academicYearId),
    eq(enrollment.classId, classId),
  ];
  if (semester) conditions.push(eq(grade.semester, semester));

  return db
    .select({
      id: grade.id,
      enrollmentId: grade.enrollmentId,
      studentFirstName: appUser.firstName,
      studentLastName: appUser.lastName,
      semester: grade.semester,
      valueNumeric: grade.valueNumeric,
      valueQualitative: grade.valueQualitative,
      gradeType: grade.gradeType,
      weight: grade.weight,
      gradedAt: grade.gradedAt,
    })
    .from(grade)
    .innerJoin(enrollment, eq(grade.enrollmentId, enrollment.id))
    .innerJoin(appUser, eq(enrollment.studentId, appUser.id))
    .where(and(...conditions))
    .orderBy(appUser.lastName, appUser.firstName, grade.gradedAt);
}

export async function getGradesByTeacher(teacherUserId: string, academicYearId: string) {
  return db
    .select({
      id: grade.id,
      enrollmentId: grade.enrollmentId,
      subjectId: grade.subjectId,
      subjectName: subject.name,
      className: classGroup.name,
      semester: grade.semester,
      valueNumeric: grade.valueNumeric,
      valueQualitative: grade.valueQualitative,
      gradeType: grade.gradeType,
      weight: grade.weight,
      gradedAt: grade.gradedAt,
    })
    .from(grade)
    .innerJoin(subject, eq(grade.subjectId, subject.id))
    .innerJoin(enrollment, eq(grade.enrollmentId, enrollment.id))
    .innerJoin(classGroup, eq(enrollment.classId, classGroup.id))
    .where(
      and(
        eq(grade.teacherUserId, teacherUserId),
        eq(grade.academicYearId, academicYearId)
      )
    )
    .orderBy(classGroup.name, subject.name, grade.gradedAt);
}
