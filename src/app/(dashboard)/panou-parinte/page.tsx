import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getActiveAcademicYear } from "@/modules/academic/queries/academic-year.queries";
import { getStudentForParent, getParentDashboardData } from "@/modules/catalog/queries/parent.queries";
import { ParentView } from "@/modules/catalog/components/ParentView";

export const metadata = { title: "Situație școlară — Catalog Școlar" };

export default async function PanouParintePage({
  searchParams,
}: {
  searchParams: Promise<{ sem?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!roles.includes("PARENT")) redirect("/dashboard");

  const schoolId = (session as { schoolId?: string }).schoolId;
  const userId = (session as { userId?: string }).userId;
  if (!schoolId || !userId) redirect("/dashboard");

  const params = await searchParams;
  const semester = params.sem ? parseInt(params.sem) : 1;

  const activeYear = await getActiveAcademicYear(schoolId);
  if (!activeYear) {
    return (
      <div className="text-center p-12 text-muted-foreground">
        Nu există un an școlar activ.
      </div>
    );
  }

  const studentInfo = await getStudentForParent(userId, schoolId);
  if (!studentInfo) {
    return (
      <div className="text-center p-12 text-muted-foreground">
        Contul dvs. nu este asociat cu niciun elev. Contactați secretariatul școlii.
      </div>
    );
  }

  const data = await getParentDashboardData(
    studentInfo.studentId,
    activeYear.id,
    semester,
    schoolId
  );

  if (!data) {
    return (
      <div className="text-center p-12 text-muted-foreground">
        Elevul nu este înscris în nicio clasă pentru anul curent.
      </div>
    );
  }

  const studentName = `${studentInfo.lastName} ${studentInfo.firstName}`;

  return (
    <ParentView
      studentName={studentName}
      className={data.className}
      gradeLevel={data.gradeLevel}
      subjects={data.subjects}
      semester={semester}
    />
  );
}
