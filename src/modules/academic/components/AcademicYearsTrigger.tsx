"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AcademicYearModal } from "./AcademicYearModal";

export function AcademicYearsTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-[#1e5fa8] hover:bg-[#1a5294] text-white"
      >
        <Plus className="h-4 w-4 mr-2" />
        An școlar nou
      </Button>
      <AcademicYearModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
