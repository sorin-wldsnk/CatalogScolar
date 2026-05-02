"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createAcademicYear } from "@/modules/academic/actions/academic-year.actions";
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
  name: z.string().min(1, "Numele este obligatoriu").regex(/^\d{4}-\d{4}$/, "Format: AAAA-AAAA"),
  startDate: z.string().min(1, "Data de început este obligatorie"),
  endDate: z.string().min(1, "Data de sfârșit este obligatorie"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AcademicYearModal({ open, onClose }: Props) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const result = await createAcademicYear(data);
      if (result.success) {
        toast.success("An școlar creat cu succes");
        reset();
        onClose();
      } else {
        toast.error(result.error ?? "Eroare la creare");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>An școlar nou</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Denumire (ex: 2024-2025)</Label>
            <Input id="name" placeholder="2024-2025" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="startDate">Data de început</Label>
            <Input id="startDate" type="date" {...register("startDate")} />
            {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endDate">Data de sfârșit</Label>
            <Input id="endDate" type="date" {...register("endDate")} />
            {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
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
