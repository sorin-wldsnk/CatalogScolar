"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GRADE_TYPE_LABELS } from "@/lib/grading";

interface AbsenceItem {
  id: string;
  absentDate: string | null;
  period: number | null;
  status: string;
  excuseReason: string | null;
}

interface SubjectSummary {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  grades: Array<{
    id: string;
    valueNumeric: string | null;
    valueQualitative: string | null;
    gradeType: string;
    weight: string | null;
    gradedAt: string | null;
    notes: string | null;
  }>;
  absences?: AbsenceItem[];
  average: number | null;
  excusedAbsences: number;
  unexcusedAbsences: number;
}

interface Props {
  studentName: string;
  className: string;
  gradeLevel: number;
  subjects: SubjectSummary[];
  semester: number;
}

const ABSENCE_LABEL: Record<string, { label: string; color: string }> = {
  UNEXCUSED: { label: "Nemotivată", color: "bg-red-100 text-red-700 border-red-200" },
  EXCUSED: { label: "Motivată", color: "bg-green-100 text-green-700 border-green-200" },
  PENDING_EXCUSE: { label: "În așteptare", color: "bg-amber-100 text-amber-700 border-amber-200" },
};

const RO_MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];

function formatRoDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("-");
  if (!year || !month || !day) return dateStr;
  return `${parseInt(day)} ${RO_MONTHS[parseInt(month) - 1]} ${year}`;
}

export function ParentView({ studentName, className, subjects, semester }: Props) {
  const router = useRouter();
  const [selectedSubject, setSelectedSubject] = useState<SubjectSummary | null>(null);

  function changeSemester(sem: number) {
    router.push(`/panou-parinte?sem=${sem}`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">{studentName}</h1>
        <p className="text-muted-foreground mt-1">{className}</p>
      </div>

      {/* Semester selector */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0">
          {([1, 2] as const).map((sem) => (
            <button
              key={sem}
              onClick={() => changeSemester(sem)}
              className={[
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                semester === sem
                  ? "border-[#1e5fa8] text-[#1e5fa8]"
                  : "border-transparent text-muted-foreground hover:text-gray-700",
              ].join(" ")}
            >
              Semestrul {sem}
            </button>
          ))}
        </div>
      </div>

      {subjects.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center text-muted-foreground">
          Nu există note sau absențe înregistrate pentru semestrul selectat.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => {
            const hasUnexcused = s.unexcusedAbsences > 0;
            return (
              <Card
                key={s.subjectId}
                className="cursor-pointer hover:shadow-md transition-shadow border hover:border-[#1e5fa8]/30"
                onClick={() => setSelectedSubject(s)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center justify-between">
                    <span>{s.subjectName}</span>
                    <span className="text-xs font-mono text-gray-400">{s.subjectCode}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Average */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Medie</span>
                    {s.average !== null ? (
                      <span className={`text-xl font-bold ${s.average >= 5 ? "text-green-700" : "text-red-600"}`}>
                        {s.average.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-xl font-bold text-gray-400">—</span>
                    )}
                  </div>

                  {/* Grade chips */}
                  {s.grades.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {s.grades.map((g) => {
                        const val = g.valueNumeric ?? g.valueQualitative;
                        const num = g.valueNumeric ? Number(g.valueNumeric) : null;
                        const colorClass = num !== null
                          ? (num >= 5 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")
                          : "bg-gray-100 text-gray-600";
                        return (
                          <span key={g.id} className={`px-1.5 py-0.5 text-xs rounded font-semibold ${colorClass}`}>
                            {val}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Absences */}
                  {(s.unexcusedAbsences > 0 || s.excusedAbsences > 0) && (
                    <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                      {s.unexcusedAbsences > 0 && (
                        <span className="text-xs text-red-600 font-medium">
                          {s.unexcusedAbsences} nemotivate
                        </span>
                      )}
                      {s.excusedAbsences > 0 && (
                        <span className="text-xs text-green-700">
                          {s.excusedAbsences} motivate
                        </span>
                      )}
                    </div>
                  )}

                  {hasUnexcused && (
                    <div className="text-xs text-red-600 font-medium bg-red-50 rounded px-2 py-1">
                      Atenție: absențe nemotivate
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Subject detail modal */}
      <Dialog open={!!selectedSubject} onOpenChange={(o) => { if (!o) setSelectedSubject(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSubject?.subjectName}</DialogTitle>
          </DialogHeader>

          {selectedSubject && (
            <div className="space-y-6">
              {/* Grades */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Note</h3>
                {selectedSubject.grades.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nicio notă înregistrată.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Notă</TableHead>
                        <TableHead>Tip</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Observație</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSubject.grades.map((g) => {
                        const val = g.valueNumeric ?? g.valueQualitative;
                        const num = g.valueNumeric ? Number(g.valueNumeric) : null;
                        const colorClass = num !== null
                          ? (num >= 5 ? "text-green-700" : "text-red-600")
                          : "text-gray-700";
                        return (
                          <TableRow key={g.id}>
                            <TableCell>
                              <span className={`font-bold ${colorClass}`}>{val}</span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {GRADE_TYPE_LABELS[g.gradeType] ?? g.gradeType}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{g.gradedAt}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{g.notes ?? "—"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Average */}
              {selectedSubject.average !== null && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Medie</span>
                  <span className={`text-lg font-bold ${selectedSubject.average >= 5 ? "text-green-700" : "text-red-600"}`}>
                    {selectedSubject.average.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Absences */}
              {(selectedSubject.absences?.length ?? 0) > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Absențe ({selectedSubject.absences!.length})
                  </h3>
                  <div className="space-y-1.5">
                    {selectedSubject.absences!.map((a) => {
                      const cfg = ABSENCE_LABEL[a.status] ?? ABSENCE_LABEL.UNEXCUSED;
                      return (
                        <div key={a.id} className="flex items-center gap-2 text-sm rounded-lg border px-3 py-2">
                          <span className="font-medium shrink-0">{formatRoDate(a.absentDate)}</span>
                          {a.period && (
                            <span className="text-muted-foreground shrink-0 text-xs">• ora {a.period}</span>
                          )}
                          <Badge className={`text-xs border shrink-0 ${cfg.color}`}>{cfg.label}</Badge>
                          {a.excuseReason && (
                            <span className="text-muted-foreground text-xs truncate">— {a.excuseReason}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
