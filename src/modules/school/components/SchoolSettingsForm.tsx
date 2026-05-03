"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { updateSchool } from "@/modules/school/actions/school.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  name: z.string().min(1, "Denumirea școlii este obligatorie"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  cif: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  school: {
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    cif?: string | null;
  };
}

export function SchoolSettingsForm({ school }: Props) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: school.name,
      address: school.address ?? "",
      phone: school.phone ?? "",
      email: school.email ?? "",
      cif: school.cif ?? "",
    },
  });

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const result = await updateSchool(data);
      if (result.success) {
        toast.success("Datele școlii au fost actualizate");
      } else {
        toast.error(result.error ?? "Eroare la salvare");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-lg">
      <div className="space-y-1.5">
        <Label htmlFor="name">Denumire școală *</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address">Adresă</Label>
        <Input id="address" placeholder="Str. Exemplu nr. 1, Oraș" {...register("address")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefon</Label>
          <Input id="phone" {...register("phone")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cif">CIF / CUI (opțional)</Label>
          <Input id="cif" {...register("cif")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email instituțional</Label>
        <Input id="email" type="email" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <Button type="submit" disabled={isPending} className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Salvează modificările
      </Button>
    </form>
  );
}
