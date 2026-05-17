"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, CalendarX2, ChevronRight, List } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { GradeModal } from "./GradeModal";
import { AbsenceModal } from "./AbsenceModal";
import { AbsenceListModal } from "./AbsenceListModal";
import { HomeroomTabs } from "./HomeroomTabs";
import { computeAverage, getGradingScale } from "@/lib/grading";
import { usePermissions } from "@/lib/permissions";
import type { CatalogStudentRow } from "@/modules/catalog/queries/catalog.queries";
import type { PendingAbsenceRow, ClassObservationRow } from "@/modules/catalog/queries/homeroom.queries";

interface ClassRow { id: string; name: string; }
interface SubjectRow { id: string; name: string; }

interface Props {
  teacherClasses: ClassRow[];
  teacherSubjects: SubjectRow[];
  selectedClassId: string;
  selectedSubjectId: string;
  selectedSemester: number;
  gradeLevel: number | null;
  academicYearId: string;
  students: CatalogStudentRow[];
  isHomeroom?: boolean;
  homeroomClassId?: string | null;
  pendingAbsences?: PendingAbsenceRow[];
  classObservations?: ClassObservationRow[];
  roles?: string[];
}

interface ActiveModal {
  type: "grade" | "absence";
  enrollmentId: string;
  studentName: string;
}

interface AbsenceListTarget {
  studentName: string;
  row: CatalogStudentRow;
}

export function CatalogView({
  teacherClasses,
  teacherSubjects,
  selectedClassId,
  selectedSubjectId,
  selectedSemester,
  gradeLevel,
  academicYearId,
  students,
  isHomeroom = false,
  homeroomClassId,
  pendingAbsences = [],
  classObservations = [],
  roles = [],
}: Props) {
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);
  const [absenceListTarget, setAbsenceListTarget] = useState<AbsenceListTarget | null>(null);
  const [homeroomTab, setHomeroomTab] = useState<"motivari" | "observatii">("motivari");
  const { canAddGrade, canAddAbsence } = usePermissions(roles);
  const isAdmin = roles.includes("ADMIN");
  const canDeleteToday = roles.some((r) => ["TEACHER", "HOMEROOM", "ADMIN"].includes(r));

  const isViewingHomeroomClass = isHomeroom && homeroomClassId && selectedClassId === homeroomClassId;

  function buildUrl(params: Record<string, string | number | undefined>) {
    const url = new URLSearchParams();
    const merged = {
      clasa: selectedClassId,
      materie: selectedSubjectId,
      sem: selectedSemester,
      ...params,
    };
    Object.entries(merged).forEach(([k, v]) => { if (v) url.set(k, String(v)); });
    router.push(`/catalog?${url.toString()}`);
  }

  const scale = gradeLevel !== null ? getGradingScale(gradeLevel) : "NUMERIC";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Catalog</h1>
        <p className="text-muted-foreground mt-1">Registrul de note și absențe</p>
      </div>

      {/* Selectors */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={selectedClassId || "none"}
          onValueChange={(v) => { if (v && v !== "none") buildUrl({ clasa: v, materie: undefined }); }}
        >
          <SelectTrigger className="w-40">
            <SelectValue>
              {selectedClassId
                ? (teacherClasses.find((c) => c.id === selectedClassId)?.name ?? "Selectați clasa")
                : "Selectați clasa"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {teacherClasses.length === 0 ? (
              <SelectItem value="none" disabled>Nicio clasă</SelectItem>
            ) : (
              teacherClasses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <Select
          value={selectedSubjectId || "none"}
          onValueChange={(v) => { if (v && v !== "none") buildUrl({ materie: v }); }}
          disabled={!selectedClassId}
        >
          <SelectTrigger className="w-44">
            <SelectValue>
              {selectedSubjectId
                ? (teacherSubjects.find((s) => s.id === selectedSubjectId)?.name ?? "Selectați materia")
                : "Selectați materia"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {teacherSubjects.length === 0 ? (
              <SelectItem value="none" disabled>Nicio materie</SelectItem>
            ) : (
              teacherSubjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Semester + homeroom tabs */}
      {selectedClassId && (
        <div className="border-b border-gray-200">
          <div className="flex gap-0">
            {([1, 2] as const).map((sem) => (
              <button
                key={sem}
                onClick={() => buildUrl({ sem })}
                className={[
                  "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                  selectedSemester === sem && !homeroomTab
                    ? "border-[#1e5fa8] text-[#1e5fa8]"
                    : "border-transparent text-muted-foreground hover:text-gray-700",
                ].join(" ")}
              >
                Semestrul {sem}
              </button>
            ))}
            {isViewingHomeroomClass && (
              <>
                <button
                  onClick={() => setHomeroomTab("motivari")}
                  className={[
                    "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                    homeroomTab === "motivari"
                      ? "border-[#1e5fa8] text-[#1e5fa8]"
                      : "border-transparent text-muted-foreground hover:text-gray-700",
                  ].join(" ")}
                >
                  Motivări în așteptare
                  {pendingAbsences.length > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
                      {pendingAbsences.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setHomeroomTab("observatii")}
                  className={[
                    "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                    homeroomTab === "observatii"
                      ? "border-[#1e5fa8] text-[#1e5fa8]"
                      : "border-transparent text-muted-foreground hover:text-gray-700",
                  ].join(" ")}
                >
                  Observații clasă
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Homeroom special tabs */}
      {isViewingHomeroomClass && (homeroomTab === "motivari" || homeroomTab === "observatii") && (
        <HomeroomTabs
          activeTab={homeroomTab}
          pendingAbsences={pendingAbsences}
          observations={classObservations}
          enrollmentIdByStudent={{}}
          academicYearId={academicYearId}
          semester={selectedSemester}
          classId={selectedClassId}
        />
      )}

      {/* Empty state */}
      {(!selectedClassId || !selectedSubjectId) && !(isViewingHomeroomClass && (homeroomTab === "motivari" || homeroomTab === "observatii")) && (
        <div className="rounded-xl border bg-white p-12 text-center text-muted-foreground">
          Selectați clasa și materia pentru a vizualiza catalogul.
        </div>
      )}

      {/* Grade table */}
      {selectedClassId && selectedSubjectId && !(isViewingHomeroomClass && (homeroomTab === "motivari" || homeroomTab === "observatii")) && (
        <>
          {students.length === 0 ? (
            <div className="rounded-xl border bg-white p-12 text-center text-muted-foreground">
              Niciun elev înscris în această clasă.
            </div>
          ) : (
            <div className="rounded-xl border bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-48">Elev</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="w-20">Medie</TableHead>
                    <TableHead className="w-32">Absențe</TableHead>
                    <TableHead className="w-28 text-right">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => {
                    const avg = scale === "NUMERIC" ? computeAverage(s.grades) : null;
                    const totalAbsences = s.excusedAbsences + s.unexcusedAbsences + s.pendingAbsences;
                    return (
                      <TableRow key={s.enrollmentId}>
                        <TableCell className="font-medium">
                          {s.lastName} {s.firstName}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {s.grades.map((g) => {
                              const val = g.valueNumeric ?? g.valueQualitative;
                              const isNumeric = g.valueNumeric !== null;
                              const num = isNumeric ? Number(g.valueNumeric) : null;
                              const colorClass = isNumeric
                                ? (num !== null && num >= 5 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")
                                : "bg-gray-100 text-gray-600";
                              return (
                                <span
                                  key={g.id}
                                  title={`${g.gradedAt}${g.notes ? ` — ${g.notes}` : ""}`}
                                  className={`inline-block px-1.5 py-0.5 text-xs rounded font-semibold ${colorClass}`}
                                >
                                  {val}
                                </span>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          {avg !== null ? (
                            <span className={`font-semibold text-sm ${avg >= 5 ? "text-green-700" : "text-red-600"}`}>
                              {avg.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <button
                            className="flex items-center gap-1 group"
                            title="Vezi absențe"
                            onClick={() => setAbsenceListTarget({
                              studentName: `${s.lastName} ${s.firstName}`,
                              row: s,
                            })}
                          >
                            {totalAbsences > 0 ? (
                              <span className="text-sm group-hover:underline underline-offset-2">
                                <span className="text-red-600 font-medium">{s.unexcusedAbsences}</span>
                                <span className="text-muted-foreground"> / </span>
                                <span className="text-green-700">{s.excusedAbsences}</span>
                                {s.pendingAbsences > 0 && (
                                  <span className="text-amber-600 ml-1">({s.pendingAbsences} pend.)</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm group-hover:underline underline-offset-2">0</span>
                            )}
                            <List className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canAddGrade && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0"
                                title="Notă nouă"
                                onClick={() =>
                                  setActiveModal({
                                    type: "grade",
                                    enrollmentId: s.enrollmentId,
                                    studentName: `${s.lastName} ${s.firstName}`,
                                  })
                                }
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canAddAbsence && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200"
                                title="Absență nouă"
                                onClick={() =>
                                  setActiveModal({
                                    type: "absence",
                                    enrollmentId: s.enrollmentId,
                                    studentName: `${s.lastName} ${s.firstName}`,
                                  })
                                }
                              >
                                <CalendarX2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Link
                              href={`/catalog/${selectedClassId}/${s.studentId}`}
                              className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
                              title="Fișa elevului"
                            >
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {activeModal?.type === "grade" && (
        <GradeModal
          open
          onClose={() => setActiveModal(null)}
          enrollmentId={activeModal.enrollmentId}
          subjectId={selectedSubjectId}
          academicYearId={academicYearId}
          semester={selectedSemester}
          studentName={activeModal.studentName}
          scale={scale}
        />
      )}
      {activeModal?.type === "absence" && (
        <AbsenceModal
          open
          onClose={() => setActiveModal(null)}
          enrollmentId={activeModal.enrollmentId}
          subjectId={selectedSubjectId}
          academicYearId={academicYearId}
          semester={selectedSemester}
          studentName={activeModal.studentName}
        />
      )}
      {absenceListTarget && (
        <AbsenceListModal
          open
          onClose={() => setAbsenceListTarget(null)}
          studentName={absenceListTarget.studentName}
          subjectName={teacherSubjects.find((s) => s.id === selectedSubjectId)?.name ?? "Materie"}
          absences={absenceListTarget.row.absences}
          isAdmin={isAdmin}
          canDeleteToday={canDeleteToday}
        />
      )}
    </div>
  );
}
