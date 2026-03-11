"use client";

import { useState } from "react";
import { format, subDays } from "date-fns";
import { Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type DatePreset =
  | "all"
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "custom";

export interface DateRange {
  preset: DatePreset;
  from: string;
  to: string;
  label: string;
}

export function buildRange(preset: Exclude<DatePreset, "custom">): DateRange {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "all":
      return {
        preset,
        from: "",
        to: "",
        label: "All",
      };
    case "today":
      return {
        preset,
        from: todayStart.toISOString(),
        to: now.toISOString(),
        label: "Today",
      };
    case "yesterday": {
      const yStart = subDays(todayStart, 1);
      return {
        preset,
        from: yStart.toISOString(),
        to: todayStart.toISOString(),
        label: "Yesterday",
      };
    }
    case "7d":
      return {
        preset,
        from: subDays(todayStart, 7).toISOString(),
        to: now.toISOString(),
        label: "Last 7 Days",
      };
    case "30d":
      return {
        preset,
        from: subDays(todayStart, 30).toISOString(),
        to: now.toISOString(),
        label: "Last 30 Days",
      };
  }
}

interface ChartDateFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  compact?: boolean;
}

export function ChartDateFilter({
  value,
  onChange,
  compact,
}: ChartDateFilterProps) {
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const presets: { key: Exclude<DatePreset, "custom">; label: string }[] = [
    { key: "all", label: "All" },
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "7d", label: "Last 7 Days" },
    { key: "30d", label: "Last 30 Days" },
  ];

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      onChange({
        preset: "custom",
        from: new Date(customFrom).toISOString(),
        to: new Date(customTo).toISOString(),
        label: `${format(new Date(customFrom), "dd MMM")} - ${format(new Date(customTo), "dd MMM")}`,
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-1.5 text-xs font-normal", compact && "h-7 px-2")}
        >
          <Calendar className="h-3 w-3" />
          {value.label}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {presets.map((p) => (
          <DropdownMenuItem
            key={p.key}
            className={cn(
              "text-xs",
              value.preset === p.key && "bg-accent font-medium",
            )}
            onClick={() => onChange(buildRange(p.key))}
          >
            {p.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <p className="text-xs font-medium mb-1.5">Custom Range</p>
          <div className="space-y-1.5">
            <input
              type="datetime-local"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              placeholder="From"
              className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
            />
            <input
              type="datetime-local"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              placeholder="To"
              className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
            />
            <Button
              size="sm"
              className="w-full h-7 text-xs"
              onClick={handleCustomApply}
              disabled={!customFrom || !customTo}
            >
              Apply
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function createDefaultRange(): DateRange {
  return buildRange("all");
}

export function buildFilters(range: DateRange): { from?: string; to?: string } {
  return { from: range.from, to: range.to };
}
