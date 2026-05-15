import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getHomeroomClass } from "@/modules/catalog/queries/homeroom.queries";
import { getAcademicYearById } from "@/modules/academic/queries/academic-year.queries";
import { getAssignmentsForClass } from "@/modules/academic/queries/teaching-assignment.queries";
import { getCatalogTableData } from "@/modules/catalog/queries/catalog.queries";
import { getStudents } from "@/modules/academic/queries/student.queries";
import { getClasses } from "@/modules/academic/queries/class.queries";
import { getClassParents } from "@/modules/academic/queries/class-parents.queries";
import {
  getClassPendingAbsences,
  getClassObservations,
} from "@/modules/catalog/queries/homeroom.queries";
import { ClasaMeaView } from "@/modules/catalog/components/ClasaMeaView";

export const metadata = { title: "Clasa mea — Catalog Școlar" };

export default async function ClasaMeaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; materie?: string; sem?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id!;
  const schoolId = (session as { schoolId?: string }).schoolId;
  const roles = (session as { roles?: string[] }).roles ?? [];

  if (!schoolId) redirect("/panou-principal");
  if (!roles.includes("HOMEROOM")) redirect("/catalog");

  const homeroomClass = await getHomeroomClass(userId, schoolId);

  if (!homeroomClass) {
    return (
      <div className="rounded-xl border bg-white p-16 text-center space-y-2">
        <p className="text-muted-foreground font-medium">
          Nu ești alocat ca diriginte la nicio clasă.
        </p>
        <p className="text-sm text-muted-foreground">
          Contactați administratorul școlii pentru alocare.
        </p>
      </div>
    );
  }

  const { id: classId, name: className, gradeLevel, academicYearId } = homeroomClass;

  const params = await searchParams;
  const activeTab = params.tab ?? "catalog";
  const selectedSemester = params.sem ? parseInt(params.sem) : 1;

  const [academicYear, assignmentRows] = await Promise.all([
    getAcademicYearById(academicYearId, schoolId),
    getAssignmentsForClass(classId, academicYearId),
  ]);

  const academicYearName = academicYear?.name ?? academicYearId;

  const subjects = assignmentRows.map((a) => ({
    subjectId: a.subjectId,
    subjectName: a.subjectName,
    assignmentId: a.id,
    teacherUserId: a.teacherUserId,
  }));

  const selectedSubjectId = params.materie ?? subjects[0]?.subjectId ?? "";
  const selectedSubject = subjects.find((s) => s.subjectId === selectedSubjectId);
  const canEditSubject = selectedSubject?.teacherUserId === userId;

  const [catalogStudents, studentRows, allClassRows, parents, pendingAbsences, observations] =
    await Promise.all([
      selectedSubjectId
        ? getCatalogTableData(classId, selectedSubjectId, academicYearId, selectedSemester, schoolId)
        : [],
      getStudents(schoolId, { classId, academicYearId }),
      getClasses(schoolId, academicYearId),
      getClassParents(classId, academicYearId, schoolId),
      getClassPendingAbsences(classId, academicYearId, selectedSemester, schoolId),
      getClassObservations(classId, academicYearId, selectedSemester, schoolId),
    ]);

  const students = (studentRows as Array<{
    id: string;
    firstName: string;
    lastName: string;
    personalId?: string | null;
    dateOfBirth?: string | null;
    status: string;
    enrollmentId?: string;
  }>).map((s) => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    personalId: s.personalId ?? null,
    dateOfBirth: s.dateOfBirth ?? null,
    status: s.status,
    enrollmentId: s.enrollmentId ?? "",
  }));

  const allClasses = allClassRows
    .filter((c) => c.id !== classId)
    .map((c) => ({ id: c.id, name: c.name }));

  return (
    <ClasaMeaView
      classId={classId}
      className={className}
      gradeLevel={gradeLevel}
      academicYearId={academicYearId}
      academicYearName={academicYearName}
      schoolId={schoolId}
      userId={userId}
      subjects={subjects}
      selectedSubjectId={selectedSubjectId}
      selectedSemester={selectedSemester}
      catalogStudents={catalogStudents}
      canEditSubject={canEditSubject}
      students={students}
      allClasses={allClasses}
      parents={parents}
      pendingAbsences={pendingAbsences}
      observations={observations}
      activeTab={activeTab}
    />
  );
}
