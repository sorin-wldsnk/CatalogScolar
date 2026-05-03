"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, XCircle, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { excuseAbsence, deleteAbsence } from "@/modules/catalog/actions/absence.actions";
import { addObservation } from "@/modules/catalog/actions/observation.actions";
import type { PendingAbsenceRow, ClassObservationRow } from "@/modules/catalog/queries/homeroom.queries";

interface Props {
  activeTab: "motivari" | "observatii";
  pendingAbsences: PendingAbsenceRow[];
  observations: ClassObservationRow[];
  enrollmentIdByStudent: Record<string, string>;
  academicYearId: string;
  semester: number;
  classId: string;
}

export function HomeroomTabs({
  activeTab,
  pendingAbsences,
  observations,
  academicYearId,
  semester,
  classId,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [excuseModal, setExcuseModal] = useState<PendingAbsenceRow | null>(null);
  const [excuseReason, setExcuseReason] = useState("");
  const [addObsOpen, setAddObsOpen] = useState(false);
  const [obsStudentEnrollmentId, setObsStudentEnrollmentId] = useState("");
  const [obsStudentName, setObsStudentName] = useState("");
  const [obsBody, setObsBody] = useState("");
  const [localAbsences, setLocalAbsences] = useState(pendingAbsences);
  const [localObs, setLocalObs] = useState(observations);

  function handleExcuse() {
    if (!excuseModal || !excuseReason.trim()) return;
    startTransition(async () => {
      const result = await excuseAbsence(excuseModal.id, excuseReason.trim());
      if (result.success) {
        toast.success("Absența a fost motivată");
        setLocalAbsences((prev) => prev.filter((a) => a.id !== excuseModal.id));
        setExcuseModal(null);
        setExcuseReason("");
      } else {
        toast.error(result.error ?? "Eroare");
      }
    });
  }

  function handleReject(absenceId: string) {
    startTransition(async () => {
      const result = await deleteAbsence(absenceId);
      if (result.success) {
        toast.success("Absența a fost respinsă și ștearsă");
        setLocalAbsences((prev) => prev.filter((a) => a.id !== absenceId));
      } else {
        toast.error(result.error ?? "Eroare");
      }
    });
  }

  function handleAddObservation() {
    if (!obsBody.trim() || !obsStudentEnrollmentId) return;
    startTransition(async () => {
      const result = await addObservation({
        enrollmentId: obsStudentEnrollmentId,
        academicYearId,
        semester,
        body: obsBody.trim(),
        isVisibleToParent: true,
      });
      if (result.success) {
        toast.success("Observația a fost adăugată");
        setLocalObs((prev) => [
          ...prev,
          {
            id: (result.data as { id: string }).id,
            studentName: obsStudentName,
            teacherName: "Eu",
            body: obsBody.trim(),
            semester,
            isVisibleToParent: true,
            createdAt: new Date(),
          },
        ]);
        setAddObsOpen(false);
        setObsBody("");
        setObsStudentEnrollmentId("");
        setObsStudentName("");
      } else {
        toast.error(result.error ?? "Eroare");
      }
    });
  }

  if (activeTab === "motivari") {
    return (
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
                    <TableCell className="text-sm">
                      {a.period ? `Ora ${a.period}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.teacherName}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                          disabled={isPending}
                          onClick={() => { setExcuseModal(a); setExcuseReason(""); }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Motivează
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:bg-red-50"
                          disabled={isPending}
                          onClick={() => handleReject(a.id)}
                        >
                          <XCircle className="h-3.5 w-3.5" />
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
              <Button variant="outline" onClick={() => setExcuseModal(null)} disabled={isPending}>
                Anulează
              </Button>
              <Button
                onClick={handleExcuse}
                disabled={!excuseReason.trim() || isPending}
                className="bg-green-700 hover:bg-green-800 text-white"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmă motivarea"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Observații tab
  const uniqueStudents = Array.from(
    new Map(localAbsences.map((a) => [a.enrollmentId, { enrollmentId: a.enrollmentId, name: a.studentName }])).values()
  );

  return (
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
          Nicio observație înregistrată pentru această clasă.
        </div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Elev</TableHead>
                <TableHead>Observație</TableHead>
                <TableHead>Profesor</TableHead>
                <TableHead>Vizibil părinți</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localObs.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.studentName}</TableCell>
                  <TableCell className="max-w-xs text-sm">{o.body}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{o.teacherName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${o.isVisibleToParent ? "text-green-700 border-green-300" : "text-gray-500"}`}>
                      {o.isVisibleToParent ? "Da" : "Nu"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {o.createdAt ? new Date(o.createdAt).toLocaleDateString("ro-RO") : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={addObsOpen} onOpenChange={(o) => { if (!o) setAddObsOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Observație nouă</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={obsStudentEnrollmentId}
              onChange={(e) => {
                const opt = e.target.options[e.target.selectedIndex];
                setObsStudentEnrollmentId(e.target.value);
                setObsStudentName(opt.text);
              }}
            >
              <option value="">Selectați elevul</option>
              {uniqueStudents.map((s) => (
                <option key={s.enrollmentId} value={s.enrollmentId}>{s.name}</option>
              ))}
            </select>
            <Textarea
              placeholder="Observația..."
              value={obsBody}
              onChange={(e) => setObsBody(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddObsOpen(false)} disabled={isPending}>Anulează</Button>
            <Button
              onClick={handleAddObservation}
              disabled={!obsBody.trim() || !obsStudentEnrollmentId || isPending}
              className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvează"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
