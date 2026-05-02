import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { can } from "@/lib/casbin";
import { getTeacherById, getTeacherAssignments } from "@/modules/users/queries/teacher.queries";
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
  if (!(await can(roles, "class", "read"))) redirect("/dashboard");

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) redirect("/dashboard");

  const { id } = await params;
  const [teacher, assignments] = await Promise.all([
    getTeacherById(id, schoolId),
    getTeacherAssignments(id, schoolId),
  ]);

  if (!teacher) notFound();

  return <TeacherDetailView teacher={teacher} assignments={assignments} />;
}
