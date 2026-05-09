import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/casbin";
import { getAcademicYears, getActiveAcademicYear } from "@/modules/academic/queries/academic-year.queries";
import { getClasses } from "@/modules/academic/queries/class.queries";
import { getStudents } from "@/modules/academic/queries/student.queries";
import { StudentsView } from "@/modules/academic/components/StudentsView";

export const metadata = { title: "Elevi — Catalog Școlar" };

export default async function EleviPage({
  searchParams,
}: {
  searchParams: Promise<{ an?: string; clasa?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "student", "read"))) redirect("/panou-principal");

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) redirect("/panou-principal");

  const params = await searchParams;
  const years = await getAcademicYears(schoolId);
  const activeYear = await getActiveAcademicYear(schoolId);
  const selectedYearId = params.an ?? activeYear?.id ?? years[0]?.id ?? "";

  const classes = selectedYearId ? await getClasses(schoolId, selectedYearId) : [];
  const students = selectedYearId
    ? await getStudents(schoolId, {
        academicYearId: selectedYearId,
        classId: params.clasa,
        status: params.status,
      })
    : [];

  return (
    <StudentsView
      years={years}
      selectedYearId={selectedYearId}
      classes={classes}
      students={students}
      selectedClassId={params.clasa}
      selectedStatus={params.status}
      roles={roles}
    />
  );
}
