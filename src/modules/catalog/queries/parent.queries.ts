import { db } from "@/db";
import { studentGuardian, student, enrollment, classGroup, grade, absence, subject } from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { computeAverage } from "@/lib/grading";

export async function getStudentForParent(parentUserId: string, schoolId: string) {
  const [row] = await db
    .select({
      studentId: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
    })
    .from(studentGuardian)
    .innerJoin(student, eq(studentGuardian.studentId, student.id))
    .where(
      and(
        eq(studentGuardian.guardianUserId, parentUserId),
        eq(studentGuardian.schoolId, schoolId)
      )
    )
    .limit(1);

  return row ?? null;
}

export async function getParentDashboardData(
  studentId: string,
  academicYearId: string,
  semester: number,
  schoolId: string
) {
  const [enrollRow] = await db
    .select({
      enrollmentId: enrollment.id,
      classId: classGroup.id,
      className: classGroup.name,
      gradeLevel: classGroup.gradeLevel,
    })
    .from(enrollment)
    .innerJoin(classGroup, eq(enrollment.classId, classGroup.id))
    .where(
      and(
        eq(enrollment.studentId, studentId),
        eq(enrollment.academicYearId, academicYearId),
        eq(enrollment.status, "ACTIVE"),
        eq(enrollment.schoolId, schoolId)
      )
    )
    .limit(1);

  if (!enrollRow) return null;

  const { enrollmentId, className, gradeLevel } = enrollRow;

  const grades = await db
    .select({
      id: grade.id,
      subjectId: grade.subjectId,
      subjectName: subject.name,
      subjectCode: subject.code,
      valueNumeric: grade.valueNumeric,
      valueQualitative: grade.valueQualitative,
      gradeType: grade.gradeType,
      weight: grade.weight,
      gradedAt: grade.gradedAt,
      notes: grade.notes,
    })
    .from(grade)
    .innerJoin(subject, eq(grade.subjectId, subject.id))
    .where(
      and(
        eq(grade.enrollmentId, enrollmentId),
        eq(grade.semester, semester)
      )
    )
    .orderBy(subject.name, grade.gradedAt);

  const absenceCounts = await db
    .select({
      subjectId: absence.subjectId,
      status: absence.status,
      cnt: sql<number>`COUNT(*)`,
    })
    .from(absence)
    .where(
      and(
        eq(absence.enrollmentId, enrollmentId),
        eq(absence.semester, semester)
      )
    )
    .groupBy(absence.subjectId, absence.status);

  // Group by subject
  const subjectMap = new Map<string, {
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    grades: typeof grades;
    excusedAbsences: number;
    unexcusedAbsences: number;
    average: number | null;
  }>();

  for (const g of grades) {
    const existing = subjectMap.get(g.subjectId);
    if (existing) {
      existing.grades.push(g);
    } else {
      subjectMap.set(g.subjectId, {
        subjectId: g.subjectId,
        subjectName: g.subjectName,
        subjectCode: g.subjectCode,
        grades: [g],
        excusedAbsences: 0,
        unexcusedAbsences: 0,
        average: null,
      });
    }
  }

  for (const a of absenceCounts) {
    const entry = subjectMap.get(a.subjectId);
    if (entry) {
      if (a.status === "EXCUSED") entry.excusedAbsences = Number(a.cnt);
      else if (a.status === "UNEXCUSED") entry.unexcusedAbsences = Number(a.cnt);
    }
  }

  for (const entry of subjectMap.values()) {
    entry.average = computeAverage(
      entry.grades.map((g) => ({
        valueNumeric: g.valueNumeric,
        gradeType: g.gradeType,
        weight: g.weight ?? "1",
      }))
    );
  }

  return {
    className,
    gradeLevel,
    subjects: Array.from(subjectMap.values()),
  };
}
