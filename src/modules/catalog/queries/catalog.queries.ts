import { db } from "@/db";
import { grade, absence, enrollment, student, classGroup } from "@/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

export interface AbsenceDetail {
  id: string;
  absentDate: string;
  period: number | null;
  status: string;
  excuseReason: string | null;
}

export interface CatalogStudentRow {
  enrollmentId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  grades: Array<{
    id: string;
    valueNumeric: string | null;
    valueQualitative: string | null;
    gradeType: string;
    weight: string;
    gradedAt: string;
    notes: string | null;
  }>;
  absences: AbsenceDetail[];
  excusedAbsences: number;
  unexcusedAbsences: number;
  pendingAbsences: number;
}

export async function getCatalogTableData(
  classId: string,
  subjectId: string,
  academicYearId: string,
  semester: number,
  schoolId: string
): Promise<CatalogStudentRow[]> {
  const students = await db
    .select({
      enrollmentId: enrollment.id,
      studentId: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
    })
    .from(enrollment)
    .innerJoin(student, eq(enrollment.studentId, student.id))
    .where(
      and(
        eq(enrollment.classId, classId),
        eq(enrollment.academicYearId, academicYearId),
        eq(enrollment.status, "ACTIVE"),
        eq(enrollment.schoolId, schoolId)
      )
    )
    .orderBy(student.lastName, student.firstName);

  if (students.length === 0) return [];

  const enrollmentIds = students.map((s) => s.enrollmentId);

  const grades = await db
    .select({
      id: grade.id,
      enrollmentId: grade.enrollmentId,
      valueNumeric: grade.valueNumeric,
      valueQualitative: grade.valueQualitative,
      gradeType: grade.gradeType,
      weight: grade.weight,
      gradedAt: grade.gradedAt,
      notes: grade.notes,
    })
    .from(grade)
    .where(
      and(
        eq(grade.subjectId, subjectId),
        eq(grade.academicYearId, academicYearId),
        eq(grade.semester, semester),
        inArray(grade.enrollmentId, enrollmentIds)
      )
    )
    .orderBy(grade.gradedAt);

  const absenceRows = await db
    .select({
      id: absence.id,
      enrollmentId: absence.enrollmentId,
      absentDate: absence.absentDate,
      period: absence.period,
      status: absence.status,
      excuseReason: absence.excuseReason,
    })
    .from(absence)
    .where(
      and(
        eq(absence.subjectId, subjectId),
        eq(absence.academicYearId, academicYearId),
        eq(absence.semester, semester),
        inArray(absence.enrollmentId, enrollmentIds)
      )
    )
    .orderBy(absence.absentDate);

  return students.map((s) => {
    const studentGrades = grades.filter((g) => g.enrollmentId === s.enrollmentId);
    const studentAbsences = absenceRows.filter((a) => a.enrollmentId === s.enrollmentId);

    return {
      enrollmentId: s.enrollmentId,
      studentId: s.studentId,
      firstName: s.firstName,
      lastName: s.lastName,
      grades: studentGrades.map((g) => ({
        id: g.id,
        valueNumeric: g.valueNumeric,
        valueQualitative: g.valueQualitative,
        gradeType: g.gradeType,
        weight: g.weight ?? "1",
        gradedAt: g.gradedAt ?? "",
        notes: g.notes,
      })),
      absences: studentAbsences.map((a) => ({
        id: a.id,
        absentDate: a.absentDate ?? "",
        period: a.period,
        status: a.status,
        excuseReason: a.excuseReason,
      })),
      excusedAbsences: studentAbsences.filter((a) => a.status === "EXCUSED").length,
      unexcusedAbsences: studentAbsences.filter((a) => a.status === "UNEXCUSED").length,
      pendingAbsences: studentAbsences.filter((a) => a.status === "PENDING_EXCUSE").length,
    };
  });
}

export async function getClassGradeLevel(classId: string): Promise<number | null> {
  const [cls] = await db
    .select({ gradeLevel: classGroup.gradeLevel })
    .from(classGroup)
    .where(eq(classGroup.id, classId))
    .limit(1);
  return cls?.gradeLevel ?? null;
}
