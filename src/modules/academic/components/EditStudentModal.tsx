"use client";

import { useState, useEffect, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { updateStudent } from "@/modules/academic/actions/student.actions";
import { fetchStudentGuardians, updateGuardian, createParent } from "@/modules/users/actions/parent.actions";
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

const studentSchema = z.object({
  firstName: z.string().min(1, "Prenumele este obligatoriu"),
  lastName: z.string().min(1, "Numele este obligatoriu"),
  personalId: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

const guardianSchema = z.object({
  firstName: z.string().min(1, "Prenumele este obligatoriu"),
  lastName: z.string().min(1, "Numele este obligatoriu"),
  email: z.string().email("Email invalid"),
  phone: z.string().optional(),
  relationship: z.enum(["PARENT", "GRANDPARENT", "LEGAL_GUARDIAN", "OTHER"]),
});

type StudentForm = z.infer<typeof studentSchema>;
type GuardianForm = z.infer<typeof guardianSchema>;

const RELATIONSHIP_LABELS: Record<string, string> = {
  PARENT: "Părinte",
  GRANDPARENT: "Bunic / Bunică",
  LEGAL_GUARDIAN: "Tutore legal",
  OTHER: "Altul",
};

type Guardian = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  relationship: string;
  isPrimary: boolean | null;
};

interface StudentData {
  id: string;
  firstName: string;
  lastName: string;
  personalId?: string | null;
  dateOfBirth?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  student: StudentData;
}

export function EditStudentModal({ open, onClose, student }: Props) {
  const [isPending, startTransition] = useTransition();
  const [guardian, setGuardian] = useState<Guardian | null>(null);
  const [loadingGuardian, setLoadingGuardian] = useState(false);
  const [addingNewGuardian, setAddingNewGuardian] = useState(false);

  const studentForm = useForm<StudentForm>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      firstName: student.firstName,
      lastName: student.lastName,
      personalId: student.personalId ?? "",
      dateOfBirth: student.dateOfBirth ?? "",
    },
  });

  const guardianForm = useForm<GuardianForm>({
    resolver: zodResolver(guardianSchema),
    defaultValues: { relationship: "PARENT" },
  });

  const guardianRelationship = guardianForm.watch("relationship");

  useEffect(() => {
    if (!open) return;
    studentForm.reset({
      firstName: student.firstName,
      lastName: student.lastName,
      personalId: student.personalId ?? "",
      dateOfBirth: student.dateOfBirth ?? "",
    });
    setAddingNewGuardian(false);

    setLoadingGuardian(true);
    fetchStudentGuardians(student.id).then((res) => {
      const first = res.data?.[0] as Guardian | undefined;
      setGuardian(first ?? null);
      if (first) {
        guardianForm.reset({
          firstName: first.firstName,
          lastName: first.lastName,
          email: first.email,
          phone: (first as { phone?: string | null }).phone ?? "",
          relationship: (first.relationship as GuardianForm["relationship"]) ?? "PARENT",
        });
      } else {
        guardianForm.reset({ relationship: "PARENT" });
      }
      setLoadingGuardian(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, student.id]);

  function handleClose() {
    studentForm.reset();
    guardianForm.reset();
    setGuardian(null);
    setAddingNewGuardian(false);
    onClose();
  }

  function onSubmit() {
    studentForm.handleSubmit(async (studentData) => {
      const studentResult = await updateStudent(student.id, {
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        personalId: studentData.personalId,
        dateOfBirth: studentData.dateOfBirth,
      });
      if (!studentResult.success) {
        toast.error(studentResult.error ?? "Eroare la actualizare elev");
        return;
      }

      // handle guardian update or creation
      if (guardian && !addingNewGuardian) {
        const valid = await guardianForm.trigger();
        if (!valid) return;
        const gData = guardianForm.getValues();
        const gResult = await updateGuardian({
          guardianUserId: guardian.userId,
          guardianId: guardian.id,
          firstName: gData.firstName,
          lastName: gData.lastName,
          email: gData.email,
          phone: gData.phone,
          relationship: gData.relationship,
        });
        if (!gResult.success) {
          toast.error(gResult.error ?? "Eroare la actualizare tutore");
          return;
        }
      } else if (addingNewGuardian) {
        const valid = await guardianForm.trigger();
        if (!valid) return;
        const gData = guardianForm.getValues();
        if (gData.email) {
          const gResult = await createParent({
            studentId: student.id,
            firstName: gData.firstName,
            lastName: gData.lastName,
            email: gData.email,
            relationship: gData.relationship,
          });
          if (!gResult.success) {
            toast.error(gResult.error ?? "Eroare la creare tutore");
            return;
          }
        }
      }

      toast.success("Datele au fost actualizate");
      handleClose();
    })();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Editează elev — {student.lastName} {student.firstName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* ─── Date elev ─── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b pb-1">
              Date elev
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nume *</Label>
                <Input {...studentForm.register("lastName")} />
                {studentForm.formState.errors.lastName && (
                  <p className="text-xs text-destructive">{studentForm.formState.errors.lastName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Prenume *</Label>
                <Input {...studentForm.register("firstName")} />
                {studentForm.formState.errors.firstName && (
                  <p className="text-xs text-destructive">{studentForm.formState.errors.firstName.message}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>CNP (opțional)</Label>
                <Input {...studentForm.register("personalId")} maxLength={13} />
              </div>
              <div className="space-y-1.5">
                <Label>Data nașterii (opțional)</Label>
                <Input type="date" {...studentForm.register("dateOfBirth")} />
              </div>
            </div>
          </div>

          {/* ─── Tutore ─── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b pb-1">
              {guardian ? "Tutore existent" : "Adaugă tutore (opțional)"}
            </p>

            {loadingGuardian ? (
              <p className="text-sm text-muted-foreground">Se încarcă...</p>
            ) : guardian && !addingNewGuardian ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Nume *</Label>
                    <Input {...guardianForm.register("lastName")} />
                    {guardianForm.formState.errors.lastName && (
                      <p className="text-xs text-destructive">{guardianForm.formState.errors.lastName.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Prenume *</Label>
                    <Input {...guardianForm.register("firstName")} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Email *</Label>
                    <Input type="email" {...guardianForm.register("email")} />
                    {guardianForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{guardianForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Telefon</Label>
                    <Input {...guardianForm.register("phone")} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Relație</Label>
                  <Controller
                    control={guardianForm.control}
                    name="relationship"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? "PARENT"}
                        onValueChange={(v) => v && field.onChange(v)}
                      >
                        <SelectTrigger>
                          <SelectValue>
                            {RELATIONSHIP_LABELS[guardianRelationship ?? "PARENT"]}
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
              </div>
            ) : (
              !addingNewGuardian ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-[#1e5fa8] border-[#1e5fa8]"
                  onClick={() => setAddingNewGuardian(true)}
                >
                  + Adaugă tutore
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Nume</Label>
                      <Input {...guardianForm.register("lastName")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Prenume</Label>
                      <Input {...guardianForm.register("firstName")} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Email *</Label>
                      <Input type="email" {...guardianForm.register("email")} />
                      {guardianForm.formState.errors.email && (
                        <p className="text-xs text-destructive">{guardianForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Telefon</Label>
                      <Input {...guardianForm.register("phone")} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Relație</Label>
                    <Controller
                      control={guardianForm.control}
                      name="relationship"
                      render={({ field }) => (
                        <Select
                          value={field.value ?? "PARENT"}
                          onValueChange={(v) => v && field.onChange(v)}
                        >
                          <SelectTrigger>
                            <SelectValue>
                              {RELATIONSHIP_LABELS[guardianRelationship ?? "PARENT"]}
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAddingNewGuardian(false)}
                  >
                    Anulează
                  </Button>
                </div>
              )
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
            Anulează
          </Button>
          <Button
            onClick={() => startTransition(() => onSubmit())}
            disabled={isPending}
            className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvează"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
