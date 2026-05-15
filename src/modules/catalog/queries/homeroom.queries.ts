import { db } from "@/db";
import { absence, enrollment, student, subject, appUser, classGroup, observation } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export type HomeroomClass = {
  id: string;
  name: string;
  gradeLevel: number;
  academicYearId: string;
};

export async function getHomeroomClass(
  teacherUserId: string,
  schoolId: string
): Promise<HomeroomClass | null> {
  const [row] = await db
    .select({
      id: classGroup.id,
      name: classGroup.name,
      gradeLevel: classGroup.gradeLevel,
      academicYearId: classGroup.academicYearId,
    })
    .from(classGroup)
    .where(
      and(
        eq(classGroup.homeroomTeacherId, teacherUserId),
        eq(classGroup.schoolId, schoolId)
      )
    )
    .limit(1);
  return row ?? null;
}

export type PendingAbsenceRow = {
  id: string;
  studentName: string;
  subjectName: string;
  teacherName: string;
  absentDate: string;
  period: number | null;
  status: string;
  enrollmentId: string;
};

export type ClassObservationRow = {
  id: string;
  studentName: string;
  teacherName: string;
  body: string;
  semester: number;
  isVisibleToParent: boolean | null;
  createdAt: Date | null;
};

export async function getHomeroomClassId(teacherUserId: string, schoolId: string): Promise<string | null> {
  const [cls] = await db
    .select({ id: classGroup.id })
    .from(classGroup)
    .where(
      and(
        eq(classGroup.homeroomTeacherId, teacherUserId),
        eq(classGroup.schoolId, schoolId)
      )
    )
    .limit(1);
  return cls?.id ?? null;
}

export async function getClassPendingAbsences(
  classId: string,
  academicYearId: string,
  semester: number,
  schoolId: string
): Promise<PendingAbsenceRow[]> {
  const rows = await db
    .select({
      id: absence.id,
      studentFirstName: student.firstName,
      studentLastName: student.lastName,
      subjectName: subject.name,
      teacherFirstName: appUser.firstName,
      teacherLastName: appUser.lastName,
      absentDate: absence.absentDate,
      period: absence.period,
      status: absence.status,
      enrollmentId: absence.enrollmentId,
    })
    .from(absence)
    .innerJoin(enrollment, eq(absence.enrollmentId, enrollment.id))
    .innerJoin(student, eq(enrollment.studentId, student.id))
    .innerJoin(subject, eq(absence.subjectId, subject.id))
    .innerJoin(appUser, eq(absence.teacherUserId, appUser.id))
    .where(
      and(
        eq(enrollment.classId, classId),
        eq(absence.academicYearId, academicYearId),
        eq(absence.semester, semester),
        eq(absence.schoolId, schoolId),
        eq(absence.status, "UNEXCUSED")
      )
    )
    .orderBy(absence.absentDate, student.lastName);

  return rows.map((r) => ({
    id: r.id,
    studentName: `${r.studentLastName} ${r.studentFirstName}`,
    subjectName: r.subjectName,
    teacherName: `${r.teacherLastName} ${r.teacherFirstName}`,
    absentDate: r.absentDate,
    period: r.period,
    status: r.status,
    enrollmentId: r.enrollmentId,
  }));
}

export async function getClassObservations(
  classId: string,
  academicYearId: string,
  semester: number,
  schoolId: string
): Promise<ClassObservationRow[]> {
  const rows = await db
    .select({
      id: observation.id,
      studentFirstName: student.firstName,
      studentLastName: student.lastName,
      teacherFirstName: appUser.firstName,
      teacherLastName: appUser.lastName,
      body: observation.body,
      semester: observation.semester,
      isVisibleToParent: observation.isVisibleToParent,
      createdAt: observation.createdAt,
    })
    .from(observation)
    .innerJoin(enrollment, eq(observation.enrollmentId, enrollment.id))
    .innerJoin(student, eq(enrollment.studentId, student.id))
    .innerJoin(appUser, eq(observation.teacherUserId, appUser.id))
    .where(
      and(
        eq(enrollment.classId, classId),
        eq(observation.academicYearId, academicYearId),
        eq(observation.semester, semester),
        eq(observation.schoolId, schoolId)
      )
    )
    .orderBy(observation.createdAt);

  return rows.map((r) => ({
    id: r.id,
    studentName: `${r.studentLastName} ${r.studentFirstName}`,
    teacherName: `${r.teacherLastName} ${r.teacherFirstName}`,
    body: r.body,
    semester: r.semester,
    isVisibleToParent: r.isVisibleToParent,
    createdAt: r.createdAt,
  }));
}
