"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createSubject } from "@/modules/academic/actions/subject.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import type { Subject } from "@/db/schema";

const GRADE_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;
const GRADE_LABELS: Record<number, string> = {
  0: "P", 1: "1", 2: "2", 3: "3", 4: "4",
  5: "5", 6: "6", 7: "7", 8: "8",
};

const schema = z.object({
  name: z.string().min(1, "Numele materiei este obligatoriu"),
  code: z.string().min(1, "Codul este obligatoriu").max(5, "Max 5 caractere").toUpperCase(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (subject: Subject) => void;
}

export function SubjectModal({ open, onClose, onCreated }: Props) {
  const [isPending, startTransition] = useTransition();
  const [selectedLevels, setSelectedLevels] = useState<number[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function toggleLevel(level: number) {
    setSelectedLevels((prev) =>
      prev.includes(level)
        ? prev.filter((l) => l !== level)
        : [...prev, level].sort((a, b) => a - b)
    );
  }

  function handleClose() {
    reset();
    setSelectedLevels([]);
    onClose();
  }

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const result = await createSubject({ ...data, gradeLevels: selectedLevels });
      if (result.success) {
        toast.success("Materia a fost adăugată");
        if (onCreated && result.data) onCreated(result.data as Subject);
        else handleClose();
      } else {
        toast.error(result.error ?? "Eroare la salvare");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Materie nouă</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Denumire materie *</Label>
            <Input id="name" placeholder="Matematică" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="code">Cod (max 5 caractere) *</Label>
            <Input
              id="code"
              placeholder="MAT"
              maxLength={5}
              {...register("code")}
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase();
                register("code").onChange(e);
              }}
            />
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Clase unde se predă</Label>
            <div className="flex flex-wrap gap-2">
              {GRADE_LEVELS.map((l) => {
                const checked = selectedLevels.includes(l);
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => toggleLevel(l)}
                    className={[
                      "w-9 h-9 rounded-lg text-sm font-semibold border transition-colors",
                      checked
                        ? "bg-[#1e5fa8] border-[#1e5fa8] text-white"
                        : "bg-gray-50 border-gray-200 text-gray-500 hover:border-[#1e5fa8]/50",
                    ].join(" ")}
                  >
                    {GRADE_LABELS[l]}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              P = clasa pregătitoare (gr. 0); 1–8 = clasele I–VIII
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Anulează
            </Button>
            <Button type="submit" disabled={isPending} className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvează"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
