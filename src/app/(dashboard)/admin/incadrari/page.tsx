import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/casbin";
import { getAcademicYears, getActiveAcademicYear } from "@/modules/academic/queries/academic-year.queries";
import { getClasses } from "@/modules/academic/queries/class.queries";
import { getSubjects } from "@/modules/academic/queries/subject.queries";
import { getAssignmentsAll } from "@/modules/academic/queries/teaching-assignment.queries";
import { db } from "@/db";
import { appUser, schoolMembership, userRole, role } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { AssignmentsView } from "@/modules/academic/components/AssignmentsView";

export const metadata = { title: "Încadrări — Catalog Școlar" };

export default async function IncadrariPage({
  searchParams,
}: {
  searchParams: Promise<{ an?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "subject", "read"))) redirect("/dashboard");

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) redirect("/dashboard");

  const params = await searchParams;
  const years = await getAcademicYears(schoolId);
  const activeYear = await getActiveAcademicYear(schoolId);
  const selectedYearId = params.an ?? activeYear?.id ?? years[0]?.id ?? "";

  const [classes, subjects, assignments] = await Promise.all([
    selectedYearId ? getClasses(schoolId, selectedYearId) : [],
    getSubjects(schoolId),
    selectedYearId ? getAssignmentsAll(schoolId, selectedYearId) : [],
  ]);

  // Fetch users with TEACHER or HOMEROOM role in this school
  const teachers = await db
    .selectDistinct({
      id: appUser.id,
      firstName: appUser.firstName,
      lastName: appUser.lastName,
    })
    .from(appUser)
    .innerJoin(schoolMembership, and(
      eq(schoolMembership.userId, appUser.id),
      eq(schoolMembership.schoolId, schoolId),
      eq(schoolMembership.isActive, true)
    ))
    .innerJoin(userRole, eq(userRole.membershipId, schoolMembership.id))
    .innerJoin(role, eq(userRole.roleId, role.id))
    .where(eq(appUser.isActive, true))
    .orderBy(appUser.lastName, appUser.firstName);

  return (
    <AssignmentsView
      years={years}
      selectedYearId={selectedYearId}
      classes={classes}
      subjects={subjects}
      assignments={assignments}
      teachers={teachers}
    />
  );
}
