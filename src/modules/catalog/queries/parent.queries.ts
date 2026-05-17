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

  const absenceRows = await db
    .select({
      id: absence.id,
      subjectId: absence.subjectId,
      absentDate: absence.absentDate,
      period: absence.period,
      status: absence.status,
      excuseReason: absence.excuseReason,
    })
    .from(absence)
    .where(
      and(
        eq(absence.enrollmentId, enrollmentId),
        eq(absence.semester, semester)
      )
    )
    .orderBy(absence.absentDate);

  // Group by subject
  const subjectMap = new Map<string, {
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    grades: typeof grades;
    absences: typeof absenceRows;
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
        absences: [],
        excusedAbsences: 0,
        unexcusedAbsences: 0,
        average: null,
      });
    }
  }

  for (const a of absenceRows) {
    let entry = subjectMap.get(a.subjectId);
    if (!entry) {
      // subject has absences but no grades — need to look up subject name
      continue;
    }
    entry.absences.push(a);
    if (a.status === "EXCUSED") entry.excusedAbsences++;
    else if (a.status === "UNEXCUSED") entry.unexcusedAbsences++;
  }

  // Add subjects that have only absences (no grades)
  const subjectsWithOnlyAbsences = absenceRows.filter((a) => !subjectMap.has(a.subjectId));
  if (subjectsWithOnlyAbsences.length > 0) {
    const uniqueSubjectIds = [...new Set(subjectsWithOnlyAbsences.map((a) => a.subjectId))];
    const { subject: subjectTable } = await import("@/db/schema");
    const { inArray: inArr } = await import("drizzle-orm");
    const subjectDetails = await db
      .select({ id: subjectTable.id, name: subjectTable.name, code: subjectTable.code })
      .from(subjectTable)
      .where(inArr(subjectTable.id, uniqueSubjectIds));
    const subjectDetailMap = new Map(subjectDetails.map((s) => [s.id, s]));
    for (const a of subjectsWithOnlyAbsences) {
      const subj = subjectDetailMap.get(a.subjectId);
      if (!subj) continue;
      let entry = subjectMap.get(a.subjectId);
      if (!entry) {
        entry = {
          subjectId: a.subjectId,
          subjectName: subj.name,
          subjectCode: subj.code,
          grades: [],
          absences: [],
          excusedAbsences: 0,
          unexcusedAbsences: 0,
          average: null,
        };
        subjectMap.set(a.subjectId, entry);
      }
      entry.absences.push(a);
      if (a.status === "EXCUSED") entry.excusedAbsences++;
      else if (a.status === "UNEXCUSED") entry.unexcusedAbsences++;
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
