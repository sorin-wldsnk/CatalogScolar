"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, UserX, ArrowRightLeft, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { AssignTeacherModal } from "./AssignTeacherModal";
import { ClassParentsTab } from "./ClassParentsTab";
import {
  enrollStudent,
  transferStudent,
  withdrawStudent,
} from "@/modules/academic/actions/student.actions";
import { assignHomeroomTeacher } from "@/modules/academic/actions/class.actions";
import { removeClassSubjectTeacher } from "@/modules/academic/actions/teaching-assignment.actions";
import type { ClassParentRow } from "@/modules/academic/queries/class-parents.queries";

interface SubjectRow {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  assignmentId: string | null;
  teacherUserId: string | null;
  teacherFirstName: string | null;
  teacherLastName: string | null;
}

interface StudentRow {
  id: string;
  firstName: string;
  lastName: string;
  enrollmentId: string;
  status: string;
}

interface UnenrolledStudent {
  id: string;
  firstName: string;
  lastName: string;
}

interface Teacher { id: string; firstName: string; lastName: string; }

interface AvailableClass { id: string; name: string; }

interface Props {
  classId: string;
  className: string;
  gradeLevel: number;
  academicYearId: string;
  academicYearName: string;
  homeroomTeacherId: string | null;
  homeroomTeacherName: string | null;
  subjects: SubjectRow[];
  students: StudentRow[];
  unenrolledStudents: UnenrolledStudent[];
  teachers: Teacher[];
  parents: ClassParentRow[];
  allClasses: AvailableClass[];
}

export function ClassDetailView({
  classId,
  className,
  gradeLevel,
  academicYearId,
  academicYearName,
  homeroomTeacherId,
  homeroomTeacherName,
  subjects,
  students: initialStudents,
  unenrolledStudents,
  teachers,
  parents,
  allClasses,
}: Props) {
  const [activeTab, setActiveTab] = useState<"elevi" | "incadrari" | "parinti">("elevi");
  const [assignModal, setAssignModal] = useState<SubjectRow | null>(null);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [removingAssignmentId, setRemovingAssignmentId] = useState<string | null>(null);

  // State local elevi (pentru actualizare optimistă)
  const [students, setStudents] = useState<StudentRow[]>(initialStudents);

  // Diriginte
  const [currentHomeroomId, setCurrentHomeroomId] = useState<string | null>(homeroomTeacherId);
  const [currentHomeroomName, setCurrentHomeroomName] = useState<string | null>(homeroomTeacherName);
  const [homeroomModalOpen, setHomeroomModalOpen] = useState(false);
  const [selectedHomeroomId, setSelectedHomeroomId] = useState<string>(homeroomTeacherId ?? "");
  const [savingHomeroom, startHomeroomTransition] = useTransition();

  // Transfer elev
  const [transferTarget, setTransferTarget] = useState<StudentRow | null>(null);
  const [selectedTransferClassId, setSelectedTransferClassId] = useState<string>("");
  const [transferring, startTransferTransition] = useTransition();

  // Retragere elev
  const [withdrawTarget, setWithdrawTarget] = useState<StudentRow | null>(null);
  const [withdrawing, startWithdrawTransition] = useTransition();

  function handleEnrollStudent() {
    if (!selectedStudentId) return;
    startTransition(async () => {
      const result = await enrollStudent(selectedStudentId, classId, academicYearId);
      if (result.success) {
        toast.success("Elevul a fost adăugat în clasă");
        setAddStudentOpen(false);
        setSelectedStudentId("");
      } else {
        toast.error(result.error ?? "Eroare");
      }
    });
  }

  function handleSaveHomeroom() {
    startHomeroomTransition(async () => {
      const teacherId = selectedHomeroomId || null;
      const result = await assignHomeroomTeacher(classId, teacherId);
      if (result.success) {
        const teacher = teacherId ? teachers.find((t) => t.id === teacherId) : null;
        setCurrentHomeroomId(teacherId);
        setCurrentHomeroomName(teacher ? `${teacher.firstName} ${teacher.lastName}` : null);
        toast.success("Dirigintele a fost salvat");
        setHomeroomModalOpen(false);
      } else {
        toast.error(result.error ?? "Eroare");
      }
    });
  }

  function handleTransfer() {
    if (!transferTarget || !selectedTransferClassId) return;
    startTransferTransition(async () => {
      const result = await transferStudent(
        transferTarget.enrollmentId,
        selectedTransferClassId,
        classId,
        academicYearId
      );
      if (result.success) {
        setStudents((prev) => prev.filter((s) => s.enrollmentId !== transferTarget.enrollmentId));
        toast.success("Elevul a fost mutat în altă clasă");
        setTransferTarget(null);
        setSelectedTransferClassId("");
      } else {
        toast.error(result.error ?? "Eroare");
      }
    });
  }

  function handleWithdraw() {
    if (!withdrawTarget) return;
    startWithdrawTransition(async () => {
      const result = await withdrawStudent(withdrawTarget.enrollmentId, withdrawTarget.id, classId);
      if (result.success) {
        setStudents((prev) => prev.filter((s) => s.enrollmentId !== withdrawTarget.enrollmentId));
        toast.success("Elevul a fost retras din școală");
        setWithdrawTarget(null);
      } else {
        toast.error(result.error ?? "Eroare");
      }
    });
  }

  function handleRemoveAssignment(assignmentId: string) {
    setRemovingAssignmentId(assignmentId);
    startTransition(async () => {
      const result = await removeClassSubjectTeacher(assignmentId, classId);
      if (result.success) {
        toast.success("Profesorul a fost eliminat");
      } else {
        toast.error(result.error ?? "Eroare");
      }
      setRemovingAssignmentId(null);
    });
  }

  const gradeLevelLabel = gradeLevel === 0 ? "Pregătitoare" : `Clasa ${gradeLevel}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">{className}</h1>
          <p className="text-muted-foreground mt-1">{gradeLevelLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Diriginte</p>
            <p className="text-sm font-medium">
              {currentHomeroomName ?? <span className="italic text-muted-foreground">Nealocat</span>}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => {
              setSelectedHomeroomId(currentHomeroomId ?? "");
              setHomeroomModalOpen(true);
            }}
          >
            <UserCheck className="h-3.5 w-3.5 mr-1.5" />
            {currentHomeroomName ? "Schimbă" : "Alocă"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0">
          {(["elevi", "incadrari", "parinti"] as const).map((tab) => {
            const label =
              tab === "elevi" ? `Elevi (${students.length})`
              : tab === "incadrari" ? `Încadrări (${subjects.filter((s) => s.assignmentId).length}/${subjects.length})`
              : `Părinți (${parents.length})`;
            return (
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
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab: Elevi */}
      {activeTab === "elevi" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setAddStudentOpen(true)}
              disabled={unenrolledStudents.length === 0}
              className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adaugă elev
            </Button>
          </div>

          {students.length === 0 ? (
            <div className="rounded-xl border bg-white p-12 text-center text-muted-foreground">
              Niciun elev înscris în această clasă.
            </div>
          ) : (
            <div className="rounded-xl border bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Nume</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {s.lastName} {s.firstName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => { setTransferTarget(s); setSelectedTransferClassId(""); }}
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                            Mută
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-red-50"
                            onClick={() => setWithdrawTarget(s)}
                          >
                            <UserX className="h-3.5 w-3.5 mr-1" />
                            Retras
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Dialog: Adaugă elev */}
          <Dialog open={addStudentOpen} onOpenChange={(o) => { if (!o) { setAddStudentOpen(false); setSelectedStudentId(""); } }}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Adaugă elev în {className}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Select
                  value={selectedStudentId}
                  onValueChange={(v) => { if (v) setSelectedStudentId(v); }}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {selectedStudentId
                        ? (() => {
                            const s = unenrolledStudents.find((u) => u.id === selectedStudentId);
                            return s ? `${s.lastName} ${s.firstName}` : "Selectați elevul";
                          })()
                        : "Selectați elevul"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {unenrolledStudents.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.lastName} {s.firstName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setAddStudentOpen(false); setSelectedStudentId(""); }} disabled={isPending}>
                  Anulează
                </Button>
                <Button
                  onClick={handleEnrollStudent}
                  disabled={!selectedStudentId || isPending}
                  className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adaugă"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog: Mută în altă clasă */}
          <Dialog open={!!transferTarget} onOpenChange={(o) => { if (!o) { setTransferTarget(null); setSelectedTransferClassId(""); } }}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Mută elev în altă clasă</DialogTitle>
                <DialogDescription>
                  {transferTarget && `${transferTarget.lastName} ${transferTarget.firstName} va fi transferat. Notele și absențele rămân în clasa curentă.`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                {allClasses.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Nu există alte clase disponibile în acest an școlar.
                  </p>
                ) : (
                  <Select
                    value={selectedTransferClassId}
                    onValueChange={(v) => { if (v) setSelectedTransferClassId(v); }}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {selectedTransferClassId
                          ? allClasses.find((c) => c.id === selectedTransferClassId)?.name ?? "Selectați clasa"
                          : "Selectați clasa destinație"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {allClasses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setTransferTarget(null); setSelectedTransferClassId(""); }} disabled={transferring}>
                  Anulează
                </Button>
                <Button
                  onClick={handleTransfer}
                  disabled={!selectedTransferClassId || transferring}
                  className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white"
                >
                  {transferring ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mută"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog: Retragere elev */}
          <Dialog open={!!withdrawTarget} onOpenChange={(o) => { if (!o) setWithdrawTarget(null); }}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Retragere din școală</DialogTitle>
                <DialogDescription>
                  {withdrawTarget && (
                    <>
                      Ești sigur că vrei să retragi elevul{" "}
                      <strong>{withdrawTarget.lastName} {withdrawTarget.firstName}</strong>{" "}
                      din școală? Această acțiune nu poate fi anulată.
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setWithdrawTarget(null)} disabled={withdrawing}>
                  Anulează
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleWithdraw}
                  disabled={withdrawing}
                >
                  {withdrawing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Retrag elevul"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Tab: Încadrări */}
      {activeTab === "incadrari" && (
        <div className="rounded-xl border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Materie</TableHead>
                <TableHead>Profesor</TableHead>
                <TableHead className="text-right">Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map((s) => (
                <TableRow key={s.subjectId}>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                        {s.subjectCode}
                      </span>
                      {s.subjectName}
                    </span>
                  </TableCell>
                  <TableCell>
                    {s.teacherLastName ? (
                      <span className="font-medium">
                        {s.teacherLastName} {s.teacherFirstName}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic text-sm">Nealocat</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setAssignModal(s)}
                      >
                        {s.assignmentId ? "Schimbă" : "Alocă profesor"}
                      </Button>
                      {s.assignmentId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-red-50"
                          disabled={isPending && removingAssignmentId === s.assignmentId}
                          onClick={() => handleRemoveAssignment(s.assignmentId!)}
                        >
                          {isPending && removingAssignmentId === s.assignmentId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Tab: Părinți */}
      {activeTab === "parinti" && (
        <ClassParentsTab
          classId={classId}
          className={className}
          academicYearId={academicYearId}
          academicYearName={academicYearName}
          parents={parents}
        />
      )}

      {/* Modal: Alocare diriginte */}
      <Dialog open={homeroomModalOpen} onOpenChange={(o) => { if (!o) setHomeroomModalOpen(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {currentHomeroomName ? "Schimbă dirigintele" : "Alocă diriginte"}
            </DialogTitle>
            <DialogDescription>
              Selectați profesorul care va fi dirigintele clasei {className}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select
              value={selectedHomeroomId ?? ""}
              onValueChange={(v) => { if (v) setSelectedHomeroomId(v); }}
            >
              <SelectTrigger>
                <SelectValue>
                  {selectedHomeroomId
                    ? (() => {
                        const t = teachers.find((t) => t.id === selectedHomeroomId);
                        return t ? `${t.lastName} ${t.firstName}` : "Selectați dirigintele";
                      })()
                    : "Selectați dirigintele"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.lastName} {t.firstName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHomeroomModalOpen(false)} disabled={savingHomeroom}>
              Anulează
            </Button>
            <Button
              onClick={handleSaveHomeroom}
              disabled={savingHomeroom}
              className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white"
            >
              {savingHomeroom ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvează"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Alocare profesor materie */}
      {assignModal && (
        <AssignTeacherModal
          open={!!assignModal}
          onClose={() => setAssignModal(null)}
          classId={classId}
          subjectId={assignModal.subjectId}
          subjectName={assignModal.subjectName}
          academicYearId={academicYearId}
          teachers={teachers}
          currentTeacherId={assignModal.teacherUserId}
        />
      )}
    </div>
  );
}
