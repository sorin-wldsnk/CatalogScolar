import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/casbin";
import { getAcademicYears, getActiveAcademicYear } from "@/modules/academic/queries/academic-year.queries";
import { getClasses } from "@/modules/academic/queries/class.queries";
import { getSubjects } from "@/modules/academic/queries/subject.queries";
import { getAssignmentsFiltered } from "@/modules/academic/queries/teaching-assignment.queries";
import { getTeachers } from "@/modules/users/queries/teacher.queries";
import { AssignmentsView } from "@/modules/academic/components/AssignmentsView";

export const metadata = { title: "Încadrări — Catalog Școlar" };

export default async function IncadrariPage({
  searchParams,
}: {
  searchParams: Promise<{ an?: string; profesor?: string; clasa?: string; materie?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "subject", "read"))) redirect("/dashboard");

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) redirect("/dashboard");

  const params = await searchParams;
  const years = await getAcademicYears(schoolId);
  const activeYear = await getActiveAcademicYear(schoolId);
  const selectedYearId = params.an ?? activeYear?.id ?? years[0]?.id ?? "";

  const [classes, subjects, teacherRows, assignments] = await Promise.all([
    selectedYearId ? getClasses(schoolId, selectedYearId) : [],
    getSubjects(schoolId),
    getTeachers(schoolId),
    selectedYearId
      ? getAssignmentsFiltered(schoolId, selectedYearId, {
          teacherUserId: params.profesor,
          classId: params.clasa,
          subjectId: params.materie,
        })
      : [],
  ]);

  const teachers = teacherRows.map((t) => ({
    id: t.id,
    firstName: t.firstName,
    lastName: t.lastName,
  }));

  return (
    <AssignmentsView
      years={years}
      selectedYearId={selectedYearId}
      classes={classes}
      subjects={subjects}
      assignments={assignments}
      teachers={teachers}
      selectedTeacherId={params.profesor}
      selectedClassId={params.clasa}
      selectedSubjectId={params.materie}
    />
  );
}
