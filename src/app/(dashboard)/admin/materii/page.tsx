import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/casbin";
import { getSubjects } from "@/modules/academic/queries/subject.queries";
import { SubjectsView } from "@/modules/academic/components/SubjectsView";

export const metadata = { title: "Materii — Catalog Școlar" };

export default async function MateriiPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "subject", "read"))) redirect("/dashboard");

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) redirect("/dashboard");

  const subjects = await getSubjects(schoolId);

  return <SubjectsView subjects={subjects} />;
}
