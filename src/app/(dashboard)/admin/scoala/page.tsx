import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/casbin";
import { getSchool } from "@/modules/school/queries/school.queries";
import { SchoolSettingsForm } from "@/modules/school/components/SchoolSettingsForm";

export const metadata = { title: "Setări școală — Catalog Școlar" };

export default async function SchoolSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "class", "create"))) redirect("/dashboard");

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) redirect("/dashboard");

  const schoolData = await getSchool(schoolId);
  if (!schoolData) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Școala mea</h1>
        <p className="text-muted-foreground mt-1">Setările instituției școlare</p>
      </div>
      <div className="rounded-xl border bg-white p-6">
        <SchoolSettingsForm school={schoolData} />
      </div>
    </div>
  );
}
