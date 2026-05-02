"use client";

import { useTransition } from "react";
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

const schema = z.object({
  name: z.string().min(1, "Numele materiei este obligatoriu"),
  code: z.string().min(1, "Codul este obligatoriu").max(10, "Max 10 caractere").toUpperCase(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SubjectModal({ open, onClose }: Props) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const result = await createSubject(data);
      if (result.success) {
        toast.success("Materia a fost adăugată");
        reset();
        onClose();
      } else {
        toast.error(result.error ?? "Eroare la salvare");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Materie nouă</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Denumire materie</Label>
            <Input id="name" placeholder="Matematică" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="code">Cod materie (ex: MAT)</Label>
            <Input id="code" placeholder="MAT" maxLength={10} {...register("code")} />
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
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
