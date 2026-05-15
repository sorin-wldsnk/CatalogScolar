"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
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
import { TeacherModal } from "./TeacherModal";
import type { TeacherRow } from "@/modules/users/queries/teacher.queries";
import type { Subject } from "@/db/schema";

const ROLE_LABEL: Record<string, string> = {
  TEACHER: "Profesor",
  HOMEROOM: "Diriginte",
};

interface Props {
  teachers: TeacherRow[];
  subjects: Subject[];
}

export function TeachersView({ teachers, subjects }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Profesori</h1>
          <p className="text-muted-foreground mt-1">
            {teachers.length} profesori înregistrați
          </p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Profesor nou
        </Button>
      </div>

      {teachers.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center text-muted-foreground">
          Niciun profesor înregistrat. Adăugați primul profesor.
        </div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Nume</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roluri</TableHead>
                <TableHead>Nr. clase</TableHead>
                <TableHead className="text-right">Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    {t.lastName} {t.firstName}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {t.email}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {t.roles.map((r) => (
                        <Badge
                          key={r}
                          variant="outline"
                          className="text-xs border-[#1e5fa8]/30 text-[#1e5fa8]"
                        >
                          {ROLE_LABEL[r] ?? r}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.classCount}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/profesori/${t.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-[#1e5fa8] hover:underline"
                    >
                      Detalii
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <TeacherModal open={modalOpen} onClose={() => setModalOpen(false)} subjects={subjects} />
    </div>
  );
}
