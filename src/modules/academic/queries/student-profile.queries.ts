import { db } from "@/db";
import { student, enrollment, classGroup, academicYear, grade, absence, subject, studentGuardian, appUser } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function getStudentProfile(studentId: string, schoolId: string) {
  const [row] = await db
    .select({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      personalId: student.personalId,
      dateOfBirth: student.dateOfBirth,
      status: student.status,
    })
    .from(student)
    .where(and(eq(student.id, studentId), eq(student.schoolId, schoolId)))
    .limit(1);
  return row ?? null;
}

export async function getStudentActiveEnrollment(studentId: string, schoolId: string, academicYearId: string) {
  const [row] = await db
    .select({
      enrollmentId: enrollment.id,
      classId: classGroup.id,
      className: classGroup.name,
      gradeLevel: classGroup.gradeLevel,
      academicYearId: academicYear.id,
      academicYearName: academicYear.name,
      status: enrollment.status,
    })
    .from(enrollment)
    .innerJoin(classGroup, eq(enrollment.classId, classGroup.id))
    .innerJoin(academicYear, eq(enrollment.academicYearId, academicYear.id))
    .where(
      and(
        eq(enrollment.studentId, studentId),
        eq(enrollment.academicYearId, academicYearId),
        eq(enrollment.schoolId, schoolId)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function getStudentGrades(enrollmentId: string) {
  return db
    .select({
      id: grade.id,
      subjectId: grade.subjectId,
      subjectName: subject.name,
      subjectCode: subject.code,
      semester: grade.semester,
      valueNumeric: grade.valueNumeric,
      valueQualitative: grade.valueQualitative,
      gradeType: grade.gradeType,
      weight: grade.weight,
      gradedAt: grade.gradedAt,
      notes: grade.notes,
    })
    .from(grade)
    .innerJoin(subject, eq(grade.subjectId, subject.id))
    .where(eq(grade.enrollmentId, enrollmentId))
    .orderBy(subject.name, grade.semester, grade.gradedAt);
}

export async function getStudentAbsences(enrollmentId: string) {
  return db
    .select({
      id: absence.id,
      subjectId: absence.subjectId,
      subjectName: subject.name,
      subjectCode: subject.code,
      semester: absence.semester,
      absentDate: absence.absentDate,
      period: absence.period,
      status: absence.status,
      excuseReason: absence.excuseReason,
      excusedAt: absence.excusedAt,
    })
    .from(absence)
    .innerJoin(subject, eq(absence.subjectId, subject.id))
    .where(eq(absence.enrollmentId, enrollmentId))
    .orderBy(absence.absentDate, subject.name);
}

export async function getStudentGuardians(studentId: string, schoolId: string) {
  return db
    .select({
      guardianUserId: studentGuardian.guardianUserId,
      relationship: studentGuardian.relationship,
      isPrimary: studentGuardian.isPrimary,
      firstName: appUser.firstName,
      lastName: appUser.lastName,
      email: appUser.email,
    })
    .from(studentGuardian)
    .innerJoin(appUser, eq(studentGuardian.guardianUserId, appUser.id))
    .where(
      and(
        eq(studentGuardian.studentId, studentId),
        eq(studentGuardian.schoolId, schoolId)
      )
    )
    .orderBy(studentGuardian.isPrimary);
}

export async function getStudentEnrollmentHistory(studentId: string, schoolId: string) {
  return db
    .select({
      enrollmentId: enrollment.id,
      classId: classGroup.id,
      className: classGroup.name,
      gradeLevel: classGroup.gradeLevel,
      academicYearId: academicYear.id,
      academicYearName: academicYear.name,
      status: enrollment.status,
      enrolledAt: enrollment.enrolledAt,
    })
    .from(enrollment)
    .innerJoin(classGroup, eq(enrollment.classId, classGroup.id))
    .innerJoin(academicYear, eq(enrollment.academicYearId, academicYear.id))
    .where(and(eq(enrollment.studentId, studentId), eq(enrollment.schoolId, schoolId)))
    .orderBy(academicYear.name);
}
