"use client";

import { useState, useRef, useTransition } from "react";
import { Upload, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { bulkImportStudents } from "@/modules/academic/actions/bulk-import.actions";
import type { ImportRow } from "@/modules/academic/actions/bulk-import.actions";

interface Props {
  open: boolean;
  onClose: () => void;
  academicYearId: string;
}

type Phase = "upload" | "preview" | "done";

function parseCsv(text: string): ImportRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  // skip header row
  return lines.slice(1).map((line, idx) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    return {
      rowIndex: idx + 2,
      nume: cols[0] ?? "",
      prenume: cols[1] ?? "",
      cnp: cols[2] || undefined,
      dataNasterii: cols[3] || undefined,
      clasa: cols[4] || undefined,
      numeParinte: cols[5] || undefined,
      prenumeParinte: cols[6] || undefined,
      emailParinte: cols[7] || undefined,
      telefonParinte: cols[8] || undefined,
    };
  }).filter((r) => r.nume || r.prenume);
}

function validateRow(row: ImportRow): string | null {
  if (!row.nume) return "Lipsește numele";
  if (!row.prenume) return "Lipsește prenumele";
  if (row.emailParinte && row.emailParinte.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.emailParinte)) {
    return "Email invalid";
  }
  return null;
}

export function CsvImportModal({ open, onClose, academicYearId }: Props) {
  const [phase, setPhase] = useState<Phase>("upload");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [importResult, setImportResult] = useState<{ success: number; errors: Array<{ row: number; reason: string }>; parentsCreated: number } | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCsv(text);
      const errors: Record<number, string> = {};
      parsed.forEach((r) => {
        const err = validateRow(r);
        if (err) errors[r.rowIndex] = err;
      });
      setRows(parsed);
      setRowErrors(errors);
      setPhase("preview");
    };
    reader.readAsText(file, "UTF-8");
  }

  function handleImport() {
    const validRows = rows.filter((r) => !rowErrors[r.rowIndex]);
    startTransition(async () => {
      const result = await bulkImportStudents(validRows, academicYearId);
      if (!result.success) {
        toast.error(result.error ?? "Eroare la import");
        return;
      }
      setImportResult(result.result ?? null);
      setPhase("done");
    });
  }

  function handleClose() {
    setPhase("upload");
    setRows([]);
    setRowErrors({});
    setImportResult(null);
    onClose();
  }

  const validCount = rows.filter((r) => !rowErrors[r.rowIndex]).length;
  const errorCount = Object.keys(rowErrors).length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-4xl flex flex-col max-h-[85vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>Import elevi din CSV</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-2">
          {phase === "upload" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-dashed p-8 text-center space-y-2">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm font-medium">Selectați fișierul CSV</p>
                <p className="text-xs text-muted-foreground">
                  Format: <span className="font-mono">nume, prenume, cnp, data_nasterii, clasa, nume_parinte, prenume_parinte, email_parinte, telefon_parinte</span>
                </p>
                <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                  Alege fișier
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>
              <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold">Exemplu rând CSV:</p>
                <code className="block whitespace-nowrap overflow-x-auto">Ionescu,Maria,1234567890123,2012-03-15,7A,Ionescu,Dan,dan@gmail.com,0722111222</code>
              </div>
            </div>
          )}

          {phase === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-green-700">
                  <CheckCircle2 className="h-4 w-4" /> {validCount} rânduri valide
                </span>
                {errorCount > 0 && (
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="h-4 w-4" /> {errorCount} erori
                  </span>
                )}
              </div>

              <div className="rounded-xl border bg-white overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Nume</TableHead>
                      <TableHead>Prenume</TableHead>
                      <TableHead>Clasă</TableHead>
                      <TableHead>Email părinte</TableHead>
                      <TableHead>Stare</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 100).map((r) => {
                      const err = rowErrors[r.rowIndex];
                      return (
                        <TableRow key={r.rowIndex} className={err ? "bg-red-50" : ""}>
                          <TableCell className="text-muted-foreground text-xs">{r.rowIndex}</TableCell>
                          <TableCell>{r.nume}</TableCell>
                          <TableCell>{r.prenume}</TableCell>
                          <TableCell>{r.clasa || "—"}</TableCell>
                          <TableCell className="text-xs">{r.emailParinte || "—"}</TableCell>
                          <TableCell>
                            {err ? (
                              <span className="text-xs text-red-600 flex items-center gap-1">
                                <AlertCircle className="h-3.5 w-3.5" /> {err}
                              </span>
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {rows.length > 100 && (
                <p className="text-xs text-muted-foreground">Se afișează primele 100 din {rows.length} rânduri.</p>
              )}
            </div>
          )}

          {phase === "done" && importResult && (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-1">
                <p className="font-medium text-green-800">Import finalizat</p>
                <p className="text-sm text-green-700">{importResult.success} elevi importați cu succes</p>
                {importResult.parentsCreated > 0 && (
                  <p className="text-sm text-green-700">{importResult.parentsCreated} conturi de tutore create</p>
                )}
              </div>
              {importResult.errors.length > 0 && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4 space-y-1 max-h-48 overflow-y-auto">
                  <p className="font-medium text-red-800 text-sm">{importResult.errors.length} erori:</p>
                  {importResult.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-700">Rândul {e.row}: {e.reason}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t pt-4">
          {phase === "upload" && (
            <Button variant="outline" onClick={handleClose}>Anulează</Button>
          )}
          {phase === "preview" && (
            <>
              <Button variant="outline" onClick={() => setPhase("upload")} disabled={isPending}>
                Înapoi
              </Button>
              <Button
                onClick={handleImport}
                disabled={validCount === 0 || isPending}
                className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Importă {validCount} elevi
              </Button>
            </>
          )}
          {phase === "done" && (
            <Button onClick={handleClose}>Închide</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
