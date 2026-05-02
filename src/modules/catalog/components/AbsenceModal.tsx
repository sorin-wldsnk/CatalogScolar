"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { addAbsence } from "@/modules/catalog/actions/absence.actions";
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
import { Controller } from "react-hook-form";

const schema = z.object({
  absentDate: z.string().min(1, "Data este obligatorie"),
  period: z.coerce.number().int().min(1).max(8).optional().nullable(),
});
type FormValues = z.infer<typeof schema>;

const today = new Date().toISOString().split("T")[0];

interface Props {
  open: boolean;
  onClose: () => void;
  enrollmentId: string;
  subjectId: string;
  academicYearId: string;
  semester: number;
  studentName: string;
}

export function AbsenceModal({
  open,
  onClose,
  enrollmentId,
  subjectId,
  academicYearId,
  semester,
  studentName,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { absentDate: today, period: null },
  });

  function handleClose() {
    reset({ absentDate: today, period: null });
    onClose();
  }

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const result = await addAbsence({
        enrollmentId, subjectId, academicYearId, semester,
        absentDate: data.absentDate,
        period: data.period,
      });
      if (result.success) { toast.success("Absența a fost înregistrată"); handleClose(); }
      else toast.error(result.error ?? "Eroare");
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Absență nouă — {studentName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Data</Label>
            <Input type="date" {...register("absentDate")} />
            {errors.absentDate && (
              <p className="text-xs text-destructive">{errors.absentDate.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Ora (opțional)</Label>
            <Controller
              name="period"
              control={control}
              render={({ field }) => {
                const val = field.value ? String(field.value) : "none";
                return (
                  <Select
                    value={val}
                    onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {field.value ? `Ora ${field.value}` : "Fără specificare"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Fără specificare</SelectItem>
                      {Array.from({ length: 8 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>Ora {i + 1}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              }}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Absența se înregistrează ca nemotivată. Dirigintele o poate motiva ulterior.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>Anulează</Button>
            <Button type="submit" disabled={isPending} className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Înregistrează"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
