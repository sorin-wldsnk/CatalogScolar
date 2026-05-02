"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setActiveAcademicYear } from "@/modules/academic/actions/academic-year.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { AcademicYear } from "@/db/schema";

interface Props {
  years: AcademicYear[];
}

export function AcademicYearsTable({ years }: Props) {
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleActivate(id: string) {
    setActivatingId(id);
    startTransition(async () => {
      const result = await setActiveAcademicYear(id);
      if (result.success) {
        toast.success("An școlar activat");
      } else {
        toast.error(result.error ?? "Eroare");
      }
      setActivatingId(null);
    });
  }

  if (years.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-12 text-center text-muted-foreground">
        Niciun an școlar înregistrat. Adăugați primul an școlar.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead>Denumire</TableHead>
            <TableHead>Perioadă</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Acțiuni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {years.map((year) => (
            <TableRow key={year.id}>
              <TableCell className="font-medium">{year.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {year.startDate} — {year.endDate}
              </TableCell>
              <TableCell>
                {year.isActive ? (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                    Activ
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Inactiv
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                {!year.isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending && activatingId === year.id}
                    onClick={() => handleActivate(year.id)}
                    className="text-[#1e5fa8] border-[#1e5fa8] hover:bg-[#1e5fa8] hover:text-white"
                  >
                    {isPending && activatingId === year.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        Activează
                      </>
                    )}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
