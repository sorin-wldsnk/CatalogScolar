import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/casbin";
import { getTeachers } from "@/modules/users/queries/teacher.queries";
import { getSubjectsForTeacherForm } from "@/modules/academic/queries/subject.queries";
import { TeachersView } from "@/modules/users/components/TeachersView";

export const metadata = { title: "Profesori — Catalog Școlar" };

export default async function ProfesoriPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "class", "read"))) redirect("/panou-principal");

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) redirect("/panou-principal");

  const [teachers, subjects] = await Promise.all([
    getTeachers(schoolId),
    getSubjectsForTeacherForm(schoolId),
  ]);

  return <TeachersView teachers={teachers} subjects={subjects} />;
}
