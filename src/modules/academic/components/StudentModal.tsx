"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Copy, Check, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  lastName: z.string().min(1, "Numele este obligatoriu"),
  firstName: z.string().min(1, "Prenumele este obligatoriu"),
  personalId: z.string().optional(),
  dateOfBirth: z.string().optional(),
  classId: z.string().uuid("Clasa este obligatorie"),
  academicYearId: z.string().uuid("Anul școlar este obligatoriu"),
  parentLastName: z.string().optional(),
  parentFirstName: z.string().optional(),
  parentEmail: z.string().optional(),
  parentPhone: z.string().optional(),
  parentRelationship: z.enum(["PARENT", "GRANDPARENT", "LEGAL_GUARDIAN", "OTHER"]).optional(),
});

type FormValues = z.infer<typeof schema>;

const RELATIONSHIP_LABELS: Record<string, string> = {
  PARENT: "Părinte",
  GRANDPARENT: "Bunic / Bunică",
  LEGAL_GUARDIAN: "Tutore legal",
  OTHER: "Altul",
};

interface AvailableClass { id: string; name: string; }
interface AvailableYear { id: string; name: string; isActive?: boolean | null; }

interface Props {
  open: boolean;
  onClose: () => void;
  classId?: string;
  academicYearId?: string;
  classes?: AvailableClass[];
  years?: AvailableYear[];
}

export function StudentModal({ open, onClose, classId, academicYearId, classes = [], years = [] }: Props) {
  const [isPending, startTransition] = useTransition();
  const [parentPassword, setParentPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      parentRelationship: "PARENT",
      classId: classId ?? "",
      academicYearId: academicYearId ?? "",
    },
  });

  const parentRelationship = watch("parentRelationship");

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const result = await createStudent(data);
      if (result.success) {
        if (result.parentPassword) {
          setParentPassword(result.parentPassword);
        } else {
          toast.success("Elevul a fost adăugat");
          handleClose();
        }
      } else {
        toast.error(result.error ?? "Eroare la salvare");
      }
    });
  }

  function handleClose() {
    reset({
      parentRelationship: "PARENT",
      classId: classId ?? "",
      academicYearId: academicYearId ?? "",
    });
    setParentPassword(null);
    setCopied(false);
    setParentOpen(false);
    onClose();
  }

  async function copyPassword() {
    if (!parentPassword) return;
    await navigator.clipboard.writeText(parentPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{parentPassword ? "Cont creat cu succes" : "Elev nou"}</DialogTitle>
        </DialogHeader>

        {parentPassword ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Elevul și contul tutorelui au fost create. Transmiteți parola temporară — nu mai poate fi recuperată ulterior.
            </p>
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Parolă temporară tutore</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-sm font-semibold break-all">{parentPassword}</code>
                <Button size="sm" variant="outline" className="shrink-0" onClick={copyPassword}>
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Tutorele va fi solicitat să schimbe parola la prima autentificare.
            </p>
            <DialogFooter>
              <Button onClick={handleClose}>Închide</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* ─── Date elev ─── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b pb-1">
                Date elev
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Nume *</Label>
                  <Input id="lastName" placeholder="Popescu" {...register("lastName")} />
                  {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">Prenume *</Label>
                  <Input id="firstName" placeholder="Andrei" {...register("firstName")} />
                  {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="personalId">CNP (opțional)</Label>
                  <Input id="personalId" placeholder="5xxxxxxxxxx" maxLength={13} {...register("personalId")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dateOfBirth">Data nașterii (opțional)</Label>
                  <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
                </div>
              </div>
            </div>

            {/* ─── Clasă și an școlar ─── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b pb-1">
                Înscriere
              </p>
              <div className="grid grid-cols-2 gap-3">
                {years.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>An școlar *</Label>
                    <Controller
                      control={control}
                      name="academicYearId"
                      render={({ field }) => (
                        <Select
                          value={field.value ?? ""}
                          onValueChange={(v) => v && field.onChange(v)}
                        >
                          <SelectTrigger>
                            <SelectValue>
                              {field.value
                                ? (() => {
                                    const y = years.find((y) => y.id === field.value);
                                    return y ? `${y.name}${y.isActive ? " (Activ)" : ""}` : "Selectați anul";
                                  })()
                                : "Selectați anul"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {years.map((y) => (
                              <SelectItem key={y.id} value={y.id}>
                                {y.name}{y.isActive ? " (Activ)" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.academicYearId && <p className="text-xs text-destructive">{errors.academicYearId.message}</p>}
                  </div>
                )}
                {classes.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>Clasă *</Label>
                    <Controller
                      control={control}
                      name="classId"
                      render={({ field }) => (
                        <Select
                          value={field.value ?? ""}
                          onValueChange={(v) => v && field.onChange(v)}
                        >
                          <SelectTrigger>
                            <SelectValue>
                              {field.value
                                ? classes.find((c) => c.id === field.value)?.name ?? "Selectați clasa"
                                : "Selectați clasa"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {classes.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.classId && <p className="text-xs text-destructive">{errors.classId.message}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* ─── Date părinte/tutore ─── */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setParentOpen((v) => !v)}
                className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b pb-1 hover:text-foreground transition-colors"
              >
                <span>Date părinte / tutore (opțional)</span>
                {parentOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              {parentOpen && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="parentLastName">Nume părinte</Label>
                      <Input id="parentLastName" {...register("parentLastName")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="parentFirstName">Prenume părinte</Label>
                      <Input id="parentFirstName" {...register("parentFirstName")} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="parentEmail">Email părinte</Label>
                      <Input id="parentEmail" type="email" {...register("parentEmail")} />
                      {errors.parentEmail && <p className="text-xs text-destructive">{errors.parentEmail.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="parentPhone">Telefon (opțional)</Label>
                      <Input id="parentPhone" {...register("parentPhone")} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Relație cu elevul</Label>
                    <Controller
                      control={control}
                      name="parentRelationship"
                      render={({ field }) => (
                        <Select
                          value={field.value ?? "PARENT"}
                          onValueChange={(v) => v && field.onChange(v)}
                        >
                          <SelectTrigger>
                            <SelectValue>
                              {RELATIONSHIP_LABELS[parentRelationship ?? "PARENT"]}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(RELATIONSHIP_LABELS).map(([v, l]) => (
                              <SelectItem key={v} value={v}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Dacă emailul este completat se creează automat un cont de tutore cu parolă temporară.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                Anulează
              </Button>
              <Button type="submit" disabled={isPending} className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvează"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
