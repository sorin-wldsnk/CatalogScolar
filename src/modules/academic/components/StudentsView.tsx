"use client";

import { useRouter } from "next/navigation";
import { School2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EleviClasa } from "./EleviClasa";
import type { EleviClassaStudentRow } from "./EleviClasa";
import { usePermissions } from "@/lib/permissions";
import type { AcademicYear } from "@/db/schema";

interface ClassRow {
  id: string;
  name: string;
  gradeLevel?: number;
}

interface Props {
  years: AcademicYear[];
  selectedYearId: string;
  classes: ClassRow[];
  students: EleviClassaStudentRow[];
  selectedClassId?: string;
  roles?: string[];
}

export function StudentsView({
  years,
  selectedYearId,
  classes,
  students,
  selectedClassId,
  roles = [],
}: Props) {
  const { canAddStudent } = usePermissions(roles);
  const router = useRouter();

  function buildUrl(params: Record<string, string | undefined>) {
    const url = new URLSearchParams();
    const merged = { an: selectedYearId, clasa: selectedClassId, ...params };
    Object.entries(merged).forEach(([k, v]) => { if (v) url.set(k, v); });
    router.push(`/admin/elevi?${url.toString()}`);
  }

  const selectedYear = years.find((y) => y.id === selectedYearId);
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const otherClasses = classes
    .filter((c) => c.id !== selectedClassId)
    .map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Elevi</h1>
        <p className="text-muted-foreground mt-1">
          Gestionați elevii pe clase
        </p>
      </div>

      {/* Filtre */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={selectedYearId}
          onValueChange={(v) => { if (v) buildUrl({ an: v, clasa: undefined }); }}
        >
          <SelectTrigger className="w-48">
            <SelectValue>
              {selectedYear
                ? `${selectedYear.name}${selectedYear.isActive ? " (Activ)" : ""}`
                : "An școlar"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y.id} value={y.id}>
                {y.name} {y.isActive ? "(Activ)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedClassId ?? ""}
          onValueChange={(v) => buildUrl({ clasa: v || undefined })}
        >
          <SelectTrigger className="w-36">
            <SelectValue>
              {selectedClass ? selectedClass.name : "Alegeți clasa"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Conținut */}
      {!selectedClassId ? (
        <div className="rounded-xl border bg-white p-16 text-center space-y-3">
          <School2 className="h-10 w-10 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground font-medium">
            Selectați o clasă pentru a vedea elevii
          </p>
          <p className="text-sm text-muted-foreground">
            Folosiți filtrul de mai sus pentru a alege clasa.
          </p>
        </div>
      ) : (
        <EleviClasa
          classId={selectedClassId}
          className={selectedClass?.name ?? ""}
          academicYearId={selectedYearId}
          academicYearName={selectedYear?.name ?? selectedYearId}
          schoolId=""
          initialStudents={students}
          allClasses={otherClasses}
          canAddStudent={canAddStudent}
        />
      )}
    </div>
  );
}
