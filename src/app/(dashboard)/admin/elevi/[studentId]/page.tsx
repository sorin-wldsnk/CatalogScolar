import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { can } from "@/lib/casbin";
import { getActiveAcademicYear, getAcademicYears } from "@/modules/academic/queries/academic-year.queries";
import {
  getStudentProfile,
  getStudentActiveEnrollment,
  getStudentGrades,
  getStudentAbsences,
  getStudentGuardians,
  getStudentEnrollmentHistory,
} from "@/modules/academic/queries/student-profile.queries";
import { StudentDetailView } from "@/modules/academic/components/StudentDetailView";

export const metadata = { title: "Fișa elevului — Catalog Școlar" };

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ an?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "student", "read"))) redirect("/panou-principal");

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) redirect("/panou-principal");

  const { studentId } = await params;
  const p = await searchParams;

  const [studentInfo, activeYear, allYears] = await Promise.all([
    getStudentProfile(studentId, schoolId),
    getActiveAcademicYear(schoolId),
    getAcademicYears(schoolId),
  ]);

  if (!studentInfo) notFound();

  const academicYearId = p.an ?? activeYear?.id ?? allYears[0]?.id ?? "";

  const [enrollment, guardians, enrollmentHistory] = await Promise.all([
    academicYearId ? getStudentActiveEnrollment(studentId, schoolId, academicYearId) : null,
    getStudentGuardians(studentId, schoolId),
    getStudentEnrollmentHistory(studentId, schoolId),
  ]);

  const [grades, absences] = enrollment
    ? await Promise.all([
        getStudentGrades(enrollment.enrollmentId),
        getStudentAbsences(enrollment.enrollmentId),
      ])
    : [[], []];

  return (
    <StudentDetailView
      student={studentInfo}
      enrollment={enrollment}
      grades={grades}
      absences={absences}
      guardians={guardians}
      enrollmentHistory={enrollmentHistory}
      academicYearId={academicYearId}
      allYears={allYears.map((y) => ({ id: y.id, name: y.name, isActive: y.isActive }))}
      schoolId={schoolId}
    />
  );
}
