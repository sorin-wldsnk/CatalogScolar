"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BookOpen,
  Users,
  UserCheck,
  Bell,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { EleviClasa } from "@/modules/academic/components/EleviClasa";
import { ClassParentsTab } from "@/modules/academic/components/ClassParentsTab";
import { GradeModal } from "./GradeModal";
import { AbsenceModal } from "./AbsenceModal";
import { excuseAbsence } from "@/modules/catalog/actions/absence.actions";
import { addObservation, deleteObservation } from "@/modules/catalog/actions/observation.actions";
import { computeAverage, getGradingScale } from "@/lib/grading";
import type { EleviClassaStudentRow } from "@/modules/academic/components/EleviClasa";
import type { ClassParentRow } from "@/modules/academic/queries/class-parents.queries";
import type { PendingAbsenceRow, ClassObservationRow } from "@/modules/catalog/queries/homeroom.queries";
import type { CatalogStudentRow } from "@/modules/catalog/queries/catalog.queries";

interface SubjectRow {
  subjectId: string;
  subjectName: string;
  assignmentId: string | null;
  teacherUserId: string | null;
}

interface AvailableClass { id: string; name: string; }

interface Props {
  classId: string;
  className: string;
  gradeLevel: number;
  academicYearId: string;
  academicYearName: string;
  schoolId: string;
  userId: string;
  // Catalog tab
  subjects: SubjectRow[];
  selectedSubjectId: string;
  selectedSemester: number;
  catalogStudents: CatalogStudentRow[];
  canEditSubject: boolean;
  // Elevi tab
  students: EleviClassaStudentRow[];
  allClasses: AvailableClass[];
  // Părinți tab
  parents: ClassParentRow[];
  // Motivări tab
  pendingAbsences: PendingAbsenceRow[];
  // Observații tab
  observations: ClassObservationRow[];
  activeTab: string;
}

type ActiveModal = { type: "grade" | "absence"; enrollmentId: string; studentName: string } | null;

const TABS = [
  { key: "catalog", label: "Catalog", icon: BookOpen },
  { key: "elevi", label: "Elevi", icon: Users },
  { key: "parinti", label: "Părinți", icon: UserCheck },
  { key: "motivari", label: "Motivări", icon: Bell },
  { key: "observatii", label: "Observații", icon: MessageSquare },
] as const;

export function ClasaMeaView({
  classId,
  className,
  gradeLevel,
  academicYearId,
  academicYearName,
  schoolId,
  userId,
  subjects,
  selectedSubjectId,
  selectedSemester,
  catalogStudents,
  canEditSubject,
  students,
  allClasses,
  parents,
  pendingAbsences: initialPendingAbsences,
  observations: initialObservations,
  activeTab: initialTab,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [isPending, startTransition] = useTransition();

  // Motivări state
  const [localAbsences, setLocalAbsences] = useState(initialPendingAbsences);
  const [excuseModal, setExcuseModal] = useState<PendingAbsenceRow | null>(null);
  const [excuseReason, setExcuseReason] = useState("");
  const [excusing, startExcuseTransition] = useTransition();

  // Observații state
  const [localObs, setLocalObs] = useState(initialObservations);
  const [addObsOpen, setAddObsOpen] = useState(false);
  const [obsEnrollmentId, setObsEnrollmentId] = useState("");
  const [obsStudentName, setObsStudentName] = useState("");
  const [obsBody, setObsBody] = useState("");
  const [deletingObsId, setDeletingObsId] = useState<string | null>(null);
  const [addingObs, startObsTransition] = useTransition();

  const gradeLevelLabel = gradeLevel === 0 ? "Pregătitoare" : `Clasa a ${gradeLevel}-a`;

  function buildUrl(params: Record<string, string | number | undefined>) {
    const url = new URLSearchParams();
    const merged = {
      tab: activeTab,
      materie: selectedSubjectId,
      sem: selectedSemester,
      ...params,
    };
    Object.entries(merged).forEach(([k, v]) => { if (v !== undefined) url.set(k, String(v)); });
    router.push(`/catalog/clasa-mea?${url.toString()}`);
  }

  function handleTabChange(tab: string) {
    setActiveTab(tab);
    router.push(`/catalog/clasa-mea?tab=${tab}&sem=${selectedSemester}&materie=${selectedSubjectId}`);
  }

  function handleExcuse() {
    if (!excuseModal || !excuseReason.trim()) return;
    startExcuseTransition(async () => {
      const result = await excuseAbsence(excuseModal.id, excuseReason.trim());
      if (result.success) {
        setLocalAbsences((prev) => prev.filter((a) => a.id !== excuseModal.id));
        toast.success(`Absența elevului ${excuseModal.studentName} a fost motivată`);
        setExcuseModal(null);
        setExcuseReason("");
      } else {
        toast.error(result.error ?? "Eroare");
      }
    });
  }

  function handleAddObservation() {
    if (!obsBody.trim() || !obsEnrollmentId) return;
    startObsTransition(async () => {
      const result = await addObservation({
        enrollmentId: obsEnrollmentId,
        academicYearId,
        semester: selectedSemester,
        body: obsBody.trim(),
        isVisibleToParent: true,
      });
      if (result.success) {
        setLocalObs((prev) => [
          ...prev,
          {
            id: (result.data as { id: string }).id,
            studentName: obsStudentName,
            teacherName: "Eu",
            body: obsBody.trim(),
            semester: selectedSemester,
            isVisibleToParent: true,
            createdAt: new Date(),
          },
        ]);
        toast.success("Observația a fost adăugată");
        setAddObsOpen(false);
        setObsBody("");
        setObsEnrollmentId("");
        setObsStudentName("");
      } else {
        toast.error(result.error ?? "Eroare");
      }
    });
  }

  function handleDeleteObservation(obsId: string) {
    setDeletingObsId(obsId);
    startTransition(async () => {
      const result = await deleteObservation(obsId);
      if (result.success) {
        setLocalObs((prev) => prev.filter((o) => o.id !== obsId));
        toast.success("Observația a fost ștearsă");
      } else {
        toast.error(result.error ?? "Eroare");
      }
      setDeletingObsId(null);
    });
  }

  const gradingScale = getGradingScale(gradeLevel);
  const pendingCount = localAbsences.length;

  const enrollmentIdByStudent = Object.fromEntries(
    catalogStudents.map((s) => [s.studentId, s.enrollmentId])
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Clasa mea — {className}</h1>
        <p className="text-muted-foreground mt-1">{gradeLevelLabel} · {academicYearName}</p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => {
            const badge = key === "motivari" && pendingCount > 0 ? pendingCount : null;
            return (
              <button
                key={key}
                onClick={() => handleTabChange(key)}
                className={[
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap",
                  activeTab === key
                    ? "border-[#1e5fa8] text-[#1e5fa8]"
                    : "border-transparent text-muted-foreground hover:text-gray-700",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {label}
                {badge && (
                  <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab: Catalog ── */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Subject selector */}
            <Select
              value={selectedSubjectId}
              onValueChange={(v) => { if (v) buildUrl({ tab: "catalog", materie: v }); }}
            >
              <SelectTrigger className="w-56">
                <SelectValue>
                  {selectedSubjectId
                    ? subjects.find((s) => s.subjectId === selectedSubjectId)?.subjectName ?? "Selectați materia"
                    : "Selectați materia"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.subjectId} value={s.subjectId}>
                    {s.subjectName}
                    {!s.assignmentId && <span className="ml-2 text-xs text-muted-foreground">(nealocat)</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Semester tabs */}
            <div className="flex rounded-lg border bg-white overflow-hidden">
              {[1, 2].map((sem) => (
                <button
                  key={sem}
                  onClick={() => buildUrl({ tab: "catalog", sem })}
                  className={[
                    "px-4 py-1.5 text-sm font-medium transition-colors",
                    selectedSemester === sem
                      ? "bg-[#1e5fa8] text-white"
                      : "text-muted-foreground hover:bg-gray-50",
                  ].join(" ")}
                >
                  Semestrul {sem}
                </button>
              ))}
            </div>
          </div>

          {!selectedSubjectId ? (
            <div className="rounded-xl border bg-white p-12 text-center text-muted-foreground">
              Selectați o materie pentru a vedea catalogul.
            </div>
          ) : catalogStudents.length === 0 ? (
            <div className="rounded-xl border bg-white p-12 text-center text-muted-foreground">
              Niciun elev înscris în această clasă.
            </div>
          ) : (
            <div className="rounded-xl border bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Elev</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Medie</TableHead>
                    <TableHead>Abs. mot.</TableHead>
                    <TableHead>Abs. nemot.</TableHead>
                    {canEditSubject && <TableHead className="text-right">Acțiuni</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catalogStudents.map((s) => {
                    const avg = computeAverage(s.grades);
                    return (
                      <TableRow key={s.enrollmentId}>
                        <TableCell className="font-medium">
                          {s.lastName} {s.firstName}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {s.grades.map((g) => (
                              <Badge
                                key={g.id}
                                variant="outline"
                                className="text-xs font-mono text-[#1e5fa8] border-[#1e5fa8]/30 bg-blue-50"
                              >
                                {g.valueNumeric ?? g.valueQualitative}
                              </Badge>
                            ))}
                            {s.grades.length === 0 && (
                              <span className="text-muted-foreground text-xs italic">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {avg ? (
                            <span className="font-semibold text-[#1e3a5f]">{avg}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{s.excusedAbsences || "—"}</TableCell>
                        <TableCell className="text-sm">
                          {s.unexcusedAbsences > 0 ? (
                            <span className="text-red-600 font-medium">{s.unexcusedAbsences}</span>
                          ) : "—"}
                        </TableCell>
                        {canEditSubject && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => setActiveModal({ type: "grade", enrollmentId: s.enrollmentId, studentName: `${s.lastName} ${s.firstName}` })}
                              >
                                + Notă
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-amber-600 hover:bg-amber-50"
                                onClick={() => setActiveModal({ type: "absence", enrollmentId: s.enrollmentId, studentName: `${s.lastName} ${s.firstName}` })}
                              >
                                + Absență
                              </Button>
                            </div>
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
      )}

      {/* ── Tab: Elevi ── */}
      {activeTab === "elevi" && (
        <EleviClasa
          classId={classId}
          className={className}
          academicYearId={academicYearId}
          academicYearName={academicYearName}
          schoolId={schoolId}
          initialStudents={students}
          allClasses={allClasses}
          canAddStudent={false}
        />
      )}

      {/* ── Tab: Părinți ── */}
      {activeTab === "parinti" && (
        <ClassParentsTab
          classId={classId}
          className={className}
          academicYearId={academicYearId}
          academicYearName={academicYearName}
          parents={parents}
        />
      )}

      {/* ── Tab: Motivări ── */}
      {activeTab === "motivari" && (
        <div className="space-y-4">
          {localAbsences.length === 0 ? (
            <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground text-sm">
              Nu există absențe nemotivate în această clasă.
            </div>
          ) : (
            <div className="rounded-xl border bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Elev</TableHead>
                    <TableHead>Materie</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ora</TableHead>
                    <TableHead>Profesor</TableHead>
                    <TableHead className="text-right">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localAbsences.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.studentName}</TableCell>
                      <TableCell>{a.subjectName}</TableCell>
                      <TableCell className="text-sm">{a.absentDate}</TableCell>
                      <TableCell className="text-sm">{a.period ? `Ora ${a.period}` : "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.teacherName}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                            disabled={excusing}
                            onClick={() => { setExcuseModal(a); setExcuseReason(""); }}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Motivează
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <Dialog open={!!excuseModal} onOpenChange={(o) => { if (!o) setExcuseModal(null); }}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Motivează absența — {excuseModal?.studentName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {excuseModal?.subjectName} · {excuseModal?.absentDate}
                </p>
                <Textarea
                  placeholder="Motivul (ex: certificat medical, cerere aprobată...)"
                  value={excuseReason}
                  onChange={(e) => setExcuseReason(e.target.value)}
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setExcuseModal(null)} disabled={excusing}>
                  Anulează
                </Button>
                <Button
                  onClick={handleExcuse}
                  disabled={!excuseReason.trim() || excusing}
                  className="bg-green-700 hover:bg-green-800 text-white"
                >
                  {excusing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmă motivarea"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ── Tab: Observații ── */}
      {activeTab === "observatii" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white"
              onClick={() => setAddObsOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Observație nouă
            </Button>
          </div>

          {localObs.length === 0 ? (
            <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground text-sm">
              Nicio observație înregistrată.
            </div>
          ) : (
            <div className="rounded-xl border bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Elev</TableHead>
                    <TableHead>Observație</TableHead>
                    <TableHead>Profesor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localObs.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.studentName}</TableCell>
                      <TableCell className="max-w-xs text-sm">{o.body}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{o.teacherName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {o.createdAt ? new Date(o.createdAt).toLocaleDateString("ro-RO") : "—"}
                      </TableCell>
                      <TableCell>
                        {(o.teacherName === "Eu" || o.teacherName.includes(userId)) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:bg-red-50"
                            disabled={isPending && deletingObsId === o.id}
                            onClick={() => handleDeleteObservation(o.id)}
                          >
                            {isPending && deletingObsId === o.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Dialog: Adaugă observație */}
          <Dialog open={addObsOpen} onOpenChange={(o) => { if (!o) setAddObsOpen(false); }}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Observație nouă</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Select
                  value={obsEnrollmentId}
                  onValueChange={(v) => {
                    if (v) {
                      setObsEnrollmentId(v);
                      const s = students.find((st) => enrollmentIdByStudent[st.id] === v);
                      setObsStudentName(s ? `${s.lastName} ${s.firstName}` : "");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {obsEnrollmentId
                        ? obsStudentName || "Elev selectat"
                        : "Selectați elevul"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => {
                      const eId = enrollmentIdByStudent[s.id];
                      if (!eId) return null;
                      return (
                        <SelectItem key={s.id} value={eId}>
                          {s.lastName} {s.firstName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Observația..."
                  value={obsBody}
                  onChange={(e) => setObsBody(e.target.value)}
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddObsOpen(false)} disabled={addingObs}>
                  Anulează
                </Button>
                <Button
                  onClick={handleAddObservation}
                  disabled={!obsBody.trim() || !obsEnrollmentId || addingObs}
                  className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white"
                >
                  {addingObs ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvează"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Grade / Absence modals */}
      {activeModal?.type === "grade" && (
        <GradeModal
          open={true}
          onClose={() => setActiveModal(null)}
          enrollmentId={activeModal.enrollmentId}
          studentName={activeModal.studentName}
          subjectId={selectedSubjectId}
          academicYearId={academicYearId}
          semester={selectedSemester}
          scale={gradingScale}
        />
      )}
      {activeModal?.type === "absence" && (
        <AbsenceModal
          open={true}
          onClose={() => setActiveModal(null)}
          enrollmentId={activeModal.enrollmentId}
          studentName={activeModal.studentName}
          subjectId={selectedSubjectId}
          academicYearId={academicYearId}
          semester={selectedSemester}
        />
      )}
    </div>
  );
}
