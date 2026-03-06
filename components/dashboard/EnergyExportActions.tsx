"use client";

import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EnergyExportActionsProps {
  onExportPdf: () => void | Promise<void>;
  onExportExcel: () => void | Promise<void>;
  disabled?: boolean;
}

export function EnergyExportActions({
  onExportPdf,
  onExportExcel,
  disabled,
}: EnergyExportActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        onClick={() => void onExportPdf()}
        disabled={disabled}
      >
        <FileText className="mr-2 h-4 w-4" />
        Export PDF
      </Button>
      <Button
        variant="outline"
        onClick={() => void onExportExcel()}
        disabled={disabled}
      >
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Export Excel
      </Button>
    </div>
  );
}
