"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, School2, Upload, Plus, Pencil, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import Link from "next/link";
import { EleviClasa } from "./EleviClasa";
import type { EleviClassaStudentRow } from "./EleviClasa";
import { StudentModal } from "./StudentModal";
import { EditStudentModal } from "./EditStudentModal";
import { CsvImportModal } from "./CsvImportModal";
import { usePermissions } from "@/lib/permissions";
import type { AcademicYear } from "@/db/schema";

interface ClassRow {
  id: string;
  name: string;
  gradeLevel?: number;
}

interface StudentViewRow extends EleviClassaStudentRow {
  className?: string;
}

interface Props {
  years: AcademicYear[];
  selectedYearId: string;
  classes: ClassRow[];
  students: StudentViewRow[];
  selectedClassId?: string;
  roles?: string[];
  selectedSearch?: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Activ", color: "text-green-700 border-green-200 bg-green-50" },
  WITHDRAWN: { label: "Retras", color: "text-red-700 border-red-200 bg-red-50" },
  TRANSFERRED: { label: "Transferat", color: "text-amber-700 border-amber-200 bg-amber-50" },
  REPEATING: { label: "Corigent", color: "text-orange-700 border-orange-200 bg-orange-50" },
  GRADUATED: { label: "Absolvent", color: "text-blue-700 border-blue-200 bg-blue-50" },
};

export function StudentsView({
  years,
  selectedYearId,
  classes,
  students,
  selectedClassId,
  roles = [],
  selectedSearch,
}: Props) {
  const { canAddStudent } = usePermissions(roles);
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [searchValue, setSearchValue] = useState(selectedSearch ?? "");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StudentViewRow | null>(null);

  const mounted = useRef(false);

  const selectedYear = years.find((y) => y.id === selectedYearId);
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const otherClasses = classes
    .filter((c) => c.id !== selectedClassId)
    .map((c) => ({ id: c.id, name: c.name }));

  function buildUrl(params: Record<string, string | undefined>) {
    const url = new URLSearchParams();
    const merged = {
      an: selectedYearId,
      clasa: selectedClassId,
      cauta: searchValue || undefined,
      ...params,
    };
    Object.entries(merged).forEach(([k, v]) => { if (v) url.set(k, v); });
    router.push(`/admin/elevi?${url.toString()}`);
  }

  // Sync searchValue when server-side selectedSearch changes (e.g. on back-nav)
  useEffect(() => {
    setSearchValue(selectedSearch ?? "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSearch]);

  // Debounced search — skip on initial mount to avoid unnecessary navigation
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const timer = setTimeout(() => {
      buildUrl({ cauta: searchValue || undefined });
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  const showEleviClasa = !!selectedClassId && !searchValue;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Elevi</h1>
          <p className="text-muted-foreground mt-1">Gestionați elevii pe clase</p>
        </div>
        {canAddStudent && (
          <div className="flex gap-2 shrink-0">
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

      {/* Filtre */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={selectedYearId}
          onValueChange={(v) => {
            if (v !== null) buildUrl({ an: v, clasa: undefined, cauta: undefined });
          }}
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
          onValueChange={(v) => {
            if (v !== null) buildUrl({ clasa: v || undefined });
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue>
              {selectedClass ? selectedClass.name : "Toate clasele"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Toate clasele</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Caută elev..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>
      </div>

      {/* Conținut */}
      {showEleviClasa ? (
        <EleviClasa
          classId={selectedClassId!}
          className={selectedClass?.name ?? ""}
          academicYearId={selectedYearId}
          academicYearName={selectedYear?.name ?? selectedYearId}
          schoolId=""
          initialStudents={students}
          allClasses={otherClasses}
          canAddStudent={false}
        />
      ) : (
        <>
          {students.length === 0 ? (
            <div className="rounded-xl border bg-white p-16 text-center space-y-3">
              <School2 className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground font-medium">
                {searchValue
                  ? "Niciun elev găsit pentru căutarea efectuată."
                  : "Niciun elev înscris în acest an școlar."}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Nume complet</TableHead>
                    <TableHead>Clasă</TableHead>
                    <TableHead>An școlar</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acțiuni</TableHead>
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
                        <TableCell className="text-muted-foreground">
                          {s.className ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {selectedYear?.name ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${statusInfo?.color ?? ""}`}
                          >
                            {statusInfo?.label ?? s.status}
                          </Badge>
                        </TableCell>
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
                            <Link
                              href={`/admin/elevi/${s.id}?an=${selectedYearId}`}
                              className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
                              title="Fișa elevului"
                            >
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {/* StudentModal — clasa pre-selectată dacă e aleasă, altfel utilizatorul alege */}
      <StudentModal
        open={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          startTransition(() => router.refresh());
        }}
        classId={selectedClassId}
        academicYearId={selectedYearId || undefined}
        classes={classes}
        years={years.map((y) => ({ id: y.id, name: y.name, isActive: y.isActive }))}
      />

      {/* EditStudentModal */}
      {editTarget && (
        <EditStudentModal
          open={!!editTarget}
          onClose={() => {
            setEditTarget(null);
            startTransition(() => router.refresh());
          }}
          student={editTarget}
        />
      )}

      {/* CsvImportModal */}
      <CsvImportModal
        open={csvImportOpen}
        onClose={() => {
          setCsvImportOpen(false);
          startTransition(() => router.refresh());
        }}
        academicYearId={selectedYearId}
      />
    </div>
  );
}
