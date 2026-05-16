import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { can } from "@/lib/casbin";
import { getTeacherById, getTeacherAssignments, getTeacherSubjects } from "@/modules/users/queries/teacher.queries";
import { getSubjectsForTeacherForm } from "@/modules/academic/queries/subject.queries";
import { TeacherDetailView } from "@/modules/users/components/TeacherDetailView";

export const metadata = { title: "Detalii profesor — Catalog Școlar" };

export default async function TeacherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "class", "read"))) redirect("/panou-principal");

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) redirect("/panou-principal");

  const { id } = await params;
  const [teacher, assignments, teacherSubjectRows, allSubjects] = await Promise.all([
    getTeacherById(id, schoolId),
    getTeacherAssignments(id, schoolId),
    getTeacherSubjects(id, schoolId),
    getSubjectsForTeacherForm(schoolId),
  ]);

  if (!teacher) notFound();

  return (
    <TeacherDetailView
      teacher={teacher}
      assignments={assignments}
      allSubjects={allSubjects}
      teacherSubjectIds={teacherSubjectRows.map((s) => s.subjectId)}
    />
  );
}
