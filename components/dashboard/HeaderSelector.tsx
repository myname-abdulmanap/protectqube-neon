"use client";

import { usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HeaderSelectorProps {
  value?: string;
  onValueChange?: (value: string) => void;
}

type SelectorConfig = {
  placeholder: string;
  options: { value: string; label: string }[];
};

function getSelectorConfig(pathname: string): SelectorConfig | null {
  if (pathname === "/dashboard/kitchen") {
    return {
      placeholder: "Kitchen Analysis",
      options: [
        { value: "kitchen-analysis", label: "Kitchen Analysis" },
        { value: "oil-monitoring", label: "Oil Monitoring" },
        { value: "oil-pooling", label: "Oil Pooling" },
      ],
    };
  }

  return null;
}

export function HeaderSelector({ value, onValueChange }: HeaderSelectorProps) {
  const pathname = usePathname();
  const config = getSelectorConfig(pathname);

  if (!config) return null;

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-6 w-[140px] text-[10px] border-border/50 bg-muted/30 px-2 gap-1">
        <SelectValue placeholder={config.placeholder} />
      </SelectTrigger>
      <SelectContent>
        {config.options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="text-[11px]"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
