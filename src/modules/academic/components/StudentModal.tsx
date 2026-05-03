"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createStudent } from "@/modules/academic/actions/student.actions";
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

const schema = z.object({
  lastName: z.string().min(1, "Numele este obligatoriu"),
  firstName: z.string().min(1, "Prenumele este obligatoriu"),
  personalId: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  classId?: string;
  academicYearId?: string;
}

export function StudentModal({ open, onClose, classId, academicYearId }: Props) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const result = await createStudent({ ...data, classId, academicYearId });
      if (result.success) {
        toast.success("Elevul a fost adăugat");
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
          <DialogTitle>Elev nou</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Nume</Label>
              <Input id="lastName" placeholder="Popescu" {...register("lastName")} />
              {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="firstName">Prenume</Label>
              <Input id="firstName" placeholder="Andrei" {...register("firstName")} />
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="personalId">CNP (opțional)</Label>
            <Input id="personalId" placeholder="5xxxxxxxxxx" maxLength={13} {...register("personalId")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dateOfBirth">Data nașterii (opțional)</Label>
            <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
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
