import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/casbin";
import { getAcademicYears } from "@/modules/academic/queries/academic-year.queries";
import { AcademicYearsTable } from "@/modules/academic/components/AcademicYearsTable";
import { AcademicYearsTrigger } from "@/modules/academic/components/AcademicYearsTrigger";

export const metadata = { title: "Ani școlari — Catalog Școlar" };

export default async function AniScolariPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "class", "read"))) redirect("/panou-principal");

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) redirect("/panou-principal");

  const years = await getAcademicYears(schoolId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Ani școlari</h1>
          <p className="text-muted-foreground mt-1">
            Gestionați anii școlari ai instituției
          </p>
        </div>
        <AcademicYearsTrigger />
      </div>
      <AcademicYearsTable years={years} />
    </div>
  );
}
