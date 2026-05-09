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
  if (!(await can(roles, "subject", "read"))) redirect("/panou-principal");

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) redirect("/panou-principal");

  const subjects = await getSubjects(schoolId);

  return <SubjectsView subjects={subjects} />;
}
