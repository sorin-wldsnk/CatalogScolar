"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { updateSubjectGradeLevels } from "@/modules/academic/actions/subject.actions";
import type { Subject } from "@/db/schema";

const GRADE_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;
const GRADE_LABELS: Record<number, string> = {
  0: "P", 1: "1", 2: "2", 3: "3", 4: "4",
  5: "5", 6: "6", 7: "7", 8: "8",
};

interface Props {
  subjects: Subject[];
}

function GradeLevelCheckbox({
  subjectId,
  level,
  checked,
  onToggle,
  disabled,
}: {
  subjectId: string;
  level: number;
  checked: boolean;
  onToggle: (subjectId: string, level: number) => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(subjectId, level)}
      className={[
        "w-7 h-7 rounded flex items-center justify-center text-xs font-bold transition-colors border",
        checked
          ? "bg-green-100 border-green-400 text-green-700 hover:bg-green-200"
          : "bg-gray-50 border-gray-200 text-gray-300 hover:bg-gray-100",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
      title={checked ? "Debifează" : "Bifează"}
    >
      {checked ? "✓" : "✗"}
    </button>
  );
}

export function SubjectsView({ subjects: initialSubjects }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [subjects, setSubjects] = useState(initialSubjects);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleToggle(subjectId: string, level: number) {
    const sub = subjects.find((s) => s.id === subjectId);
    if (!sub) return;

    const current = sub.gradeLevels ?? [];
    const newLevels = current.includes(level)
      ? current.filter((l) => l !== level)
      : [...current, level].sort((a, b) => a - b);

    setSubjects((prev) =>
      prev.map((s) => s.id === subjectId ? { ...s, gradeLevels: newLevels } : s)
    );
    setPendingId(subjectId);

    startTransition(async () => {
      const result = await updateSubjectGradeLevels(subjectId, newLevels);
      if (!result.success) {
        toast.error(result.error ?? "Eroare la salvare");
        setSubjects((prev) =>
          prev.map((s) => s.id === subjectId ? { ...s, gradeLevels: current } : s)
        );
      }
      setPendingId(null);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Materii</h1>
          <p className="text-muted-foreground mt-1">
            {subjects.length} materii — bifele indică clasele unde se predă
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
        <div className="rounded-xl border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="min-w-52">Materie</TableHead>
                <TableHead className="w-16">Cod</TableHead>
                {GRADE_LEVELS.map((l) => (
                  <TableHead key={l} className="w-10 text-center px-1 text-xs">
                    {GRADE_LABELS[l]}
                  </TableHead>
                ))}
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map((s) => {
                const levels = s.gradeLevels ?? [];
                const isPending = pendingId === s.id;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-sm">{s.name}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-gray-100 text-gray-700">
                        {s.code}
                      </span>
                    </TableCell>
                    {GRADE_LEVELS.map((l) => (
                      <TableCell key={l} className="px-1 text-center">
                        <GradeLevelCheckbox
                          subjectId={s.id}
                          level={l}
                          checked={levels.includes(l)}
                          onToggle={handleToggle}
                          disabled={isPending}
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <SubjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(newSubject) => {
          setSubjects((prev) => [...prev, newSubject as Subject]);
          setModalOpen(false);
        }}
      />
    </div>
  );
}
