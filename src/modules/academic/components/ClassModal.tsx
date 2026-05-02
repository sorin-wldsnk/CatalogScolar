"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClass } from "@/modules/academic/actions/class.actions";
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

const schema = z.object({
  name: z.string().min(1, "Numele clasei este obligatoriu"),
  gradeLevel: z.coerce.number().int().min(0).max(8),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  academicYearId: string;
}

export function ClassModal({ open, onClose, academicYearId }: Props) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { gradeLevel: 5 },
  });

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const result = await createClass({ ...data, academicYearId });
      if (result.success) {
        toast.success("Clasa a fost creată");
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
          <DialogTitle>Clasă nouă</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Denumire clasă (ex: 7A)</Label>
            <Input id="name" placeholder="7A" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Nivel (clasă)</Label>
            <Select
              defaultValue="5"
              onValueChange={(v) => { if (v) setValue("gradeLevel", parseInt(v)); }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selectați nivelul" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 9 }, (_, i) => (
                  <SelectItem key={i} value={String(i)}>
                    Clasa {i === 0 ? "Pregătitoare" : i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.gradeLevel && <p className="text-xs text-destructive">{errors.gradeLevel.message}</p>}
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
