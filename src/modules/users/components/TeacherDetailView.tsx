"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { updateTeacher, toggleTeacherSubject, addRoleToTeacher, removeRoleFromTeacher } from "@/modules/users/actions/teacher.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Pencil, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { TeacherRow } from "@/modules/users/queries/teacher.queries";
import type { Subject } from "@/db/schema";

const ROLE_LABEL: Record<string, string> = {
  TEACHER: "Profesor",
  HOMEROOM: "Diriginte",
};

const schema = z.object({
  firstName: z.string().min(1, "Prenumele este obligatoriu"),
  lastName: z.string().min(1, "Numele este obligatoriu"),
  email: z.string().email("Email invalid"),
});
type FormValues = z.infer<typeof schema>;

const SECONDARY_LEVELS = [5, 6, 7, 8];

interface AssignmentRow {
  id: string;
  academicYearName: string;
  className: string;
  subjectName: string;
  subjectCode: string;
}

interface Props {
  teacher: TeacherRow;
  assignments: AssignmentRow[];
  allSubjects: Subject[];
  teacherSubjectIds: string[];
}

function isSecondarySubject(s: Subject) {
  return (s.gradeLevels ?? []).some((l) => SECONDARY_LEVELS.includes(l));
}

function isItinerantPrimarySubject(s: Subject) {
  return s.isItinerant && !(s.gradeLevels ?? []).some((l) => SECONDARY_LEVELS.includes(l));
}

export function TeacherDetailView({ teacher, assignments, allSubjects, teacherSubjectIds }: Props) {
  const [activeTab, setActiveTab] = useState<"date" | "materii" | "incadrari">("date");
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set(teacherSubjectIds));
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>(teacher.roles);
  const [confirmRemoveHomeroom, setConfirmRemoveHomeroom] = useState(false);
  const [togglingRole, startRoleTransition] = useTransition();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
    },
  });

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const result = await updateTeacher(teacher.id, data);
      if (result.success) {
        toast.success("Datele au fost actualizate");
        setEditing(false);
      } else {
        toast.error(result.error ?? "Eroare la actualizare");
      }
    });
  }

  function handleToggleSubject(subjectId: string) {
    const add = !checkedIds.has(subjectId);
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (add) next.add(subjectId); else next.delete(subjectId);
      return next;
    });
    setTogglingId(subjectId);
    startTransition(async () => {
      const result = await toggleTeacherSubject(teacher.id, subjectId, add);
      if (!result.success) {
        toast.error(result.error ?? "Eroare la salvare");
        setCheckedIds((prev) => {
          const next = new Set(prev);
          if (add) next.delete(subjectId); else next.add(subjectId);
          return next;
        });
      }
      setTogglingId(null);
    });
  }

  function handleToggleHomeroom(checked: boolean) {
    if (!checked) {
      setConfirmRemoveHomeroom(true);
      return;
    }
    startRoleTransition(async () => {
      const result = await addRoleToTeacher(teacher.id, "HOMEROOM");
      if (result.success) {
        setRoles((prev) => prev.includes("HOMEROOM") ? prev : [...prev, "HOMEROOM"]);
        toast.success("Rolul Diriginte/Învățător a fost adăugat");
      } else {
        toast.error(result.error ?? "Eroare");
      }
    });
  }

  function handleConfirmRemoveHomeroom() {
    setConfirmRemoveHomeroom(false);
    startRoleTransition(async () => {
      const result = await removeRoleFromTeacher(teacher.id, "HOMEROOM");
      if (result.success) {
        setRoles((prev) => prev.filter((r) => r !== "HOMEROOM"));
        toast.success("Rolul Diriginte/Învățător a fost eliminat");
      } else {
        toast.error(result.error ?? "Eroare");
      }
    });
  }

  const secondarySubjects = allSubjects.filter(isSecondarySubject);
  const itinerantPrimarySubjects = allSubjects.filter(isItinerantPrimarySubject);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">
          {teacher.lastName} {teacher.firstName}
        </h1>
        <div className="flex items-center gap-2 mt-1">
          {teacher.roles.map((r) => (
            <Badge key={r} variant="outline" className="text-xs border-[#1e5fa8]/30 text-[#1e5fa8]">
              {ROLE_LABEL[r] ?? r}
            </Badge>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0">
          {(["date", "materii", "incadrari"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                activeTab === tab
                  ? "border-[#1e5fa8] text-[#1e5fa8]"
                  : "border-transparent text-muted-foreground hover:text-gray-700",
              ].join(" ")}
            >
              {tab === "date" ? "Date personale"
                : tab === "materii" ? `Materii (${checkedIds.size})`
                : "Încadrări"}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Date personale */}
      {activeTab === "date" && (
        <div className="rounded-xl border bg-white p-6 max-w-lg space-y-4">
          {!editing ? (
            <>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Prenume</p>
                  <p className="font-medium">{teacher.firstName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Nume</p>
                  <p className="font-medium">{teacher.lastName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Email</p>
                  <p className="font-medium">{teacher.email}</p>
                </div>
                {teacher.mustChangeOnLogin && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                    Profesorul nu și-a schimbat încă parola temporară.
                  </p>
                )}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Roluri active</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex gap-1.5">
                      {roles.map((r) => (
                        <Badge key={r} variant="outline" className="text-xs border-[#1e5fa8]/30 text-[#1e5fa8]">
                          {ROLE_LABEL[r] ?? r}
                        </Badge>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={roles.includes("HOMEROOM")}
                        disabled={togglingRole}
                        onChange={(e) => handleToggleHomeroom(e.target.checked)}
                        className="h-4 w-4 accent-[#1e5fa8]"
                      />
                      <span className="text-sm text-muted-foreground">Diriginte / Învățător</span>
                      {togglingRole && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    </label>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
                className="mt-2"
              >
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Editează
              </Button>
            </>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">Prenume</Label>
                  <Input id="firstName" {...register("firstName")} />
                  {errors.firstName && (
                    <p className="text-xs text-destructive">{errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Nume</Label>
                  <Input id="lastName" {...register("lastName")} />
                  {errors.lastName && (
                    <p className="text-xs text-destructive">{errors.lastName.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setEditing(false); reset(); }}
                  disabled={isPending}
                >
                  Anulează
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvează"}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Tab: Materii */}
      {activeTab === "materii" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Bifați materiile pe care le predă acest profesor. Acestea vor fi disponibile la alocare în încadrări.
          </p>

          {itinerantPrimarySubjects.length > 0 && (
            <div className="rounded-xl border bg-white p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Primar — itinerante (sport, engleză, religie, opțional)
              </p>
              <div className="flex flex-wrap gap-2">
                {itinerantPrimarySubjects.map((s) => {
                  const checked = checkedIds.has(s.id);
                  const toggling = togglingId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={toggling}
                      onClick={() => handleToggleSubject(s.id)}
                      className={[
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium border transition-colors",
                        checked
                          ? "bg-[#1e5fa8] border-[#1e5fa8] text-white"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:border-[#1e5fa8]/50",
                        toggling ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                      ].join(" ")}
                    >
                      {toggling && <Loader2 className="h-3 w-3 animate-spin" />}
                      <span className="text-xs font-mono">{s.code}</span>
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {secondarySubjects.length > 0 && (
            <div className="rounded-xl border bg-white p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Gimnaziu (V–VIII)
              </p>
              <div className="flex flex-wrap gap-2">
                {secondarySubjects.map((s) => {
                  const checked = checkedIds.has(s.id);
                  const toggling = togglingId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={toggling}
                      onClick={() => handleToggleSubject(s.id)}
                      className={[
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium border transition-colors",
                        checked
                          ? "bg-[#1e5fa8] border-[#1e5fa8] text-white"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:border-[#1e5fa8]/50",
                        toggling ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                      ].join(" ")}
                    >
                      {toggling && <Loader2 className="h-3 w-3 animate-spin" />}
                      <span className="text-xs font-mono">{s.code}</span>
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {allSubjects.length === 0 && (
            <div className="rounded-xl border bg-white p-12 text-center text-muted-foreground">
              Nicio materie configurată în școală.
            </div>
          )}
        </div>
      )}

      {/* Tab: Încadrări */}
      {activeTab === "incadrari" && (
        <>
          {assignments.length === 0 ? (
            <div className="rounded-xl border bg-white p-12 text-center text-muted-foreground">
              Nicio încadrare pentru acest profesor.
            </div>
          ) : (
            <div className="rounded-xl border bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>An școlar</TableHead>
                    <TableHead>Clasă</TableHead>
                    <TableHead>Materie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-muted-foreground">{a.academicYearName}</TableCell>
                      <TableCell className="font-medium">{a.className}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                            {a.subjectCode}
                          </span>
                          {a.subjectName}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {/* Dialog confirmare eliminare rol HOMEROOM */}
      <Dialog open={confirmRemoveHomeroom} onOpenChange={(o) => { if (!o) setConfirmRemoveHomeroom(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Eliminare rol Diriginte/Învățător
            </DialogTitle>
            <DialogDescription>
              Atenție: dacă acest profesor este alocat ca diriginte la o clasă,
              va pierde drepturile aferente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmRemoveHomeroom(false)}
              disabled={togglingRole}
            >
              Anulează
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleConfirmRemoveHomeroom}
              disabled={togglingRole}
            >
              {togglingRole ? <Loader2 className="h-4 w-4 animate-spin" /> : "Elimină rolul"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
