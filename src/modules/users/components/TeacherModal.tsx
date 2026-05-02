"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createTeacher } from "@/modules/users/actions/teacher.actions";
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
import { Loader2, Copy, Check } from "lucide-react";

const schema = z.object({
  firstName: z.string().min(1, "Prenumele este obligatoriu"),
  lastName: z.string().min(1, "Numele este obligatoriu"),
  email: z.string().email("Email invalid"),
  isTeacher: z.boolean(),
  isHomeroom: z.boolean(),
}).refine((d) => d.isTeacher || d.isHomeroom, {
  message: "Selectați cel puțin un rol",
  path: ["isTeacher"],
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function TeacherModal({ open, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { isTeacher: true, isHomeroom: false },
  });

  function handleClose() {
    reset();
    setGeneratedPassword(null);
    setCopied(false);
    onClose();
  }

  function onSubmit(data: FormValues) {
    const roles: ("TEACHER" | "HOMEROOM")[] = [];
    if (data.isTeacher) roles.push("TEACHER");
    if (data.isHomeroom) roles.push("HOMEROOM");

    startTransition(async () => {
      const result = await createTeacher({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        roles,
      });

      if (result.success && result.password) {
        setGeneratedPassword(result.password);
        toast.success("Profesorul a fost creat");
      } else {
        toast.error(result.error ?? "Eroare la creare");
      }
    });
  }

  function handleCopy() {
    if (!generatedPassword) return;
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Profesor nou</DialogTitle>
        </DialogHeader>

        {generatedPassword ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Profesorul a fost creat. Copiați parola temporară și transmiteți-o profesorului.
              <strong> Nu se va mai afișa!</strong>
            </p>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
              <code className="flex-1 text-sm font-mono font-semibold text-gray-800">
                {generatedPassword}
              </code>
              <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0">
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              La prima autentificare, profesorul va fi obligat să schimbe parola.
            </p>
            <DialogFooter>
              <Button onClick={handleClose} className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white">
                Am copiat parola
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">Prenume</Label>
                <Input id="firstName" placeholder="Ion" {...register("firstName")} />
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Nume</Label>
                <Input id="lastName" placeholder="Ionescu" {...register("lastName")} />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="profesor@scoala.ro"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Roluri</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register("isTeacher")} className="h-4 w-4 accent-[#1e5fa8]" />
                  <span className="text-sm">Profesor</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register("isHomeroom")} className="h-4 w-4 accent-[#1e5fa8]" />
                  <span className="text-sm">Diriginte</span>
                </label>
              </div>
              {errors.isTeacher && (
                <p className="text-xs text-destructive">{errors.isTeacher.message}</p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Parola temporară va fi generată automat și afișată o singură dată după creare.
            </p>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                Anulează
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Creează"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
