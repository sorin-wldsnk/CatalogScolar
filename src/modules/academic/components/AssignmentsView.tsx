"use client";

import { useRouter } from "next/navigation";
import { Info } from "lucide-react";
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
import type { AcademicYear } from "@/db/schema";

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
interface SubjectRow { id: string; name: string; code: string; }

interface Props {
  years: AcademicYear[];
  selectedYearId: string;
  classes: ClassRow[];
  subjects: SubjectRow[];
  assignments: AssignmentRow[];
  teachers: Teacher[];
  selectedTeacherId?: string;
  selectedClassId?: string;
  selectedSubjectId?: string;
}

export function AssignmentsView({
  years,
  selectedYearId,
  classes,
  subjects,
  assignments,
  teachers,
  selectedTeacherId,
  selectedClassId,
  selectedSubjectId,
}: Props) {
  const router = useRouter();

  function buildUrl(params: Record<string, string | undefined>) {
    const url = new URLSearchParams();
    const merged = {
      an: selectedYearId,
      profesor: selectedTeacherId,
      clasa: selectedClassId,
      materie: selectedSubjectId,
      ...params,
    };
    Object.entries(merged).forEach(([k, v]) => { if (v) url.set(k, v); });
    router.push(`/admin/incadrari?${url.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Încadrări</h1>
          <p className="text-muted-foreground mt-1">
            {assignments.length} încadrări pentru filtrele selectate
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 p-3.5 text-sm text-blue-800">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          Încadrările se gestionează din pagina fiecărei clase.
          Accesați <strong>Administrare → Clase</strong>, dați click pe <strong>Detalii</strong> la clasa dorită,
          apoi selectați tab-ul <strong>Încadrări</strong>.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600 whitespace-nowrap">An:</span>
          <Select
            value={selectedYearId}
            onValueChange={(v) => { if (v) buildUrl({ an: v, clasa: undefined }); }}
          >
            {(() => {
              const y = years.find((yr) => yr.id === selectedYearId);
              return (
                <SelectTrigger className="w-40">
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

        <Select
          value={selectedTeacherId ?? "all"}
          onValueChange={(v) => buildUrl({ profesor: !v || v === "all" ? undefined : v })}
        >
          <SelectTrigger className="w-44">
            <SelectValue>
              {selectedTeacherId
                ? (() => {
                    const t = teachers.find((x) => x.id === selectedTeacherId);
                    return t ? `${t.lastName} ${t.firstName}` : "Toți profesorii";
                  })()
                : "Toți profesorii"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toți profesorii</SelectItem>
            {teachers.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.lastName} {t.firstName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedClassId ?? "all"}
          onValueChange={(v) => buildUrl({ clasa: !v || v === "all" ? undefined : v })}
        >
          <SelectTrigger className="w-36">
            <SelectValue>
              {selectedClassId
                ? (classes.find((c) => c.id === selectedClassId)?.name ?? "Toate clasele")
                : "Toate clasele"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate clasele</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedSubjectId ?? "all"}
          onValueChange={(v) => buildUrl({ materie: !v || v === "all" ? undefined : v })}
        >
          <SelectTrigger className="w-44">
            <SelectValue>
              {selectedSubjectId
                ? (() => {
                    const s = subjects.find((x) => x.id === selectedSubjectId);
                    return s ? `${s.name}` : "Toate materiile";
                  })()
                : "Toate materiile"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate materiile</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {assignments.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center text-muted-foreground">
          Nicio încadrare pentru filtrele selectate.
        </div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Profesor</TableHead>
                <TableHead>Materie</TableHead>
                <TableHead>Clasă</TableHead>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
