"use client";

import { CalendarRange, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EnergyPeriodState, EnergyPreset } from "@/lib/energy-monitoring";

interface EnergyPeriodFilterProps {
  period: EnergyPeriodState;
  onPresetChange: (preset: EnergyPreset) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  loading?: boolean;
}

export function EnergyPeriodFilter({
  period,
  onPresetChange,
  onFromChange,
  onToChange,
  onApply,
  onReset,
  loading,
}: EnergyPeriodFilterProps) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-[180px] flex-1">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <CalendarRange className="h-4 w-4" />
            Periode data
          </div>
          <Select
            value={period.preset}
            onValueChange={(value) => onPresetChange(value as EnergyPreset)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih periode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hari ini</SelectItem>
              <SelectItem value="last24h">24 jam terakhir</SelectItem>
              <SelectItem value="last7d">7 hari terakhir</SelectItem>
              <SelectItem value="last30d">30 hari terakhir</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid flex-[2] gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Dari (WIB)
            </label>
            <Input
              type="datetime-local"
              lang="id"
              value={period.from}
              onChange={(event) => onFromChange(event.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Sampai (WIB)
            </label>
            <Input
              type="datetime-local"
              lang="id"
              value={period.to}
              onChange={(event) => onToChange(event.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onReset} disabled={loading}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={onApply} disabled={loading}>
            Terapkan
          </Button>
        </div>
      </div>
    </div>
  );
}
