"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deleteAssignment } from "@/modules/academic/actions/teaching-assignment.actions";
import { Button } from "@/components/ui/button";
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
import { AssignmentModal } from "./AssignmentModal";
import type { AcademicYear, Subject } from "@/db/schema";

interface AssignmentRow {
  id: string;
  teacherFirstName: string;
  teacherLastName: string;
  className: string;
  gradeLevel: number;
  subjectName: string;
  subjectCode: string;
}

interface Teacher { id: string; firstName: string; lastName: string; }
interface ClassRow { id: string; name: string; }

interface Props {
  years: AcademicYear[];
  selectedYearId: string;
  classes: ClassRow[];
  subjects: Subject[];
  assignments: AssignmentRow[];
  teachers: Teacher[];
}

export function AssignmentsView({ years, selectedYearId, classes, subjects, assignments, teachers }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteAssignment(id);
      if (result.success) {
        toast.success("Încadrarea a fost eliminată");
      } else {
        toast.error(result.error ?? "Eroare");
      }
      setDeletingId(null);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Încadrări</h1>
          <p className="text-muted-foreground mt-1">
            {assignments.length} încadrări pentru anul selectat
          </p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          disabled={!selectedYearId}
          className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Încadrare nouă
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-600">An școlar:</span>
        <Select
          value={selectedYearId}
          onValueChange={(v) => { if (v) router.push(`/admin/incadrari?an=${v}`); }}
        >
          {(() => {
            const y = years.find((y) => y.id === selectedYearId);
            return (
              <SelectTrigger className="w-48">
                <SelectValue>
                  {y ? `${y.name}${y.isActive ? " (Activ)" : ""}` : "Selectați"}
                </SelectValue>
              </SelectTrigger>
            );
          })()}
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y.id} value={y.id}>
                {y.name} {y.isActive ? "(Activ)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {assignments.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center text-muted-foreground">
          Nicio încadrare înregistrată. Adăugați prima încadrare.
        </div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Profesor</TableHead>
                <TableHead>Materie</TableHead>
                <TableHead>Clasă</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    {a.teacherLastName} {a.teacherFirstName}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                        {a.subjectCode}
                      </span>
                      {a.subjectName}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.className}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-red-50"
                      disabled={isPending && deletingId === a.id}
                      onClick={() => handleDelete(a.id)}
                    >
                      {isPending && deletingId === a.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AssignmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        academicYearId={selectedYearId}
        teachers={teachers}
        classes={classes}
        subjects={subjects}
      />
    </div>
  );
}
