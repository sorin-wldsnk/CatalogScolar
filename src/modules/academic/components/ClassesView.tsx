"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
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
import { ClassModal } from "./ClassModal";
import type { AcademicYear } from "@/db/schema";

interface ClassRow {
  id: string;
  name: string;
  gradeLevel: number;
  homeroomTeacherName: string | null;
  studentCount: number;
}

interface Props {
  years: AcademicYear[];
  selectedYearId: string;
  classes: ClassRow[];
}

export function ClassesView({ years, selectedYearId, classes }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  function handleYearChange(yearId: string | null) {
    if (yearId) router.push(`/admin/clase?an=${yearId}`);
  }

  const selectedYear = years.find((y) => y.id === selectedYearId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Clase</h1>
          <p className="text-muted-foreground mt-1">
            Gestionați clasele pentru fiecare an școlar
          </p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          disabled={!selectedYearId}
          className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Clasă nouă
        </Button>
      </div>

      {/* Year selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-600">An școlar:</span>
        <Select value={selectedYearId} onValueChange={handleYearChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Selectați anul" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => {
              const label = y.isActive ? `${y.name} (Activ)` : y.name;
              return (
                <SelectItem key={y.id} value={y.id} label={label}>
                  {label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {classes.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center text-muted-foreground">
          {selectedYear
            ? `Nicio clasă pentru anul ${selectedYear.name}. Adăugați prima clasă.`
            : "Selectați un an școlar."}
        </div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Clasă</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Diriginte</TableHead>
                <TableHead>Elevi</TableHead>
                <TableHead className="text-right">Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell className="font-semibold">{cls.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {cls.gradeLevel === 0 ? "Pregătitoare" : `Clasa ${cls.gradeLevel}`}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {cls.homeroomTeacherName ?? <span className="italic text-sm">Nealocat</span>}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {cls.studentCount}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/clase/${cls.id}?an=${selectedYearId}`}
                      className="text-sm font-medium text-[#1e5fa8] hover:underline"
                    >
                      Detalii
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ClassModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        academicYearId={selectedYearId}
      />
    </div>
  );
}
