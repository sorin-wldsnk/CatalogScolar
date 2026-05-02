"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { addGrade } from "@/modules/catalog/actions/grade.actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { GRADE_TYPE_LABELS } from "@/lib/grading";

const numericSchema = z.object({
  valueNumeric: z.coerce.number().min(1, "Min 1").max(10, "Max 10"),
  gradeType: z.enum(["REGULAR", "THESIS", "ORAL", "PRACTICAL"]),
  weight: z.coerce.number().min(0.1).max(9.9),
  gradedAt: z.string().min(1),
  notes: z.string().optional(),
});

const qualitativeSchema = z.object({
  valueQualitative: z.enum(["I", "S", "B", "FB"]),
  gradeType: z.enum(["REGULAR", "THESIS", "ORAL", "PRACTICAL"]),
  gradedAt: z.string().min(1),
  notes: z.string().optional(),
});

type NumericForm = z.infer<typeof numericSchema>;
type QualitativeForm = z.infer<typeof qualitativeSchema>;

interface Props {
  open: boolean;
  onClose: () => void;
  enrollmentId: string;
  subjectId: string;
  academicYearId: string;
  semester: number;
  studentName: string;
  scale: "NUMERIC" | "QUALITATIVE";
}

const today = new Date().toISOString().split("T")[0];

export function GradeModal({
  open,
  onClose,
  enrollmentId,
  subjectId,
  academicYearId,
  semester,
  studentName,
  scale,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const numericForm = useForm<NumericForm>({
    resolver: zodResolver(numericSchema),
    defaultValues: { gradeType: "REGULAR", weight: 1, gradedAt: today },
  });

  const qualitativeForm = useForm<QualitativeForm>({
    resolver: zodResolver(qualitativeSchema),
    defaultValues: { gradeType: "REGULAR", gradedAt: today },
  });

  const gradeTypeValue = scale === "NUMERIC"
    ? numericForm.watch("gradeType")
    : qualitativeForm.watch("gradeType");

  function handleClose() {
    numericForm.reset({ gradeType: "REGULAR", weight: 1, gradedAt: today });
    qualitativeForm.reset({ gradeType: "REGULAR", gradedAt: today });
    onClose();
  }

  function onSubmitNumeric(data: NumericForm) {
    startTransition(async () => {
      const result = await addGrade({
        enrollmentId, subjectId, academicYearId, semester,
        valueNumeric: data.valueNumeric,
        gradeType: data.gradeType,
        weight: data.weight,
        gradedAt: data.gradedAt,
        notes: data.notes,
      });
      if (result.success) { toast.success("Nota a fost adăugată"); handleClose(); }
      else toast.error(result.error ?? "Eroare");
    });
  }

  function onSubmitQualitative(data: QualitativeForm) {
    startTransition(async () => {
      const result = await addGrade({
        enrollmentId, subjectId, academicYearId, semester,
        valueQualitative: data.valueQualitative,
        gradeType: data.gradeType,
        gradedAt: data.gradedAt,
        notes: data.notes,
      });
      if (result.success) { toast.success("Calificativul a fost adăugat"); handleClose(); }
      else toast.error(result.error ?? "Eroare");
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Notă nouă — {studentName}</DialogTitle>
        </DialogHeader>

        {scale === "NUMERIC" ? (
          <form onSubmit={numericForm.handleSubmit(onSubmitNumeric)} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Notă (1–10)</Label>
              <Input
                type="number"
                step="0.1"
                min="1"
                max="10"
                placeholder="8"
                {...numericForm.register("valueNumeric")}
              />
              {numericForm.formState.errors.valueNumeric && (
                <p className="text-xs text-destructive">{numericForm.formState.errors.valueNumeric.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tip</Label>
                <Select
                  value={gradeTypeValue}
                  onValueChange={(v) => { if (v) numericForm.setValue("gradeType", v as "REGULAR" | "THESIS" | "ORAL" | "PRACTICAL"); }}
                >
                  <SelectTrigger>
                    <SelectValue>{GRADE_TYPE_LABELS[gradeTypeValue] ?? gradeTypeValue}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(GRADE_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Pondere</Label>
                <Input type="number" step="0.5" min="0.5" max="9.5" {...numericForm.register("weight")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" {...numericForm.register("gradedAt")} />
            </div>

            <div className="space-y-1.5">
              <Label>Observație (opțional)</Label>
              <Input placeholder="..." {...numericForm.register("notes")} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>Anulează</Button>
              <Button type="submit" disabled={isPending} className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvează"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={qualitativeForm.handleSubmit(onSubmitQualitative)} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Calificativ</Label>
              <div className="grid grid-cols-4 gap-2">
                {(["I", "S", "B", "FB"] as const).map((v) => (
                  <label key={v} className="cursor-pointer">
                    <input
                      type="radio"
                      value={v}
                      {...qualitativeForm.register("valueQualitative")}
                      className="sr-only"
                    />
                    <div className={`text-center py-2 rounded-lg border-2 text-sm font-semibold transition-colors ${
                      qualitativeForm.watch("valueQualitative") === v
                        ? "border-[#1e5fa8] bg-[#1e5fa8] text-white"
                        : "border-gray-200 text-gray-700 hover:border-[#1e5fa8]"
                    }`}>
                      {v}
                    </div>
                  </label>
                ))}
              </div>
              {qualitativeForm.formState.errors.valueQualitative && (
                <p className="text-xs text-destructive">Selectați un calificativ</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Tip</Label>
              <Select
                value={gradeTypeValue}
                onValueChange={(v) => { if (v) qualitativeForm.setValue("gradeType", v as "REGULAR" | "THESIS" | "ORAL" | "PRACTICAL"); }}
              >
                <SelectTrigger>
                  <SelectValue>{GRADE_TYPE_LABELS[gradeTypeValue] ?? gradeTypeValue}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GRADE_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" {...qualitativeForm.register("gradedAt")} />
            </div>

            <div className="space-y-1.5">
              <Label>Observație (opțional)</Label>
              <Input placeholder="..." {...qualitativeForm.register("notes")} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>Anulează</Button>
              <Button type="submit" disabled={isPending} className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvează"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
