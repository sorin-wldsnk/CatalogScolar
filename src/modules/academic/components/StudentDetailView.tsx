"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditStudentModal } from "./EditStudentModal";
import { computeAverage } from "@/lib/grading";

const RO_MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
function formatRoDate(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${parseInt(day)} ${RO_MONTHS[parseInt(m) - 1]} ${y}`;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Activ", color: "text-green-700 border-green-200 bg-green-50" },
  WITHDRAWN: { label: "Retras", color: "text-red-700 border-red-200 bg-red-50" },
  TRANSFERRED: { label: "Transferat", color: "text-amber-700 border-amber-200 bg-amber-50" },
  REPEATING: { label: "Corigent", color: "text-orange-700 border-orange-200 bg-orange-50" },
  GRADUATED: { label: "Absolvent", color: "text-blue-700 border-blue-200 bg-blue-50" },
};

const ABSENCE_STATUS: Record<string, { label: string; color: string }> = {
  UNEXCUSED: { label: "Nemotivată", color: "text-red-700 border-red-200 bg-red-50" },
  EXCUSED: { label: "Motivată", color: "text-green-700 border-green-200 bg-green-50" },
  PENDING_EXCUSE: { label: "În așteptare", color: "text-amber-700 border-amber-200 bg-amber-50" },
};

const GRADE_TYPE_LABELS: Record<string, string> = {
  REGULAR: "Curentă",
  THESIS: "Teză",
  ORAL: "Oral",
  PRACTICAL: "Practic",
};

interface StudentInfo {
  id: string;
  firstName: string;
  lastName: string;
  personalId: string | null;
  dateOfBirth: string | null;
  status: string;
}

interface EnrollmentInfo {
  enrollmentId: string;
  classId: string;
  className: string;
  gradeLevel: number;
  academicYearId: string;
  academicYearName: string;
  status: string;
}

interface GradeRow {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  semester: number;
  valueNumeric: string | null;
  valueQualitative: string | null;
  gradeType: string;
  weight: string | null;
  gradedAt: string | null;
  notes: string | null;
}

interface AbsenceRow {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  semester: number;
  absentDate: string | null;
  period: number | null;
  status: string;
  excuseReason: string | null;
  excusedAt: Date | null;
}

interface GuardianRow {
  guardianUserId: string;
  relationship: string;
  isPrimary: boolean | null;
  firstName: string;
  lastName: string;
  email: string;
}

interface HistoryRow {
  enrollmentId: string;
  classId: string;
  className: string;
  gradeLevel: number;
  academicYearId: string;
  academicYearName: string;
  status: string;
  enrolledAt: string | null;
}

interface YearOption { id: string; name: string; isActive: boolean | null; }

interface Props {
  student: StudentInfo;
  enrollment: EnrollmentInfo | null;
  grades: GradeRow[];
  absences: AbsenceRow[];
  guardians: GuardianRow[];
  enrollmentHistory: HistoryRow[];
  academicYearId: string;
  allYears: YearOption[];
  schoolId: string;
}

type Tab = "situatie" | "absente" | "tutori" | "istoric";

export function StudentDetailView({
  student,
  enrollment,
  grades,
  absences,
  guardians,
  enrollmentHistory,
  academicYearId,
  allYears,
  schoolId,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<Tab>("situatie");
  const [selectedSemester, setSelectedSemester] = useState<number | "all">("all");
  const [absenceStatusFilter, setAbsenceStatusFilter] = useState<string>("all");
  const [editOpen, setEditOpen] = useState(false);

  const studentFullName = `${student.lastName} ${student.firstName}`;
  const statusInfo = STATUS_LABELS[student.status];

  function changeYear(yearId: string | null) {
    if (yearId) router.push(`/admin/elevi/${student.id}?an=${yearId}`);
  }

  // ── Tab 1: Situație școlară ──────────────────────────────────────────────
  const filteredGrades = grades.filter(
    (g) => selectedSemester === "all" || g.semester === selectedSemester
  );
  const filteredAbsencesForSit = absences.filter(
    (a) => selectedSemester === "all" || a.semester === selectedSemester
  );

  // Group by subject
  const subjectIds = [...new Set(filteredGrades.map((g) => g.subjectId).concat(filteredAbsencesForSit.map((a) => a.subjectId)))];
  const subjectSituatie = subjectIds.map((sid) => {
    const subjectGrades = filteredGrades.filter((g) => g.subjectId === sid);
    const subjectAbsences = filteredAbsencesForSit.filter((a) => a.subjectId === sid);
    const subjectName = subjectGrades[0]?.subjectName ?? subjectAbsences[0]?.subjectName ?? "";
    const avg = computeAverage(subjectGrades.map((g) => ({
      valueNumeric: g.valueNumeric,
      gradeType: g.gradeType,
      weight: g.weight ?? "1",
    })));
    return {
      subjectId: sid,
      subjectName,
      grades: subjectGrades,
      excused: subjectAbsences.filter((a) => a.status === "EXCUSED").length,
      unexcused: subjectAbsences.filter((a) => a.status === "UNEXCUSED").length,
      pending: subjectAbsences.filter((a) => a.status === "PENDING_EXCUSE").length,
      average: avg,
    };
  }).sort((a, b) => a.subjectName.localeCompare(b.subjectName, "ro"));

  // ── Tab 2: Absențe ───────────────────────────────────────────────────────
  const filteredAbsences = absences.filter((a) => {
    if (selectedSemester !== "all" && a.semester !== selectedSemester) return false;
    if (absenceStatusFilter !== "all" && a.status !== absenceStatusFilter) return false;
    return true;
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: "situatie", label: "Situație școlară" },
    { key: "absente", label: `Absențe (${absences.length})` },
    { key: "tutori", label: `Tutori (${guardians.length})` },
    { key: "istoric", label: "Istoric școlar" },
  ];

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <Link href="/admin/elevi" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-3.5 w-3.5" />
          Înapoi la elevi
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1e3a5f]">{studentFullName}</h1>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {enrollment && (
                <p className="text-muted-foreground">{enrollment.className}</p>
              )}
              <Badge variant="outline" className={`text-xs ${statusInfo?.color ?? ""}`}>
                {statusInfo?.label ?? student.status}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Select value={academicYearId} onValueChange={changeYear}>
              <SelectTrigger className="w-40">
                <SelectValue>
                  {allYears.find((y) => y.id === academicYearId)?.name ?? "An școlar"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {allYears.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.name}{y.isActive ? " (Activ)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="h-9"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Editează
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={[
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap",
                activeTab === t.key
                  ? "border-[#1e5fa8] text-[#1e5fa8]"
                  : "border-transparent text-muted-foreground hover:text-gray-700",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Situație școlară */}
      {activeTab === "situatie" && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <Select
              value={selectedSemester === "all" ? "all" : String(selectedSemester)}
              onValueChange={(v) => { if (v) setSelectedSemester(v === "all" ? "all" : parseInt(v)); }}
            >
              <SelectTrigger className="w-44">
                <SelectValue>
                  {selectedSemester === "all" ? "Ambele semestre" : `Semestrul ${selectedSemester}`}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Ambele semestre</SelectItem>
                <SelectItem value="1">Semestrul I</SelectItem>
                <SelectItem value="2">Semestrul II</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!enrollment ? (
            <div className="rounded-xl border bg-white p-10 text-center text-muted-foreground">
              Elevul nu este înscris în acest an școlar.
            </div>
          ) : subjectSituatie.length === 0 ? (
            <div className="rounded-xl border bg-white p-10 text-center text-muted-foreground">
              Nicio notă sau absență înregistrată pentru perioada selectată.
            </div>
          ) : (
            <div className="rounded-xl border bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Materie</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="w-20">Medie</TableHead>
                    <TableHead className="w-36">Absențe motivate</TableHead>
                    <TableHead className="w-36">Absențe nemotivate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjectSituatie.map((row) => (
                    <TableRow key={row.subjectId}>
                      <TableCell className="font-medium">{row.subjectName}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {row.grades.map((g) => {
                            const val = g.valueNumeric ?? g.valueQualitative;
                            const num = g.valueNumeric ? Number(g.valueNumeric) : null;
                            const colorClass = num !== null
                              ? (num >= 5 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")
                              : "bg-gray-100 text-gray-600";
                            return (
                              <span
                                key={g.id}
                                title={`${formatRoDate(g.gradedAt)}${g.notes ? ` — ${g.notes}` : ""}`}
                                className={`px-1.5 py-0.5 text-xs rounded font-semibold ${colorClass}`}
                              >
                                {val}
                              </span>
                            );
                          })}
                          {row.grades.length === 0 && <span className="text-muted-foreground text-sm">—</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {row.average !== null ? (
                          <span className={`font-semibold text-sm ${row.average >= 5 ? "text-green-700" : "text-red-600"}`}>
                            {row.average.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-green-700 font-medium text-sm">{row.excused}</span>
                        {row.pending > 0 && <span className="text-amber-600 text-xs ml-1">({row.pending} pend.)</span>}
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium text-sm ${row.unexcused > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                          {row.unexcused}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Absențe */}
      {activeTab === "absente" && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Select
              value={selectedSemester === "all" ? "all" : String(selectedSemester)}
              onValueChange={(v) => { if (v) setSelectedSemester(v === "all" ? "all" : parseInt(v)); }}
            >
              <SelectTrigger className="w-44">
                <SelectValue>
                  {selectedSemester === "all" ? "Ambele semestre" : `Semestrul ${selectedSemester}`}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Ambele semestre</SelectItem>
                <SelectItem value="1">Semestrul I</SelectItem>
                <SelectItem value="2">Semestrul II</SelectItem>
              </SelectContent>
            </Select>
            <Select value={absenceStatusFilter} onValueChange={(v) => { if (v) setAbsenceStatusFilter(v); }}>
              <SelectTrigger className="w-44">
                <SelectValue>
                  {absenceStatusFilter === "all" ? "Toate statusurile" : ABSENCE_STATUS[absenceStatusFilter]?.label ?? absenceStatusFilter}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate statusurile</SelectItem>
                <SelectItem value="UNEXCUSED">Nemotivate</SelectItem>
                <SelectItem value="EXCUSED">Motivate</SelectItem>
                <SelectItem value="PENDING_EXCUSE">În așteptare</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredAbsences.length === 0 ? (
            <div className="rounded-xl border bg-white p-10 text-center text-muted-foreground">
              Nicio absență pentru filtrele selectate.
            </div>
          ) : (
            <div className="rounded-xl border bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Data</TableHead>
                    <TableHead>Materie</TableHead>
                    <TableHead>Ora</TableHead>
                    <TableHead>Semestru</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Motiv</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAbsences.map((a) => {
                    const st = ABSENCE_STATUS[a.status] ?? ABSENCE_STATUS.UNEXCUSED;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium whitespace-nowrap">{formatRoDate(a.absentDate)}</TableCell>
                        <TableCell>{a.subjectName}</TableCell>
                        <TableCell className="text-muted-foreground">{a.period ? `Ora ${a.period}` : "—"}</TableCell>
                        <TableCell className="text-muted-foreground">Sem. {a.semester}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${st.color}`}>{st.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                          {a.excuseReason ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Tutori */}
      {activeTab === "tutori" && (
        <div className="space-y-3">
          {guardians.length === 0 ? (
            <div className="rounded-xl border bg-white p-10 text-center text-muted-foreground">
              Niciun tutore asociat acestui elev.
            </div>
          ) : (
            <div className="rounded-xl border bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Nume</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Relație</TableHead>
                    <TableHead>Tip</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guardians.map((g) => (
                    <TableRow key={g.guardianUserId}>
                      <TableCell className="font-medium">{g.lastName} {g.firstName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{g.email}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{g.relationship ?? "—"}</TableCell>
                      <TableCell>
                        {g.isPrimary && (
                          <Badge variant="outline" className="text-xs text-blue-700 border-blue-200 bg-blue-50">
                            Principal
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Istoric școlar */}
      {activeTab === "istoric" && (
        <div className="rounded-xl border bg-white overflow-hidden">
          {enrollmentHistory.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              Nicio înregistrare istorică.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>An școlar</TableHead>
                  <TableHead>Clasă</TableHead>
                  <TableHead>Data înscrierii</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollmentHistory.map((h) => {
                  const st = STATUS_LABELS[h.status];
                  return (
                    <TableRow key={h.enrollmentId}>
                      <TableCell className="font-medium">{h.academicYearName}</TableCell>
                      <TableCell>{h.className}</TableCell>
                      <TableCell className="text-muted-foreground">{formatRoDate(h.enrolledAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${st?.color ?? ""}`}>
                          {st?.label ?? h.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* Edit modal */}
      {editOpen && (
        <EditStudentModal
          open={editOpen}
          onClose={() => {
            setEditOpen(false);
            startTransition(() => router.refresh());
          }}
          student={{
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            personalId: student.personalId,
            dateOfBirth: student.dateOfBirth,
          }}
        />
      )}
    </div>
  );
}
