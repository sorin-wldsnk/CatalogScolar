"use client";

import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createAssignment } from "@/modules/academic/actions/teaching-assignment.actions";
import { Button } from "@/components/ui/button";
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

const schema = z.object({
  teacherUserId: z.string().uuid("Selectați un profesor"),
  classId: z.string().uuid("Selectați o clasă"),
  subjectId: z.string().uuid("Selectați o materie"),
});

type FormValues = z.infer<typeof schema>;

interface Teacher { id: string; firstName: string; lastName: string; }
interface ClassRow { id: string; name: string; }
interface SubjectRow { id: string; name: string; code: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  academicYearId: string;
  teachers: Teacher[];
  classes: ClassRow[];
  subjects: SubjectRow[];
}

export function AssignmentModal({ open, onClose, academicYearId, teachers, classes, subjects }: Props) {
  const [isPending, startTransition] = useTransition();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const result = await createAssignment({ ...data, academicYearId });
      if (result.success) {
        toast.success("Încadrarea a fost adăugată");
        reset();
        onClose();
      } else {
        toast.error(result.error ?? "Eroare la salvare");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Încadrare nouă</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Profesor</Label>
            <Controller
              name="teacherUserId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => { if (v) field.onChange(v); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectați profesorul" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.length === 0 ? (
                      <SelectItem value="none" label="Niciun profesor disponibil" disabled>Niciun profesor disponibil</SelectItem>
                    ) : (
                      teachers.map((t) => {
                        const name = `${t.lastName} ${t.firstName}`;
                        return (
                          <SelectItem key={t.id} value={t.id} label={name}>
                            {name}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.teacherUserId && <p className="text-xs text-destructive">{errors.teacherUserId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Clasă</Label>
            <Controller
              name="classId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => { if (v) field.onChange(v); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectați clasa" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id} label={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.classId && <p className="text-xs text-destructive">{errors.classId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Materie</Label>
            <Controller
              name="subjectId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => { if (v) field.onChange(v); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectați materia" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => {
                      const label = `${s.name} (${s.code})`;
                      return (
                        <SelectItem key={s.id} value={s.id} label={label}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.subjectId && <p className="text-xs text-destructive">{errors.subjectId.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
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
