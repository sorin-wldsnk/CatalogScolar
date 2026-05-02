"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { excuseAbsence } from "@/modules/catalog/actions/absence.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { GRADE_TYPE_LABELS } from "@/lib/grading";

interface GradeRow {
  id: string;
  subjectName: string;
  subjectCode: string;
  semester: number;
  valueNumeric: string | null;
  valueQualitative: string | null;
  gradeType: string;
  weight: string;
  gradedAt: string;
  notes: string | null;
}

interface AbsenceRow {
  id: string;
  subjectName: string;
  subjectCode: string;
  semester: number;
  absentDate: string;
  period: number | null;
  status: string;
  excuseReason: string | null;
}

interface Props {
  studentName: string;
  className: string;
  grades: GradeRow[];
  absences: AbsenceRow[];
  canExcuse: boolean;
}

const ABSENCE_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  UNEXCUSED: { label: "Nemotivată", color: "bg-red-100 text-red-700 border-red-200" },
  EXCUSED: { label: "Motivată", color: "bg-green-100 text-green-700 border-green-200" },
  PENDING_EXCUSE: { label: "În așteptare", color: "bg-amber-100 text-amber-700 border-amber-200" },
};

export function StudentCatalogView({ studentName, className, grades, absences, canExcuse }: Props) {
  const [activeTab, setActiveTab] = useState<"note" | "absente">("note");
  const [excuseModal, setExcuseModal] = useState<{ id: string; date: string } | null>(null);
  const [excuseReason, setExcuseReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleExcuse() {
    if (!excuseModal || !excuseReason.trim()) return;
    startTransition(async () => {
      const result = await excuseAbsence(excuseModal.id, excuseReason);
      if (result.success) {
        toast.success("Absența a fost motivată");
        setExcuseModal(null);
        setExcuseReason("");
      } else {
        toast.error(result.error ?? "Eroare");
      }
    });
  }

  const sem1Grades = grades.filter((g) => g.semester === 1);
  const sem2Grades = grades.filter((g) => g.semester === 2);
  const sem1Absences = absences.filter((a) => a.semester === 1);
  const sem2Absences = absences.filter((a) => a.semester === 2);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">{studentName}</h1>
        <p className="text-muted-foreground mt-1">{className}</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0">
          {(["note", "absente"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                activeTab === tab
                  ? "border-[#1e5fa8] text-[#1e5fa8]"
                  : "border-transparent text-muted-foreground hover:text-gray-700",
              ].join(" ")}
            >
              {tab === "note" ? `Note (${grades.length})` : `Absențe (${absences.length})`}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "note" && (
        <div className="space-y-6">
          {([1, 2] as const).map((sem) => {
            const semGrades = sem === 1 ? sem1Grades : sem2Grades;
            return (
              <div key={sem}>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Semestrul {sem}
                </h3>
                {semGrades.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nicio notă înregistrată.</p>
                ) : (
                  <div className="rounded-xl border bg-white overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>Materie</TableHead>
                          <TableHead>Notă</TableHead>
                          <TableHead>Tip</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Observație</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {semGrades.map((g) => {
                          const val = g.valueNumeric ?? g.valueQualitative;
                          const num = g.valueNumeric ? Number(g.valueNumeric) : null;
                          const colorClass = num !== null
                            ? (num >= 5 ? "text-green-700" : "text-red-600")
                            : "text-gray-700";
                          return (
                            <TableRow key={g.id}>
                              <TableCell>
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="text-xs font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-600">
                                    {g.subjectCode}
                                  </span>
                                  {g.subjectName}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className={`font-bold ${colorClass}`}>{val}</span>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {GRADE_TYPE_LABELS[g.gradeType] ?? g.gradeType}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {g.gradedAt}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {g.notes ?? "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "absente" && (
        <div className="space-y-6">
          {([1, 2] as const).map((sem) => {
            const semAbs = sem === 1 ? sem1Absences : sem2Absences;
            return (
              <div key={sem}>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Semestrul {sem}
                </h3>
                {semAbs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nicio absență înregistrată.</p>
                ) : (
                  <div className="rounded-xl border bg-white overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>Materie</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Ora</TableHead>
                          <TableHead>Status</TableHead>
                          {canExcuse && <TableHead className="w-24" />}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {semAbs.map((a) => {
                          const statusInfo = ABSENCE_STATUS_LABEL[a.status];
                          return (
                            <TableRow key={a.id}>
                              <TableCell>
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="text-xs font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-600">
                                    {a.subjectCode}
                                  </span>
                                  {a.subjectName}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm">{a.absentDate}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {a.period ? `Ora ${a.period}` : "—"}
                              </TableCell>
                              <TableCell>
                                <Badge className={`text-xs border ${statusInfo?.color}`}>
                                  {statusInfo?.label ?? a.status}
                                </Badge>
                              </TableCell>
                              {canExcuse && (
                                <TableCell>
                                  {a.status === "UNEXCUSED" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs"
                                      onClick={() => setExcuseModal({ id: a.id, date: a.absentDate })}
                                    >
                                      Motivează
                                    </Button>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Excuse modal */}
      <Dialog open={!!excuseModal} onOpenChange={(o) => { if (!o) { setExcuseModal(null); setExcuseReason(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Motivează absența din {excuseModal?.date}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Motiv</Label>
              <Input
                placeholder="ex: boală, eveniment familial..."
                value={excuseReason}
                onChange={(e) => setExcuseReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setExcuseModal(null); setExcuseReason(""); }} disabled={isPending}>
              Anulează
            </Button>
            <Button
              onClick={handleExcuse}
              disabled={!excuseReason.trim() || isPending}
              className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Motivează"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
