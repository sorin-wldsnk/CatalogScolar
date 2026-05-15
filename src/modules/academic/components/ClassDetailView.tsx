"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, UserCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { EleviClasa } from "./EleviClasa";
import type { EleviClassaStudentRow } from "./EleviClasa";
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

interface Teacher { id: string; firstName: string; lastName: string; }

interface AvailableClass { id: string; name: string; }

interface Props {
  classId: string;
  className: string;
  gradeLevel: number;
  academicYearId: string;
  academicYearName: string;
  schoolId: string;
  homeroomTeacherId: string | null;
  homeroomTeacherName: string | null;
  subjects: SubjectRow[];
  students: EleviClassaStudentRow[];
  unenrolledStudents: { id: string; firstName: string; lastName: string }[];
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
  schoolId,
  homeroomTeacherId,
  homeroomTeacherName,
  subjects,
  students,
  teachers,
  parents,
  allClasses,
}: Props) {
  const [activeTab, setActiveTab] = useState<"elevi" | "incadrari" | "parinti">("elevi");
  const [assignModal, setAssignModal] = useState<SubjectRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const [removingAssignmentId, setRemovingAssignmentId] = useState<string | null>(null);

  // Diriginte
  const [currentHomeroomId, setCurrentHomeroomId] = useState<string | null>(homeroomTeacherId);
  const [currentHomeroomName, setCurrentHomeroomName] = useState<string | null>(homeroomTeacherName);
  const [homeroomModalOpen, setHomeroomModalOpen] = useState(false);
  const [selectedHomeroomId, setSelectedHomeroomId] = useState<string>(homeroomTeacherId ?? "");
  const [savingHomeroom, startHomeroomTransition] = useTransition();

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
        <EleviClasa
          classId={classId}
          className={className}
          academicYearId={academicYearId}
          academicYearName={academicYearName}
          schoolId={schoolId}
          initialStudents={students}
          allClasses={allClasses}
          canAddStudent={true}
        />
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
                      <span className="font-medium">{s.teacherLastName} {s.teacherFirstName}</span>
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
