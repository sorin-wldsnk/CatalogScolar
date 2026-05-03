"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { resetAndGetParentCredentials } from "@/modules/academic/actions/class-parents.actions";
import type { ClassParentRow } from "@/modules/academic/queries/class-parents.queries";

interface Props {
  classId: string;
  className: string;
  academicYearId: string;
  academicYearName: string;
  parents: ClassParentRow[];
}

function StatusBadge({ row }: { row: ClassParentRow }) {
  if (!row.hasAccount) {
    return (
      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">
        ⚠ Fără cont
      </Badge>
    );
  }
  if (row.mustChangeOnLogin) {
    return (
      <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50 text-xs">
        ⏳ Parolă temporară
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 text-xs">
      ✓ Activ
    </Badge>
  );
}

export function ClassParentsTab({ classId, className, academicYearId, academicYearName, parents }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);

  const pendingCount = parents.filter((p) => p.hasAccount && p.mustChangeOnLogin).length;

  async function generatePdf() {
    setIsGenerating(true);
    try {
      const result = await resetAndGetParentCredentials(classId, academicYearId);
      if (!result.success) {
        toast.error(result.error ?? "Eroare la generare");
        return;
      }
      if (!result.credentials || result.credentials.length === 0) {
        toast.info("Nu există conturi cu parolă temporară în această clasă");
        return;
      }

      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const marginX = 20;
      let y = 20;
      const lineH = 7;
      const pageH = 280;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`CLASA ${className.toUpperCase()} — Credențiale acces Catalog Școlar Digital`, marginX, y);
      y += lineH;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`An școlar: ${academicYearName}`, marginX, y);
      y += lineH + 4;

      const sep = "─".repeat(80);

      for (const cred of result.credentials) {
        if (y + 30 > pageH) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(sep.slice(0, 75), marginX, y);
        y += lineH - 1;
        doc.setTextColor(0);
        doc.setFontSize(10);
        doc.text(`Elev: ${cred.studentName}`, marginX, y);
        y += lineH;
        doc.text(`Cont parinte: ${cred.email}`, marginX, y);
        y += lineH;
        doc.setFont("helvetica", "bold");
        doc.text(`Parola temporara: ${cred.tempPassword}`, marginX, y);
        doc.setFont("helvetica", "normal");
        y += lineH + 2;
      }

      if (y + 20 > pageH) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text(sep.slice(0, 75), marginX, y);
      y += lineH;
      doc.setTextColor(80);
      doc.text("* Parola trebuie schimbata la primul login", marginX, y);
      y += lineH - 1;
      doc.text("* Accesati: https://catalogscolar.ro/login", marginX, y);

      doc.save(`credentiale-${className.toLowerCase()}-${academicYearName.replace(/[^a-z0-9]/gi, "-")}.pdf`);
      toast.success(`PDF generat cu ${result.credentials.length} credențiale`);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {parents.length} elevi · {pendingCount} conturi cu parolă temporară
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={generatePdf}
          disabled={isGenerating || pendingCount === 0}
          className="text-[#1e5fa8] border-[#1e5fa8]"
        >
          {isGenerating
            ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
            : <FileDown className="h-4 w-4 mr-2" />}
          Generează credențiale PDF
        </Button>
      </div>

      {parents.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground text-sm">
          Niciun elev înscris în clasă.
        </div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Elev</TableHead>
                <TableHead>Nume părinte</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Status cont</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parents.map((p) => (
                <TableRow key={p.studentId}>
                  <TableCell className="font-medium">{p.studentName}</TableCell>
                  <TableCell>{p.parentName ?? <span className="text-muted-foreground italic text-xs">—</span>}</TableCell>
                  <TableCell className="text-sm">{p.email ?? <span className="text-muted-foreground italic text-xs">—</span>}</TableCell>
                  <TableCell className="text-sm">{p.phone ?? <span className="text-muted-foreground italic text-xs">—</span>}</TableCell>
                  <TableCell><StatusBadge row={p} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
