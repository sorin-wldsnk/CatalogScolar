import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { can } from "@/lib/casbin";
import { getClassById, getClasses } from "@/modules/academic/queries/class.queries";
import { getActiveAcademicYear } from "@/modules/academic/queries/academic-year.queries";
import { getSubjectsForClass } from "@/modules/academic/queries/subject.queries";
import { getStudents, getUnenrolledStudents } from "@/modules/academic/queries/student.queries";
import { getTeachers } from "@/modules/users/queries/teacher.queries";
import { getClassParents } from "@/modules/academic/queries/class-parents.queries";
import { ClassDetailView } from "@/modules/academic/components/ClassDetailView";

export const metadata = { title: "Detalii clasă — Catalog Școlar" };

export default async function ClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ an?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "class", "read"))) redirect("/panou-principal");

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) redirect("/panou-principal");

  const { id } = await params;
  const p = await searchParams;

  const classInfo = await getClassById(id, schoolId);
  if (!classInfo) notFound();

  const activeYear = await getActiveAcademicYear(schoolId);
  const academicYearId = p.an ?? classInfo.academicYearId ?? activeYear?.id ?? "";
  if (!academicYearId) redirect("/admin/clase");

  const [subjects, students, unenrolledStudents, teacherRows, parents, allClassRows] = await Promise.all([
    getSubjectsForClass(id, academicYearId, schoolId),
    getStudents(schoolId, { classId: id, academicYearId }),
    getUnenrolledStudents(schoolId, academicYearId),
    getTeachers(schoolId),
    getClassParents(id, academicYearId, schoolId),
    getClasses(schoolId, academicYearId),
  ]);

  const teachers = teacherRows.map((t) => ({
    id: t.id,
    firstName: t.firstName,
    lastName: t.lastName,
  }));

  const enrolledStudents = (students as Array<{
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

  const homeroomTeacherName =
    classInfo.homeroomTeacherFirstName && classInfo.homeroomTeacherLastName
      ? `${classInfo.homeroomTeacherFirstName} ${classInfo.homeroomTeacherLastName}`
      : null;

  return (
    <ClassDetailView
      classId={id}
      className={classInfo.name}
      gradeLevel={classInfo.gradeLevel}
      academicYearId={academicYearId}
      academicYearName={activeYear?.name ?? academicYearId}
      schoolId={schoolId}
      homeroomTeacherId={classInfo.homeroomTeacherId ?? null}
      homeroomTeacherName={homeroomTeacherName}
      subjects={subjects}
      students={enrolledStudents}
      unenrolledStudents={unenrolledStudents}
      teachers={teachers}
      parents={parents}
      allClasses={allClassRows.filter((c) => c.id !== id).map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
