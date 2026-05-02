"use client";

import { useState } from "react";
import { X, User, Users, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tab = "date" | "tutori" | "istoric";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "date", label: "Date personale", icon: User },
  { id: "tutori", label: "Tutori", icon: Users },
  { id: "istoric", label: "Istoric școlar", icon: History },
];

interface Props {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    status: string;
    className?: string | null;
  };
  onClose: () => void;
}

export function StudentPanel({ student, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("date");

  return (
    <div className="w-80 shrink-0 rounded-xl border bg-white shadow-sm sticky top-20 h-fit">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b">
        <div>
          <p className="font-semibold text-[#1e3a5f]">
            {student.lastName} {student.firstName}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {student.className ?? "Fără clasă"}
          </p>
        </div>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                activeTab === tab.id
                  ? "text-[#1e5fa8] border-b-2 border-[#1e5fa8] -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === "date" && (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Nume complet</p>
              <p className="font-medium">{student.lastName} {student.firstName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Status</p>
              <Badge variant="outline" className="text-xs">{student.status}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Clasă curentă</p>
              <p>{student.className ?? "—"}</p>
            </div>
          </div>
        )}

        {activeTab === "tutori" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Niciun tutore adăugat.</p>
            <Button size="sm" variant="outline" className="w-full text-[#1e5fa8] border-[#1e5fa8]">
              + Adaugă tutore
            </Button>
          </div>
        )}

        {activeTab === "istoric" && (
          <div className="text-sm text-muted-foreground">
            <p>Istoricul de înscrieri va fi disponibil în faza următoare.</p>
          </div>
        )}
      </div>
    </div>
  );
}
