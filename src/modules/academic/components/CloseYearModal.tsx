"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { previewCloseAcademicYear, closeAcademicYear } from "@/modules/academic/actions/academic-year.actions";
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
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

const schema = z.object({
  newYearName: z.string().min(3, "Minim 3 caractere (ex: 2025-2026)"),
});
type FormValues = z.infer<typeof schema>;

interface Preview {
  promotedCount: number;
  graduatesCount: number;
  classesCopied: number;
  graduatingClasses: number;
  assignmentsCopied: number;
}

interface Summary {
  classesCopied: number;
  promoted: number;
  graduates: number;
  assignmentsCopied: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  activeYearId: string;
  activeYearName: string;
}

export function CloseYearModal({ open, onClose, activeYearId, activeYearName }: Props) {
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newYearName: "" },
  });

  useEffect(() => {
    if (open && !preview) {
      setLoadingPreview(true);
      previewCloseAcademicYear(activeYearId).then((result) => {
        setLoadingPreview(false);
        if (result.success && result.preview) setPreview(result.preview);
      });
    }
  }, [open, activeYearId, preview]);

  function handleClose() {
    reset();
    setPreview(null);
    setSummary(null);
    onClose();
  }

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const result = await closeAcademicYear(activeYearId, data.newYearName);
      if (result.success && result.summary) {
        setSummary(result.summary as Summary);
        toast.success("Anul școlar a fost închis cu succes");
      } else {
        toast.error(result.error ?? "Eroare");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Închide anul școlar {activeYearName}</DialogTitle>
        </DialogHeader>

        {summary ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <p className="font-medium">Operație finalizată cu succes!</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Clase create</span>
                <span className="font-medium">{summary.classesCopied}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Elevi promovați</span>
                <span className="font-medium text-green-700">{summary.promoted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Absolvenți</span>
                <span className="font-medium text-blue-700">{summary.graduates}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Încadrări copiate</span>
                <span className="font-medium">{summary.assignmentsCopied}</span>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose} className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white">
                Închide
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>Această operație este ireversibilă. Verificați cu atenție înainte de a continua.</p>
            </div>

            {/* Preview */}
            {loadingPreview && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Se calculează previzualizarea...
              </div>
            )}

            {preview && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <p className="font-medium text-gray-700 mb-3">Previzualizare</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Clase de promovat (0–7)</span>
                  <span className="font-medium">{preview.classesCopied} clase</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Clase de absolvit (cl. 8)</span>
                  <span className="font-medium">{preview.graduatingClasses} clase</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Elevi de promovat</span>
                  <span className="font-medium text-green-700">{preview.promotedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Elevi absolvenți</span>
                  <span className="font-medium text-blue-700">{preview.graduatesCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Încadrări de copiat</span>
                  <span className="font-medium">~{preview.assignmentsCopied}</span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="newYearName">Numele noului an școlar</Label>
              <Input
                id="newYearName"
                placeholder="ex: 2025-2026"
                {...register("newYearName")}
              />
              {errors.newYearName && (
                <p className="text-xs text-destructive">{errors.newYearName.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                Anulează
              </Button>
              <Button
                type="submit"
                disabled={isPending || loadingPreview}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmă și închide"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
