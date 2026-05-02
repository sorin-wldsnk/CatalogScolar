import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/casbin";
import { getAcademicYears, getActiveAcademicYear } from "@/modules/academic/queries/academic-year.queries";
import { getClasses } from "@/modules/academic/queries/class.queries";
import { ClassesView } from "@/modules/academic/components/ClassesView";

export const metadata = { title: "Clase — Catalog Școlar" };

export default async function ClasePage({
  searchParams,
}: {
  searchParams: Promise<{ an?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "class", "read"))) redirect("/dashboard");

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) redirect("/dashboard");

  const params = await searchParams;
  const years = await getAcademicYears(schoolId);
  const activeYear = await getActiveAcademicYear(schoolId);
  const selectedYearId = params.an ?? activeYear?.id ?? years[0]?.id ?? "";

  const classes = selectedYearId ? await getClasses(schoolId, selectedYearId) : [];

  return (
    <ClassesView
      years={years}
      selectedYearId={selectedYearId}
      classes={classes}
    />
  );
}
