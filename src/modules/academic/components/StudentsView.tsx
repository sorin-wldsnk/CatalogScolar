"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { StudentModal } from "./StudentModal";
import { StudentPanel } from "./StudentPanel";
import type { AcademicYear } from "@/db/schema";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Activ", color: "bg-green-100 text-green-700 border-green-200" },
  GRADUATED: { label: "Absolvent", color: "bg-blue-100 text-blue-700 border-blue-200" },
  TRANSFERRED: { label: "Transferat", color: "bg-amber-100 text-amber-700 border-amber-200" },
  WITHDRAWN: { label: "Retras", color: "bg-red-100 text-red-700 border-red-200" },
  REPEATING: { label: "Corigent", color: "bg-orange-100 text-orange-700 border-orange-200" },
};

interface StudentRow {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  className?: string | null;
}

interface ClassRow {
  id: string;
  name: string;
}

interface Props {
  years: AcademicYear[];
  selectedYearId: string;
  classes: ClassRow[];
  students: StudentRow[];
  selectedClassId?: string;
  selectedStatus?: string;
}

export function StudentsView({
  years,
  selectedYearId,
  classes,
  students,
  selectedClassId,
  selectedStatus,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const router = useRouter();

  function buildUrl(params: Record<string, string | undefined>) {
    const url = new URLSearchParams();
    const merged = { an: selectedYearId, clasa: selectedClassId, status: selectedStatus, ...params };
    Object.entries(merged).forEach(([k, v]) => { if (v) url.set(k, v); });
    router.push(`/admin/elevi?${url.toString()}`);
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-6 min-w-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1e3a5f]">Elevi</h1>
            <p className="text-muted-foreground mt-1">
              {students.length} elevi {selectedClassId ? "în clasa selectată" : "în total"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled title="Disponibil în faza următoare">
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button
              onClick={() => setModalOpen(true)}
              className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Elev nou
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select
            value={selectedYearId}
            onValueChange={(v) => { if (v) buildUrl({ an: v, clasa: undefined }); }}
          >
            <SelectTrigger className="w-40">
              <SelectValue>
                {years.find((y) => y.id === selectedYearId)?.name ?? "An școlar"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y.id} value={y.id}>
                  {y.name}
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
            value={selectedStatus ?? "all"}
            onValueChange={(v) => buildUrl({ status: !v || v === "all" ? undefined : v })}
          >
            <SelectTrigger className="w-36">
              <SelectValue>
                {selectedStatus
                  ? (STATUS_LABELS[selectedStatus]?.label ?? "Toate statusurile")
                  : "Toate statusurile"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate statusurile</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {students.length === 0 ? (
          <div className="rounded-xl border bg-white p-12 text-center text-muted-foreground">
            Niciun elev găsit pentru filtrele selectate.
          </div>
        ) : (
          <div className="rounded-xl border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Nume</TableHead>
                  <TableHead>Clasă</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => {
                  const statusInfo = STATUS_LABELS[s.status];
                  return (
                    <TableRow
                      key={s.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedStudent(s)}
                    >
                      <TableCell className="font-medium">
                        {s.lastName} {s.firstName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.className ?? <span className="italic text-sm">Fără clasă</span>}
                      </TableCell>
                      <TableCell>
                        {statusInfo && (
                          <Badge className={`${statusInfo.color} hover:${statusInfo.color} border text-xs`}>
                            {statusInfo.label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Side panel */}
      {selectedStudent && (
        <StudentPanel
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}

      <StudentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        classId={selectedClassId}
        academicYearId={selectedYearId}
      />
    </div>
  );
}
