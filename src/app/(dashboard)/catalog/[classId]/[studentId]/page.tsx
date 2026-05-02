import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getActiveAcademicYear } from "@/modules/academic/queries/academic-year.queries";
import { getClassById } from "@/modules/academic/queries/class.queries";
import { getStudentById, getStudentWithEnrollment } from "@/modules/academic/queries/student.queries";
import { getGradesForEnrollment } from "@/modules/catalog/queries/grade.queries";
import { getAbsencesForEnrollment } from "@/modules/catalog/queries/absence.queries";
import { StudentCatalogView } from "@/modules/catalog/components/StudentCatalogView";

export default async function StudentCatalogPage({
  params,
}: {
  params: Promise<{ classId: string; studentId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const schoolId = (session as { schoolId?: string }).schoolId;
  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!schoolId) redirect("/dashboard");

  const { classId, studentId } = await params;

  const activeYear = await getActiveAcademicYear(schoolId);
  if (!activeYear) redirect("/catalog");

  const [classInfo, student, studentWithEnrollment] = await Promise.all([
    getClassById(classId, schoolId),
    getStudentById(studentId, schoolId),
    getStudentWithEnrollment(studentId, activeYear.id),
  ]);

  if (!classInfo || !student) notFound();
  if (!studentWithEnrollment?.enrollment) notFound();

  const enrollmentId = studentWithEnrollment.enrollment.id;

  const [grades, absences] = await Promise.all([
    getGradesForEnrollment(enrollmentId),
    getAbsencesForEnrollment(enrollmentId),
  ]);

  const canExcuse = roles.some((r) => ["HOMEROOM", "ADMIN"].includes(r));
  const studentName = `${student.lastName} ${student.firstName}`;

  const gradeRows = grades.map((g) => ({
    id: g.id,
    subjectName: g.subjectName,
    subjectCode: g.subjectCode,
    semester: g.semester ?? 1,
    valueNumeric: g.valueNumeric,
    valueQualitative: g.valueQualitative,
    gradeType: g.gradeType,
    weight: g.weight ?? "1",
    gradedAt: g.gradedAt ?? "",
    notes: g.notes,
  }));

  const absenceRows = absences.map((a) => ({
    id: a.id,
    subjectName: a.subjectName,
    subjectCode: a.subjectCode,
    semester: a.semester ?? 1,
    absentDate: a.absentDate ?? "",
    period: a.period,
    status: a.status,
    excuseReason: a.excuseReason,
  }));

  return (
    <StudentCatalogView
      studentName={studentName}
      className={classInfo.name}
      grades={gradeRows}
      absences={absenceRows}
      canExcuse={canExcuse}
    />
  );
}
