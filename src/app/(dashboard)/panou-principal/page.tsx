import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getActiveAcademicYear } from "@/modules/academic/queries/academic-year.queries";
import {
  getAdminDashboardStats,
  getTeacherDashboardStats,
  getHomeroomDashboardStats,
} from "@/modules/dashboard/queries/dashboard.queries";

export const metadata = { title: "Panou principal — Catalog Școlar" };

export default async function PanouPrincipalPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const schoolId = (session as { schoolId?: string }).schoolId;
  const userId = session?.user?.id;
  if (!schoolId || !userId) redirect("/login");

  const roles = (session as { roles?: string[] }).roles ?? [];
  const isAdmin = roles.includes("ADMIN") || roles.includes("SECRETARY");
  const isHomeroom = roles.includes("HOMEROOM");
  const isTeacher = roles.includes("TEACHER") || isHomeroom;

  const activeYear = await getActiveAcademicYear(schoolId);
  const academicYearId = activeYear?.id ?? "";

  const userName = session.user.name ?? "Utilizator";

  if (isAdmin) {
    const stats = academicYearId
      ? await getAdminDashboardStats(schoolId, academicYearId)
      : { activeStudents: 0, totalTeachers: 0, activeClasses: 0, unexcusedAbsencesToday: 0 };

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Panou principal</h1>
          <p className="text-muted-foreground mt-1">Bun venit, {userName}!</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Elevi activi" value={stats.activeStudents} color="bg-blue-50 border-blue-100" />
          <StatCard label="Profesori" value={stats.totalTeachers} color="bg-purple-50 border-purple-100" />
          <StatCard label="Clase active" value={stats.activeClasses} color="bg-green-50 border-green-100" />
          <StatCard label="Absențe nemotivate azi" value={stats.unexcusedAbsencesToday} color="bg-amber-50 border-amber-100" />
        </div>
      </div>
    );
  }

  if (isHomeroom) {
    const stats = academicYearId
      ? await getHomeroomDashboardStats(userId, schoolId, academicYearId)
      : { homeroomClass: null, studentCount: 0, unexcusedToday: 0, pendingExcuses: 0 };

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Panou principal</h1>
          <p className="text-muted-foreground mt-1">Bun venit, {userName}!</p>
        </div>
        {stats.homeroomClass ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Clasa mea" value={stats.homeroomClass.name} color="bg-blue-50 border-blue-100" wide />
            <StatCard label="Elevi înscriși" value={stats.studentCount} color="bg-purple-50 border-purple-100" />
            <StatCard label="Absențe nemotivate azi" value={stats.unexcusedToday} color="bg-amber-50 border-amber-100" />
            <StatCard label="Motivări în așteptare" value={stats.pendingExcuses} color="bg-orange-50 border-orange-100" />
          </div>
        ) : (
          <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground">
            Nu aveți o clasă alocată pentru acest an școlar.
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          Accesați <a href="/catalog/clasa-mea" className="text-[#1e5fa8] underline underline-offset-2">Clasa mea</a> pentru gestionarea notelor și absențelor.
        </p>
      </div>
    );
  }

  if (isTeacher) {
    const stats = academicYearId
      ? await getTeacherDashboardStats(userId, schoolId, academicYearId)
      : { classCount: 0, studentCount: 0 };

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Panou principal</h1>
          <p className="text-muted-foreground mt-1">Bun venit, {userName}!</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard label={`Predați la ${stats.classCount} clase`} value={stats.classCount} color="bg-blue-50 border-blue-100" />
          <StatCard label="Total elevi" value={stats.studentCount} color="bg-green-50 border-green-100" />
        </div>
        <p className="text-sm text-muted-foreground">
          Accesați <a href="/catalog" className="text-[#1e5fa8] underline underline-offset-2">Catalog</a> pentru a gestiona notele și absențele.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Panou principal</h1>
        <p className="text-muted-foreground mt-1">Bun venit, {userName}!</p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  wide,
}: {
  label: string;
  value: string | number;
  color: string;
  wide?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-5 ${color} ${wide ? "sm:col-span-2 lg:col-span-1" : ""}`}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold text-[#1e3a5f] mt-1">{value}</p>
    </div>
  );
}
