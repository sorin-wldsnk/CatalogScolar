"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { deleteAbsence } from "@/modules/catalog/actions/absence.actions";
import type { AbsenceDetail } from "@/modules/catalog/queries/catalog.queries";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  UNEXCUSED: { label: "Nemotivată", className: "bg-red-100 text-red-700 border-red-200" },
  EXCUSED: { label: "Motivată", className: "bg-green-100 text-green-700 border-green-200" },
  PENDING_EXCUSE: { label: "În așteptare", className: "bg-amber-100 text-amber-700 border-amber-200" },
};

const RO_MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];

function formatRoDate(dateStr: string): string {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("-");
  if (!year || !month || !day) return dateStr;
  return `${parseInt(day)} ${RO_MONTHS[parseInt(month) - 1]} ${year}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  studentName: string;
  subjectName: string;
  absences: AbsenceDetail[];
  isAdmin: boolean;
  canDeleteToday: boolean;
}

export function AbsenceListModal({
  open,
  onClose,
  studentName,
  subjectName,
  absences,
  isAdmin,
  canDeleteToday,
}: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  const confirmAbsence = absences.find((a) => a.id === confirmId);

  function handleDelete(id: string) {
    startDelete(async () => {
      const result = await deleteAbsence(id);
      if (result.success) {
        toast.success("Absența a fost ștearsă");
        setConfirmId(null);
      } else {
        toast.error(result.error ?? "Eroare la ștergere");
      }
    });
  }

  function canDelete(a: AbsenceDetail): boolean {
    if (isAdmin) return true;
    if (canDeleteToday && a.absentDate === today) return true;
    return false;
  }

  return (
    <>
      <Dialog open={open && !confirmId} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Absențe — {subjectName}</DialogTitle>
            <DialogDescription>{studentName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-72 overflow-y-auto py-1">
            {absences.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nicio absență înregistrată.</p>
            ) : (
              absences.map((a) => {
                const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.UNEXCUSED;
                return (
                  <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm font-medium shrink-0">{formatRoDate(a.absentDate)}</span>
                      {a.period && (
                        <span className="text-xs text-muted-foreground shrink-0">ora {a.period}</span>
                      )}
                      <Badge className={`text-xs border shrink-0 ${cfg.className}`}>{cfg.label}</Badge>
                      {a.excuseReason && (
                        <span className="text-xs text-muted-foreground truncate">— {a.excuseReason}</span>
                      )}
                    </div>
                    {canDelete(a) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-red-50 shrink-0"
                        onClick={() => setConfirmId(a.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Închide</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmId} onOpenChange={(o) => { if (!o) setConfirmId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmare ștergere</DialogTitle>
            <DialogDescription>
              Ștergi absența din{" "}
              <strong>{confirmAbsence ? formatRoDate(confirmAbsence.absentDate) : ""}</strong>{" "}
              la <strong>{subjectName}</strong> pentru <strong>{studentName}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmId(null)} disabled={deleting}>
              Anulează
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmId && handleDelete(confirmId)}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Șterge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
