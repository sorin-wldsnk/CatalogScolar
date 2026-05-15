"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Upload, ArrowRightLeft, UserX, Pencil, Loader2 } from "lucide-react";
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
import { StudentModal } from "./StudentModal";
import { EditStudentModal } from "./EditStudentModal";
import { CsvImportModal } from "./CsvImportModal";
import { transferStudent, withdrawStudent } from "@/modules/academic/actions/student.actions";

export interface EleviClassaStudentRow {
  id: string;
  firstName: string;
  lastName: string;
  personalId?: string | null;
  dateOfBirth?: string | null;
  status: string;
  enrollmentId: string;
}

interface AvailableClass { id: string; name: string; }

interface Props {
  classId: string;
  className: string;
  academicYearId: string;
  academicYearName: string;
  schoolId: string;
  initialStudents: EleviClassaStudentRow[];
  allClasses: AvailableClass[];
  canAddStudent?: boolean;
  readonly?: boolean;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Activ", color: "text-green-700 border-green-200 bg-green-50" },
  GRADUATED: { label: "Absolvent", color: "text-blue-700 border-blue-200 bg-blue-50" },
  TRANSFERRED: { label: "Transferat", color: "text-amber-700 border-amber-200 bg-amber-50" },
  WITHDRAWN: { label: "Retras", color: "text-red-700 border-red-200 bg-red-50" },
  REPEATING: { label: "Corigent", color: "text-orange-700 border-orange-200 bg-orange-50" },
};

export function EleviClasa({
  classId,
  className,
  academicYearId,
  academicYearName,
  schoolId: _schoolId,
  initialStudents,
  allClasses,
  canAddStudent = false,
  readonly = false,
}: Props) {
  const router = useRouter();
  const [students, setStudents] = useState<EleviClassaStudentRow[]>(initialStudents);

  useEffect(() => {
    setStudents(initialStudents);
  }, [initialStudents]);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EleviClassaStudentRow | null>(null);

  const [transferTarget, setTransferTarget] = useState<EleviClassaStudentRow | null>(null);
  const [selectedTransferClassId, setSelectedTransferClassId] = useState("");
  const [transferring, startTransferTransition] = useTransition();

  const [withdrawTarget, setWithdrawTarget] = useState<EleviClassaStudentRow | null>(null);
  const [withdrawing, startWithdrawTransition] = useTransition();

  function handleTransfer() {
    if (!transferTarget || !selectedTransferClassId) return;
    const destClass = allClasses.find((c) => c.id === selectedTransferClassId);
    startTransferTransition(async () => {
      const result = await transferStudent(
        transferTarget.enrollmentId,
        selectedTransferClassId,
        classId,
        academicYearId
      );
      if (result.success) {
        setStudents((prev) => prev.filter((s) => s.enrollmentId !== transferTarget.enrollmentId));
        toast.success(
          `${transferTarget.lastName} ${transferTarget.firstName} a fost mutat în clasa ${destClass?.name ?? ""}`
        );
        setTransferTarget(null);
        setSelectedTransferClassId("");
        router.refresh();
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
        toast.success(
          `${withdrawTarget.lastName} ${withdrawTarget.firstName} a fost retras din școală`
        );
        setWithdrawTarget(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Eroare");
      }
    });
  }

  return (
    <div className="space-y-4">
      {!readonly && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{students.length} elevi înscriși</p>
          {canAddStudent && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setCsvImportOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button
                size="sm"
                className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white"
                onClick={() => setAddModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Elev nou
              </Button>
            </div>
          )}
        </div>
      )}

      {students.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center text-muted-foreground">
          Niciun elev activ înscris în această clasă.
        </div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Nume</TableHead>
                <TableHead>Status</TableHead>
                {!readonly && <TableHead className="text-right">Acțiuni</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => {
                const statusInfo = STATUS_LABELS[s.status];
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {s.lastName} {s.firstName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${statusInfo?.color ?? ""}`}
                      >
                        {statusInfo?.label ?? s.status}
                      </Badge>
                    </TableCell>
                    {!readonly && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => setEditTarget(s)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
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
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog: Mută în altă clasă */}
      <Dialog
        open={!!transferTarget}
        onOpenChange={(o) => { if (!o) { setTransferTarget(null); setSelectedTransferClassId(""); } }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mută elev în altă clasă</DialogTitle>
            <DialogDescription>
              {transferTarget &&
                `${transferTarget.lastName} ${transferTarget.firstName} va fi transferat. Notele și absențele rămân în clasa curentă.`}
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
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setTransferTarget(null); setSelectedTransferClassId(""); }}
              disabled={transferring}
            >
              Anulează
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={!selectedTransferClassId || transferring || allClasses.length === 0}
              className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white"
            >
              {transferring ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mută"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Retragere din școală */}
      <Dialog
        open={!!withdrawTarget}
        onOpenChange={(o) => { if (!o) setWithdrawTarget(null); }}
      >
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
            <Button variant="destructive" onClick={handleWithdraw} disabled={withdrawing}>
              {withdrawing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Retrag elevul"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* StudentModal — clasa și anul pre-selectate */}
      {canAddStudent && (
        <StudentModal
          open={addModalOpen}
          onClose={() => { setAddModalOpen(false); router.refresh(); }}
          classId={classId}
          academicYearId={academicYearId}
          classes={[{ id: classId, name: className }]}
          years={[{ id: academicYearId, name: academicYearName, isActive: null }]}
        />
      )}

      {/* EditStudentModal */}
      {editTarget && (
        <EditStudentModal
          open={!!editTarget}
          onClose={() => { setEditTarget(null); router.refresh(); }}
          student={editTarget}
        />
      )}

      {/* CsvImportModal */}
      {canAddStudent && (
        <CsvImportModal
          open={csvImportOpen}
          onClose={() => { setCsvImportOpen(false); router.refresh(); }}
          academicYearId={academicYearId}
        />
      )}
    </div>
  );
}
