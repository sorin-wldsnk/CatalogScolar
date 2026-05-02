"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createParent } from "@/modules/users/actions/parent.actions";

const schema = z.object({
  firstName: z.string().min(1, "Prenumele este obligatoriu"),
  lastName: z.string().min(1, "Numele este obligatoriu"),
  email: z.string().email("Email invalid"),
  relationship: z.enum(["PARENT", "GRANDPARENT", "LEGAL_GUARDIAN", "OTHER"]),
});

type FormData = z.infer<typeof schema>;

const RELATIONSHIP_LABELS: Record<string, string> = {
  PARENT: "Părinte",
  GRANDPARENT: "Bunic/Bunică",
  LEGAL_GUARDIAN: "Tutore legal",
  OTHER: "Altul",
};

interface Props {
  open: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  onCreated: () => void;
}

export function ParentCreateModal({ open, onClose, studentId, studentName, onCreated }: Props) {
  const [phase, setPhase] = useState<"form" | "password">("form");
  const [tempPassword, setTempPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { relationship: "PARENT" },
  });

  const relationship = watch("relationship");

  async function onSubmit(data: FormData) {
    setServerError("");
    const result = await createParent({ ...data, studentId });
    if (!result.success) {
      setServerError(result.error ?? "Eroare necunoscută");
      return;
    }
    setTempPassword(result.password ?? "");
    setPhase("password");
    onCreated();
  }

  function handleClose() {
    reset();
    setPhase("form");
    setTempPassword("");
    setCopied(false);
    setServerError("");
    onClose();
  }

  async function copyPassword() {
    await navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {phase === "form" ? `Adaugă tutore — ${studentName}` : "Cont creat cu succes"}
          </DialogTitle>
        </DialogHeader>

        {phase === "form" ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="lastName">Nume *</Label>
                <Input id="lastName" {...register("lastName")} />
                {errors.lastName && (
                  <p className="text-xs text-red-500">{errors.lastName.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="firstName">Prenume *</Label>
                <Input id="firstName" {...register("firstName")} />
                {errors.firstName && (
                  <p className="text-xs text-red-500">{errors.firstName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Relație cu elevul</Label>
              <Select
                value={relationship}
                onValueChange={(v) => v && setValue("relationship", v as FormData["relationship"])}
              >
                <SelectTrigger>
                  <SelectValue>
                    {RELATIONSHIP_LABELS[relationship] ?? "Selectați relația"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {serverError && (
              <p className="text-sm text-red-500">{serverError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={handleClose}>
                Anulează
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Se creează..." : "Creează cont"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Contul a fost creat. Transmiteți parola temporară tutorelui — aceasta nu mai poate fi recuperată ulterior.
            </p>
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Parolă temporară</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-sm font-semibold break-all">{tempPassword}</code>
                <Button size="sm" variant="outline" className="shrink-0" onClick={copyPassword}>
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Tutorele va fi solicitat să schimbe parola la prima autentificare.
            </p>
            <div className="flex justify-end">
              <Button onClick={handleClose}>Închide</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
