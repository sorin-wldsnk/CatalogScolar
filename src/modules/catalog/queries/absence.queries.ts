import { db } from "@/db";
import { absence, subject, appUser, enrollment, classGroup } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function getAbsencesForEnrollment(enrollmentId: string, semester?: number) {
  const conditions = [eq(absence.enrollmentId, enrollmentId)];
  if (semester) conditions.push(eq(absence.semester, semester));

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
    .where(and(...conditions))
    .orderBy(absence.absentDate, subject.name);
}

export async function getAbsencesForClass(
  classId: string,
  academicYearId: string,
  semester?: number
) {
  const conditions = [
    eq(absence.academicYearId, academicYearId),
    eq(enrollment.classId, classId),
  ];
  if (semester) conditions.push(eq(absence.semester, semester));

  return db
    .select({
      id: absence.id,
      enrollmentId: absence.enrollmentId,
      studentFirstName: appUser.firstName,
      studentLastName: appUser.lastName,
      subjectName: subject.name,
      semester: absence.semester,
      absentDate: absence.absentDate,
      period: absence.period,
      status: absence.status,
    })
    .from(absence)
    .innerJoin(enrollment, eq(absence.enrollmentId, enrollment.id))
    .innerJoin(appUser, eq(enrollment.studentId, appUser.id))
    .innerJoin(subject, eq(absence.subjectId, subject.id))
    .where(and(...conditions))
    .orderBy(appUser.lastName, absence.absentDate);
}

export async function getPendingExcuses(classId: string, academicYearId: string) {
  return db
    .select({
      id: absence.id,
      enrollmentId: absence.enrollmentId,
      studentFirstName: appUser.firstName,
      studentLastName: appUser.lastName,
      subjectName: subject.name,
      absentDate: absence.absentDate,
      period: absence.period,
    })
    .from(absence)
    .innerJoin(enrollment, eq(absence.enrollmentId, enrollment.id))
    .innerJoin(appUser, eq(enrollment.studentId, appUser.id))
    .innerJoin(subject, eq(absence.subjectId, subject.id))
    .where(
      and(
        eq(enrollment.classId, classId),
        eq(absence.academicYearId, academicYearId),
        eq(absence.status, "PENDING_EXCUSE")
      )
    )
    .orderBy(absence.absentDate);
}
