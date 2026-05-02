"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SubjectModal } from "./SubjectModal";
import type { Subject } from "@/db/schema";

interface Props {
  subjects: Subject[];
}

export function SubjectsView({ subjects }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Materii</h1>
          <p className="text-muted-foreground mt-1">
            {subjects.length} materii înregistrate
          </p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Materie nouă
        </Button>
      </div>

      {subjects.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center text-muted-foreground">
          Nicio materie înregistrată. Adăugați prima materie.
        </div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Cod</TableHead>
                <TableHead>Denumire</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-gray-100 text-gray-700">
                      {s.code}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SubjectModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
