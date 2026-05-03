import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getActiveAcademicYear } from "@/modules/academic/queries/academic-year.queries";
import { getClassesForTeacher } from "@/modules/academic/queries/class.queries";
import { getAssignmentsForTeacher } from "@/modules/academic/queries/teaching-assignment.queries";
import { getCatalogTableData, getClassGradeLevel } from "@/modules/catalog/queries/catalog.queries";
import {
  getHomeroomClassId,
  getClassPendingAbsences,
  getClassObservations,
} from "@/modules/catalog/queries/homeroom.queries";
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

  const roles = (session as { roles?: string[] }).roles ?? [];
  const isHomeroom = roles.includes("HOMEROOM");

  const params = await searchParams;
  const activeYear = await getActiveAcademicYear(schoolId);
  const academicYearId = activeYear?.id ?? "";

  const [classRows, assignments, homeroomClassId] = await Promise.all([
    academicYearId ? getClassesForTeacher(userId, academicYearId) : [],
    academicYearId ? getAssignmentsForTeacher(userId, academicYearId) : [],
    isHomeroom && schoolId ? getHomeroomClassId(userId, schoolId) : null,
  ]);

  const teacherClasses = classRows.map((r) => ({ id: r.class.id, name: r.class.name }));

  // Homeroom teachers also see their homeroom class even if not teaching there directly
  if (isHomeroom && homeroomClassId && !teacherClasses.some((c) => c.id === homeroomClassId)) {
    const allClasses = await getClassesForTeacher(userId, academicYearId);
    const homeroomClass = allClasses.find((r) => r.class.id === homeroomClassId);
    if (!homeroomClass) {
      // manually push a minimal entry so the class appears in the selector
      const { getClassById } = await import("@/modules/academic/queries/class.queries");
      const cls = await getClassById(homeroomClassId, schoolId);
      if (cls) teacherClasses.push({ id: cls.id, name: cls.name });
    }
  }

  const selectedClassId = params.clasa ?? teacherClasses[0]?.id ?? "";
  const selectedSemester = params.sem ? parseInt(params.sem) : 1;

  const teacherSubjectsForClass = selectedClassId
    ? assignments
        .filter((a) => a.classId === selectedClassId)
        .map((a) => ({ id: a.subjectId, name: a.subjectName }))
    : [];

  const selectedSubjectId = params.materie ?? teacherSubjectsForClass[0]?.id ?? "";

  const [gradeLevel, students, pendingAbsences, classObservations] = await Promise.all([
    selectedClassId ? getClassGradeLevel(selectedClassId) : null,
    selectedClassId && selectedSubjectId && academicYearId
      ? getCatalogTableData(selectedClassId, selectedSubjectId, academicYearId, selectedSemester, schoolId)
      : [],
    isHomeroom && homeroomClassId && selectedClassId === homeroomClassId && academicYearId
      ? getClassPendingAbsences(homeroomClassId, academicYearId, selectedSemester, schoolId)
      : [],
    isHomeroom && homeroomClassId && selectedClassId === homeroomClassId && academicYearId
      ? getClassObservations(homeroomClassId, academicYearId, selectedSemester, schoolId)
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
      isHomeroom={isHomeroom}
      homeroomClassId={homeroomClassId}
      pendingAbsences={pendingAbsences}
      classObservations={classObservations}
      roles={roles}
    />
  );
}
