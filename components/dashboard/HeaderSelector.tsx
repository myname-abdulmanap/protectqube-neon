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
      placeholder: "Cashier Monitoring",
      options: [
        { value: "cashier-monitoring", label: "Cashier Monitoring" },
        { value: "kitchen-monitoring", label: "Kitchen Monitoring" },
        { value: "oil-monitoring", label: "Oil Monitoring" },
        { value: "jerrycan-monitoring", label: "Jerrycan Monitoring" },
        { value: "pooling-monitoring", label: "Pooling Monitoring" },
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
      <SelectTrigger className="h-6 w-[170px] text-[10px] border-border/50 bg-muted/30 px-2 gap-1">
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
