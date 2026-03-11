"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ExportFormat = "pdf" | "excel";
export type ExportPeriod = {
  from: string;
  to: string;
};

interface ExportModalProps {
  onExport: (format: ExportFormat, period: ExportPeriod) => Promise<void>;
  disabled?: boolean;
}

const getDefaultPeriod = (): ExportPeriod => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const pad = (n: number) => n.toString().padStart(2, "0");
  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return {
    from: formatDate(today),
    to: formatDate(now),
  };
};

export function ExportModal({ onExport, disabled }: ExportModalProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [period, setPeriod] = useState<ExportPeriod>(getDefaultPeriod);
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      await onExport(format, period);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={disabled}
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[340px]">
        <DialogHeader>
          <DialogTitle className="text-sm">Export Data</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label className="text-[10px]">Periode</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="datetime-local"
                value={period.from}
                onChange={(e) =>
                  setPeriod((p) => ({ ...p, from: e.target.value }))
                }
                className="h-7 text-[10px]"
              />
              <Input
                type="datetime-local"
                value={period.to}
                onChange={(e) =>
                  setPeriod((p) => ({ ...p, to: e.target.value }))
                }
                className="h-7 text-[10px]"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px]">Format</Label>
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as ExportFormat)}
            >
              <SelectTrigger className="h-7 text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf" className="text-[10px]">
                  PDF
                </SelectItem>
                <SelectItem value="excel" className="text-[10px]">
                  Excel
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleExport}
            disabled={loading}
            className="w-full h-8 text-xs"
          >
            {loading ? "Exporting..." : "Export"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
