"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, UserX } from "lucide-react";
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
} from "@/components/ui/dialog";
import { AssignTeacherModal } from "./AssignTeacherModal";
import { ClassParentsTab } from "./ClassParentsTab";
import { enrollStudent, unenrollStudent } from "@/modules/academic/actions/student.actions";
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

interface Props {
  classId: string;
  className: string;
  gradeLevel: number;
  academicYearId: string;
  academicYearName: string;
  subjects: SubjectRow[];
  students: StudentRow[];
  unenrolledStudents: UnenrolledStudent[];
  teachers: Teacher[];
  parents: ClassParentRow[];
}

export function ClassDetailView({
  classId,
  className,
  gradeLevel,
  academicYearId,
  academicYearName,
  subjects,
  students,
  unenrolledStudents,
  teachers,
  parents,
}: Props) {
  const [activeTab, setActiveTab] = useState<"elevi" | "incadrari" | "parinti">("elevi");
  const [assignModal, setAssignModal] = useState<SubjectRow | null>(null);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removingAssignmentId, setRemovingAssignmentId] = useState<string | null>(null);

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

  function handleUnenroll(enrollmentId: string) {
    setRemovingId(enrollmentId);
    startTransition(async () => {
      const result = await unenrollStudent(enrollmentId, classId);
      if (result.success) {
        toast.success("Elevul a fost eliminat din clasă");
      } else {
        toast.error(result.error ?? "Eroare");
      }
      setRemovingId(null);
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
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">{className}</h1>
        <p className="text-muted-foreground mt-1">{gradeLevelLabel}</p>
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
                    <TableHead className="w-10" />
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
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-red-50"
                          disabled={isPending && removingId === s.enrollmentId}
                          onClick={() => handleUnenroll(s.enrollmentId)}
                        >
                          {isPending && removingId === s.enrollmentId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserX className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Add student dialog */}
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

      {/* Assign teacher modal */}
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
