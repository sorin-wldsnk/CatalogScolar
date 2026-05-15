"use client";

import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { setClassSubjectTeacher } from "@/modules/academic/actions/teaching-assignment.actions";
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
import { Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";

const schema = z.object({
  teacherUserId: z.string().uuid("Selectați un profesor"),
});
type FormValues = z.infer<typeof schema>;

interface Teacher { id: string; firstName: string; lastName: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  classId: string;
  subjectId: string;
  subjectName: string;
  academicYearId: string;
  teachers: Teacher[];
  currentTeacherId?: string | null;
}

export function AssignTeacherModal({
  open,
  onClose,
  classId,
  subjectId,
  subjectName,
  academicYearId,
  teachers,
  currentTeacherId,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { teacherUserId: currentTeacherId ?? "" },
  });

  function handleClose() {
    reset();
    onClose();
  }

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const result = await setClassSubjectTeacher({
        classId,
        subjectId,
        academicYearId,
        teacherUserId: data.teacherUserId,
      });
      if (result.success) {
        toast.success("Profesorul a fost alocat");
        handleClose();
      } else {
        toast.error(result.error ?? "Eroare");
      }
    });
  }

  const noTeachers = teachers.length === 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {currentTeacherId ? "Schimbă profesorul" : "Alocă profesor"} — {subjectName}
          </DialogTitle>
        </DialogHeader>

        {noTeachers ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-800">
                  Niciun profesor nu predă această materie.
                </p>
                <p className="text-xs text-amber-700">
                  Configurați materiile predate din{" "}
                  <Link
                    href="/admin/profesori"
                    className="underline font-medium"
                    onClick={handleClose}
                  >
                    /admin/profesori
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Profesor</Label>
              <Controller
                name="teacherUserId"
                control={control}
                render={({ field }) => {
                  const teacher = teachers.find((t) => t.id === field.value);
                  return (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(v) => { if (v) field.onChange(v); }}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {teacher
                            ? `${teacher.lastName} ${teacher.firstName}`
                            : "Selectați profesorul"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.lastName} {t.firstName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }}
              />
              {errors.teacherUserId && (
                <p className="text-xs text-destructive">{errors.teacherUserId.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                Anulează
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvează"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {noTeachers && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Închide</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
