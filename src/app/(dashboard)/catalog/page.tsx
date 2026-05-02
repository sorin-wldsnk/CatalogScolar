import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getActiveAcademicYear } from "@/modules/academic/queries/academic-year.queries";
import { getClassesForTeacher } from "@/modules/academic/queries/class.queries";
import { getAssignmentsForTeacher } from "@/modules/academic/queries/teaching-assignment.queries";
import { getCatalogTableData, getClassGradeLevel } from "@/modules/catalog/queries/catalog.queries";
import { CatalogView } from "@/modules/catalog/components/CatalogView";

export const metadata = { title: "Catalog — Catalog Școlar" };

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ clasa?: string; materie?: string; sem?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const schoolId = (session as { schoolId?: string }).schoolId;
  const userId = session?.user?.id;
  if (!schoolId || !userId) redirect("/dashboard");

  const params = await searchParams;
  const activeYear = await getActiveAcademicYear(schoolId);
  const academicYearId = activeYear?.id ?? "";

  const [classRows, assignments] = await Promise.all([
    academicYearId ? getClassesForTeacher(userId, academicYearId) : [],
    academicYearId ? getAssignmentsForTeacher(userId, academicYearId) : [],
  ]);

  const teacherClasses = classRows.map((r) => ({ id: r.class.id, name: r.class.name }));

  const selectedClassId = params.clasa ?? teacherClasses[0]?.id ?? "";
  const selectedSemester = params.sem ? parseInt(params.sem) : 1;

  const teacherSubjectsForClass = selectedClassId
    ? assignments
        .filter((a) => a.classId === selectedClassId)
        .map((a) => ({ id: a.subjectId, name: a.subjectName }))
    : [];

  const selectedSubjectId = params.materie ?? teacherSubjectsForClass[0]?.id ?? "";

  const [gradeLevel, students] = await Promise.all([
    selectedClassId ? getClassGradeLevel(selectedClassId) : null,
    selectedClassId && selectedSubjectId && academicYearId
      ? getCatalogTableData(selectedClassId, selectedSubjectId, academicYearId, selectedSemester, schoolId)
      : [],
  ]);

  return (
    <CatalogView
      teacherClasses={teacherClasses}
      teacherSubjects={teacherSubjectsForClass}
      selectedClassId={selectedClassId}
      selectedSubjectId={selectedSubjectId}
      selectedSemester={selectedSemester}
      gradeLevel={gradeLevel}
      academicYearId={academicYearId}
      students={students}
    />
  );
}
