import { endOfDay, format, startOfDay, subDays } from "date-fns";
import type { EnergyDashboardFilters } from "@/lib/api";

export type EnergyPreset = "today" | "last24h" | "last7d" | "last30d" | "custom";

export interface EnergyPeriodState {
  preset: EnergyPreset;
  from: string;
  to: string;
}

const INPUT_FORMAT = "yyyy-MM-dd'T'HH:mm";

const toInputValue = (value: Date): string => format(value, INPUT_FORMAT);

export const createEnergyPeriod = (preset: EnergyPreset = "today"): EnergyPeriodState => {
  const now = new Date();

  switch (preset) {
    case "last24h":
      return {
        preset,
        from: toInputValue(subDays(now, 1)),
        to: toInputValue(now),
      };
    case "last7d":
      return {
        preset,
        from: toInputValue(startOfDay(subDays(now, 6))),
        to: toInputValue(now),
      };
    case "last30d":
      return {
        preset,
        from: toInputValue(startOfDay(subDays(now, 29))),
        to: toInputValue(now),
      };
    case "custom":
      return {
        preset,
        from: toInputValue(startOfDay(now)),
        to: toInputValue(now),
      };
    case "today":
    default:
      return {
        preset: "today",
        from: toInputValue(startOfDay(now)),
        to: toInputValue(endOfDay(now)),
      };
  }
};

export const normalizeEnergyPeriod = (period: EnergyPeriodState): EnergyPeriodState => {
  const fromDate = new Date(period.from);
  const toDate = new Date(period.to);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return createEnergyPeriod(period.preset);
  }

  if (fromDate <= toDate) {
    return period;
  }

  return {
    ...period,
    from: toInputValue(toDate),
    to: toInputValue(fromDate),
  };
};

export const buildEnergyFilters = (period: EnergyPeriodState): EnergyDashboardFilters => {
  const normalized = normalizeEnergyPeriod(period);
  return {
    from: new Date(normalized.from).toISOString(),
    to: new Date(normalized.to).toISOString(),
  };
};

export const formatPeriodLabel = (period: EnergyPeriodState): string => {
  const normalized = normalizeEnergyPeriod(period);
  const fromDate = new Date(normalized.from);
  const toDate = new Date(normalized.to);

  if (format(fromDate, "yyyy-MM-dd") === format(toDate, "yyyy-MM-dd")) {
    return format(fromDate, "dd MMM yyyy");
  }

  return `${format(fromDate, "dd MMM yyyy HH:mm")} - ${format(toDate, "dd MMM yyyy HH:mm")}`;
};

export const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return format(date, "dd MMM yyyy HH:mm");
};

export const formatDateOnly = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return format(date, "dd MMM yyyy");
};

export const formatCompactNumber = (value: number): string => {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};