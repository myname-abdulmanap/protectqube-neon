"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Circle,
  Gauge,
  Activity,
  Search,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cpu,
  MapPin,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageTransition } from "@/components/ui/page-transition";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  deviceMetricsApi,
  energyConfigsApi,
  energyDashboardApi,
  type EnergyOutletDetail,
} from "@/lib/api";
import { formatCompactNumber, formatDateTime } from "@/lib/energy-monitoring";
import { exportToExcel, exportToPdf } from "@/lib/report-export";
import {
  ExportModal,
  type ExportFormat,
  type ExportPeriod,
} from "@/components/dashboard/ExportModal";
import { cn } from "@/lib/utils";

// Types
type DatePreset = "all" | "today" | "7d" | "30d" | "90d" | "custom";

interface DateRange {
  preset: DatePreset;
  from: string;
  to: string;
  label: string;
}

type TrendMetric = "energy" | "power" | "voltage" | "current";

// Extended historical reading with all payload fields
type HistoricalReading = {
  timestamp: string;
  label: string;
  // Voltage
  voltageL1: number | null;
  voltageL2: number | null;
  voltageL3: number | null;
  voltageAB: number | null;
  voltageBC: number | null;
  voltageCA: number | null;
  // Current
  currentL1: number | null;
  currentL2: number | null;
  currentL3: number | null;
  currentTotal: number | null;
  // Power
  powerL1: number | null;
  powerL2: number | null;
  powerL3: number | null;
  powerTotal: number | null;
  // Reactive
  reactiveL1: number | null;
  reactiveL2: number | null;
  reactiveL3: number | null;
  reactiveSigma: number | null;
  // VA (Apparent Power)
  vaA: number | null;
  vaB: number | null;
  vaC: number | null;
  vaSigma: number | null;
  // Power Factor
  pfA: number | null;
  pfB: number | null;
  pfC: number | null;
  pfSigma: number | null;
  // Energy
  energyTotal: number | null;
  kvarh: number | null;
  // Frequency
  frequency: number | null;
};

// Extended realtime metrics
interface RealtimeMetrics {
  voltageL1: number;
  voltageL2: number;
  voltageL3: number;
  voltageAB: number;
  voltageBC: number;
  voltageCA: number;
  currentL1: number;
  currentL2: number;
  currentL3: number;
  currentTotal: number;
  powerL1: number;
  powerL2: number;
  powerL3: number;
  powerTotal: number;
  reactiveL1: number;
  reactiveL2: number;
  reactiveL3: number;
  reactiveSigma: number;
  vaA: number;
  vaB: number;
  vaC: number;
  vaSigma: number;
  pfA: number;
  pfB: number;
  pfC: number;
  pfSigma: number;
  energyTotal: number;
  kvarh: number;
  frequency: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

const pulseVariants = {
  pulse: {
    scale: [1, 1.02, 1],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" as const },
  },
};

const glowAnimation = {
  boxShadow: [
    "0 0 0px rgba(34, 197, 94, 0)",
    "0 0 20px rgba(34, 197, 94, 0.3)",
    "0 0 0px rgba(34, 197, 94, 0)",
  ],
  transition: { duration: 2, repeat: Infinity, ease: "easeInOut" as const },
};

// Helper functions
const buildRange = (preset: Exclude<DatePreset, "custom">): DateRange => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "all":
      return { preset, from: "", to: "", label: "All" };
    case "today":
      return {
        preset,
        from: today.toISOString(),
        to: now.toISOString(),
        label: "Today",
      };
    case "7d":
      return {
        preset,
        from: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        to: now.toISOString(),
        label: "7 Days",
      };
    case "30d":
      return {
        preset,
        from: new Date(
          today.getTime() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        to: now.toISOString(),
        label: "30 Days",
      };
    case "90d":
      return {
        preset,
        from: new Date(
          today.getTime() - 90 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        to: now.toISOString(),
        label: "90 Days",
      };
  }
};

const mapMetricsToReadings = (
  metrics: { timestamp: string; metricKey: string; metricValue: number }[],
): HistoricalReading[] => {
  const grouped = new Map<string, Map<string, number>>();
  for (const m of metrics) {
    if (!grouped.has(m.timestamp)) grouped.set(m.timestamp, new Map());
    grouped.get(m.timestamp)!.set(m.metricKey, m.metricValue);
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ts, values]) => {
      const d = new Date(ts);
      return {
        timestamp: ts,
        label: Number.isNaN(d.getTime())
          ? ts
          : `${d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false })}`,
        voltageL1: values.get("voltage_l1") ?? null,
        voltageL2: values.get("voltage_l2") ?? null,
        voltageL3: values.get("voltage_l3") ?? null,
        voltageAB: values.get("voltage_ab") ?? null,
        voltageBC: values.get("voltage_bc") ?? null,
        voltageCA: values.get("voltage_ca") ?? null,
        currentL1: values.get("current_l1") ?? null,
        currentL2: values.get("current_l2") ?? null,
        currentL3: values.get("current_l3") ?? null,
        currentTotal: values.get("current_total") ?? null,
        powerL1: values.get("power_l1") ?? null,
        powerL2: values.get("power_l2") ?? null,
        powerL3: values.get("power_l3") ?? null,
        powerTotal: values.get("power_total") ?? null,
        reactiveL1: values.get("reactive_l1") ?? null,
        reactiveL2: values.get("reactive_l2") ?? null,
        reactiveL3: values.get("reactive_l3") ?? null,
        reactiveSigma: values.get("reactive_sigma") ?? null,
        vaA: values.get("va_a") ?? null,
        vaB: values.get("va_b") ?? null,
        vaC: values.get("va_c") ?? null,
        vaSigma: values.get("va_sigma") ?? null,
        pfA: values.get("pf_a") ?? null,
        pfB: values.get("pf_b") ?? null,
        pfC: values.get("pf_c") ?? null,
        pfSigma: values.get("pf_sigma") ?? null,
        energyTotal: values.get("energy_total") ?? null,
        kvarh: values.get("kvarh") ?? null,
        frequency: values.get("frequency") ?? null,
      };
    });
};

// Custom DateFilter Component
function DateFilter({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const presets: { key: Exclude<DatePreset, "custom">; label: string }[] = [
    { key: "all", label: "All" },
    { key: "today", label: "Today" },
    { key: "7d", label: "7 Days" },
    { key: "30d", label: "30 Days" },
    { key: "90d", label: "90 Days" },
  ];

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      const from = new Date(customFrom);
      const to = new Date(customTo);
      onChange({
        preset: "custom",
        from: from.toISOString(),
        to: to.toISOString(),
        label: `${from.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} - ${to.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}`,
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-6 gap-1 px-2 text-[9px]"
        >
          <Calendar className="h-3 w-3" />
          {value.label}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
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
          <p className="text-[10px] font-medium mb-1">Custom</p>
          <div className="space-y-1">
            <input
              type="datetime-local"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              aria-label="From date"
              className="w-full rounded border border-input bg-background px-2 py-1 text-[10px]"
            />
            <input
              type="datetime-local"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              aria-label="To date"
              className="w-full rounded border border-input bg-background px-2 py-1 text-[10px]"
            />
            <Button
              size="sm"
              className="w-full h-6 text-[10px]"
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

// Donut chart colors
const DONUT_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 70%, 55%)",
  "hsl(350, 80%, 55%)",
  "hsl(180, 60%, 45%)",
];

export default function ElectricityOutletDetailPage() {
  const params = useParams<{ scopeId: string }>();
  const scopeId = params.scopeId;

  const [detail, setDetail] = useState<EnergyOutletDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Realtime metrics
  const [realtimeLastUpdated, setRealtimeLastUpdated] = useState<string | null>(
    null,
  );
  const [capacityVa, setCapacityVa] = useState<number | null>(null);
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics>({
    voltageL1: 0,
    voltageL2: 0,
    voltageL3: 0,
    voltageAB: 0,
    voltageBC: 0,
    voltageCA: 0,
    currentL1: 0,
    currentL2: 0,
    currentL3: 0,
    currentTotal: 0,
    powerL1: 0,
    powerL2: 0,
    powerL3: 0,
    powerTotal: 0,
    reactiveL1: 0,
    reactiveL2: 0,
    reactiveL3: 0,
    reactiveSigma: 0,
    vaA: 0,
    vaB: 0,
    vaC: 0,
    vaSigma: 0,
    pfA: 0,
    pfB: 0,
    pfC: 0,
    pfSigma: 0,
    energyTotal: 0,
    kvarh: 0,
    frequency: 0,
  });

  // Trend chart + Table — shared single fetch keyed by historyRange
  const [historyRange, setHistoryRange] = useState<DateRange>(
    buildRange("all"),
  );
  const [historyData, setHistoryData] = useState<HistoricalReading[]>([]);
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("energy");

  // Analytics — separate narrower range
  const [analyticsRange, setAnalyticsRange] = useState<DateRange>(
    buildRange("7d"),
  );
  const [analyticsData, setAnalyticsData] = useState<HistoricalReading[]>([]);
  const [tablePage, setTablePage] = useState(0);
  const [tableSearch, setTableSearch] = useState("");
  const TABLE_PAGE_SIZE = 8;

  // Load outlet detail
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [detailRes, configRes] = await Promise.all([
          energyDashboardApi.getOutletDetail(scopeId, {}),
          energyConfigsApi.getAll(scopeId),
        ]);
        if (!active) return;

        if (!detailRes.success || !detailRes.data) {
          setDetail(null);
          setError(detailRes.error || "Failed to load outlet");
          return;
        }
        setDetail(detailRes.data);

        if (configRes.success && configRes.data?.[0]) {
          setCapacityVa(configRes.data[0].capacityVa ?? null);
        }
      } catch {
        if (active) setError("Failed to load outlet");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [scopeId]);

  // Load realtime metrics — uses /latest endpoint so we always get one row per
  // (deviceId, metricKey) regardless of scope size.  No more guessing a limit.
  const loadRealtimeMetrics = useCallback(async () => {
    const res = await deviceMetricsApi.getLatest(scopeId, "power_meter");
    if (!res.success || !res.data?.length) return;

    const latestByKey = new Map<string, (typeof res.data)[0]>();
    for (const m of res.data) {
      const cur = latestByKey.get(m.metricKey);
      if (!cur || new Date(m.timestamp) > new Date(cur.timestamp)) {
        latestByKey.set(m.metricKey, m);
      }
    }

    const getVal = (key: string) =>
      Number(latestByKey.get(key)?.metricValue ?? 0);
    const getPowerKw = (key: string) => {
      const m = latestByKey.get(key);
      if (!m) return 0;
      const v = Number(m.metricValue ?? 0);
      return m.unit === "W" ? v / 1000 : v;
    };

    const anyMetric =
      latestByKey.get("power_total") || latestByKey.get("energy_total");
    if (anyMetric) {
      setRealtimeLastUpdated(anyMetric.timestamp);
    }

    setRealtimeMetrics({
      voltageL1: Number(getVal("voltage_l1").toFixed(1)),
      voltageL2: Number(getVal("voltage_l2").toFixed(1)),
      voltageL3: Number(getVal("voltage_l3").toFixed(1)),
      voltageAB: Number(getVal("voltage_ab").toFixed(1)),
      voltageBC: Number(getVal("voltage_bc").toFixed(1)),
      voltageCA: Number(getVal("voltage_ca").toFixed(1)),
      currentL1: Number(getVal("current_l1").toFixed(2)),
      currentL2: Number(getVal("current_l2").toFixed(2)),
      currentL3: Number(getVal("current_l3").toFixed(2)),
      currentTotal: Number(getVal("current_total").toFixed(2)),
      powerL1: Number(getPowerKw("power_l1").toFixed(2)),
      powerL2: Number(getPowerKw("power_l2").toFixed(2)),
      powerL3: Number(getPowerKw("power_l3").toFixed(2)),
      powerTotal: Number(getPowerKw("power_total").toFixed(2)),
      reactiveL1: Number(getVal("reactive_l1").toFixed(2)),
      reactiveL2: Number(getVal("reactive_l2").toFixed(2)),
      reactiveL3: Number(getVal("reactive_l3").toFixed(2)),
      reactiveSigma: Number(getVal("reactive_sigma").toFixed(2)),
      vaA: Number(getVal("va_a").toFixed(2)),
      vaB: Number(getVal("va_b").toFixed(2)),
      vaC: Number(getVal("va_c").toFixed(2)),
      vaSigma: Number(getVal("va_sigma").toFixed(2)),
      pfA: Number(getVal("pf_a").toFixed(4)),
      pfB: Number(getVal("pf_b").toFixed(4)),
      pfC: Number(getVal("pf_c").toFixed(4)),
      pfSigma: Number(getVal("pf_sigma").toFixed(4)),
      energyTotal: Number(getVal("energy_total").toFixed(2)),
      kvarh: Number(getVal("kvarh").toFixed(2)),
      frequency: Number(getVal("frequency").toFixed(2)),
    });
  }, [scopeId]);

  useEffect(() => {
    void loadRealtimeMetrics();
    const id = setInterval(() => void loadRealtimeMetrics(), 15000);
    return () => clearInterval(id);
  }, [loadRealtimeMetrics]);

  // History data shared by trend chart + table (one fetch instead of two)
  useEffect(() => {
    let active = true;
    const load = async () => {
      // Use preset-aware limits: smaller window = fewer rows needed
      const presetLimits: Record<string, number> = {
        today: 300,
        "7d": 700,
        "30d": 1500,
        "90d": 2500,
      };
      const limit = presetLimits[historyRange.preset] ?? 3000;
      const params: {
        scopeId: string;
        moduleType: string;
        limit: number;
        from?: string;
        to?: string;
      } = {
        scopeId,
        moduleType: "power_meter",
        limit,
      };
      if (historyRange.from) params.from = historyRange.from;
      if (historyRange.to) params.to = historyRange.to;

      const res = await deviceMetricsApi.getAll(params);
      if (!active) return;
      if (res.success && res.data) {
        setHistoryData(mapMetricsToReadings(res.data));
        setTablePage(0);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [scopeId, historyRange]);

  // Load analytics data (separate range for summary stats)
  useEffect(() => {
    let active = true;
    const load = async () => {
      const presetLimits: Record<string, number> = {
        today: 300,
        "7d": 700,
        "30d": 1500,
        "90d": 2500,
      };
      const limit = presetLimits[analyticsRange.preset] ?? 3000;
      const params: {
        scopeId: string;
        moduleType: string;
        limit: number;
        from?: string;
        to?: string;
      } = {
        scopeId,
        moduleType: "power_meter",
        limit,
      };
      if (analyticsRange.from) params.from = analyticsRange.from;
      if (analyticsRange.to) params.to = analyticsRange.to;

      const res = await deviceMetricsApi.getAll(params);
      if (!active) return;
      if (res.success && res.data) {
        setAnalyticsData(mapMetricsToReadings(res.data));
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [scopeId, analyticsRange]);

  // Status calculation
  const isOffline = realtimeLastUpdated
    ? Date.now() - new Date(realtimeLastUpdated).getTime() > 5 * 60 * 1000
    : true;

  // Capacity in Ampere (from VA / Voltage)
  const capacityAmpere = useMemo(() => {
    if (!capacityVa) return null;
    const avgVoltage =
      (realtimeMetrics.voltageL1 +
        realtimeMetrics.voltageL2 +
        realtimeMetrics.voltageL3) /
      3;
    if (avgVoltage <= 0) return null;
    return capacityVa / (avgVoltage * Math.sqrt(3));
  }, [
    capacityVa,
    realtimeMetrics.voltageL1,
    realtimeMetrics.voltageL2,
    realtimeMetrics.voltageL3,
  ]);

  // Trend chart config
  const trendChartConfig = useMemo(() => {
    const configs: Record<
      TrendMetric,
      { dataKey: string; color: string; unit: string; name: string }
    > = {
      energy: {
        dataKey: "energyTotal",
        color: "hsl(38, 92%, 50%)",
        unit: "kWh",
        name: "Energy",
      },
      power: {
        dataKey: "powerTotal",
        color: "hsl(217, 91%, 60%)",
        unit: "kW",
        name: "Power",
      },
      voltage: {
        dataKey: "voltageL1",
        color: "hsl(142, 71%, 45%)",
        unit: "V",
        name: "Voltage",
      },
      current: {
        dataKey: "currentTotal",
        color: "hsl(280, 70%, 55%)",
        unit: "A",
        name: "Current",
      },
    };
    return configs[trendMetric];
  }, [trendMetric]);

  // Downsampled dataset for chart rendering — limits DOM nodes without losing shape
  const trendChartData = useMemo(() => {
    if (historyData.length <= 300) return historyData;
    const step = Math.ceil(historyData.length / 300);
    return historyData.filter((_, i) => i % step === 0);
  }, [historyData]);

  // Peak hour analysis
  const peakHourAnalysis = useMemo(() => {
    if (!historyData.length) return null;

    // Group by hour
    const hourlyData = new Map<
      number,
      { total: number; count: number; peak: number }
    >();
    for (const point of historyData) {
      const date = new Date(point.timestamp);
      const hour = date.getHours();
      const energy = point.energyTotal ?? 0;

      if (!hourlyData.has(hour)) {
        hourlyData.set(hour, { total: 0, count: 0, peak: 0 });
      }
      const data = hourlyData.get(hour)!;
      data.total += energy;
      data.count += 1;
      data.peak = Math.max(data.peak, energy);
    }

    // Find peak hour
    let peakHour = 0;
    let maxAvg = 0;
    let totalAvg = 0;
    let totalCount = 0;

    hourlyData.forEach((data, hour) => {
      const avg = data.total / data.count;
      totalAvg += avg;
      totalCount += 1;
      if (avg > maxAvg) {
        maxAvg = avg;
        peakHour = hour;
      }
    });

    const overallAvg = totalCount > 0 ? totalAvg / totalCount : 0;

    return {
      peakHour,
      peakHourLabel: `${String(peakHour).padStart(2, "0")}:00 - ${String(peakHour + 1).padStart(2, "0")}:00`,
      peakAvgKwh: maxAvg.toFixed(2),
      overallAvgKwh: overallAvg.toFixed(2),
    };
  }, [historyData]);

  // Analytics summary
  const analytics = useMemo(() => {
    if (!analyticsData.length) return null;
    const points = [...analyticsData].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp),
    );

    const avg = (key: keyof HistoricalReading) => {
      const vals = points
        .map((p) => p[key])
        .filter((v): v is number => typeof v === "number");
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    };

    const peakPoint = points.reduce(
      (max, cur) =>
        Number(cur.powerTotal ?? 0) > Number(max.powerTotal ?? 0) ? cur : max,
      points[0],
    );

    // energy_total is a cumulative meter reading (kWh since device start) —
    // always show the latest value directly, never subtract or average it.
    const lastEnergy = points[points.length - 1]?.energyTotal ?? 0;

    return {
      peakPowerKw: Number(peakPoint.powerTotal ?? 0).toFixed(2),
      peakTime: peakPoint.timestamp,
      avgPower: avg("powerTotal").toFixed(2),
      avgVoltage: (
        (avg("voltageL1") + avg("voltageL2") + avg("voltageL3")) /
        3
      ).toFixed(1),
      avgCurrent: avg("currentTotal").toFixed(2),
      avgPf: avg("pfSigma").toFixed(3),
      totalEnergy: lastEnergy.toFixed(2),
      totalKvarh: Number(points[points.length - 1]?.kvarh ?? 0).toFixed(2),
    };
  }, [analyticsData]);

  // Device distribution for donut chart
  const deviceDistribution = useMemo(() => {
    if (!detail?.devices.length) return [];
    const locationMap = new Map<string, number>();
    for (const device of detail.devices) {
      const loc = device.locationName || device.locationType || "Other";
      locationMap.set(loc, (locationMap.get(loc) ?? 0) + 1);
    }
    return Array.from(locationMap.entries()).map(([name, value]) => ({
      name,
      value,
      percentage: ((value / detail.devices.length) * 100).toFixed(1),
    }));
  }, [detail?.devices]);

  // Table filtering and pagination
  const filteredTableData = useMemo(() => {
    let data = [...historyData].sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp),
    );
    if (tableSearch) {
      const search = tableSearch.toLowerCase();
      data = data.filter((r) => r.label.toLowerCase().includes(search));
    }
    return data;
  }, [historyData, tableSearch]);

  const pagedTableData = useMemo(() => {
    return filteredTableData.slice(
      tablePage * TABLE_PAGE_SIZE,
      (tablePage + 1) * TABLE_PAGE_SIZE,
    );
  }, [filteredTableData, tablePage]);

  const totalTablePages = Math.ceil(filteredTableData.length / TABLE_PAGE_SIZE);

  // Export handler
  const handleExport = async (format: ExportFormat, period: ExportPeriod) => {
    if (!detail) return;

    const metricsRes = await deviceMetricsApi.getAll({
      scopeId,
      moduleType: "power_meter",
      from: new Date(period.from).toISOString(),
      to: new Date(period.to).toISOString(),
      limit: 50000,
    });

    const readings =
      metricsRes.success && metricsRes.data
        ? mapMetricsToReadings(metricsRes.data)
        : [];

    if (format === "excel") {
      await exportToExcel(`outlet-${detail.id}.xlsx`, [
        {
          name: "Summary",
          rows: [
            {
              outlet: detail.name,
              region: detail.region,
              address: detail.address,
              capacityVa: capacityVa ?? "-",
              devices: detail.devices.length,
            },
          ],
        },
        {
          name: "Metrics",
          rows: readings.map((r) => ({
            timestamp: r.label,
            voltageL1: r.voltageL1,
            voltageL2: r.voltageL2,
            voltageL3: r.voltageL3,
            currentL1: r.currentL1,
            currentL2: r.currentL2,
            currentL3: r.currentL3,
            currentTotal: r.currentTotal,
            powerL1: r.powerL1,
            powerL2: r.powerL2,
            powerL3: r.powerL3,
            powerTotal: r.powerTotal,
            energyTotal: r.energyTotal,
            pfSigma: r.pfSigma,
          })),
        },
      ]);
    } else {
      await exportToPdf({
        fileName: `outlet-${detail.id}.pdf`,
        title: "Detail Outlet",
        scopeName: detail.name,
        period: `${period.from} - ${period.to}`,
        generatedAt: new Date().toLocaleString("id-ID"),
        summary: [
          `Outlet: ${detail.name} | Region: ${detail.region}`,
          `Capacity: ${capacityVa ?? "-"} VA`,
          `Devices: ${detail.devices.length}`,
        ],
        tables: [
          {
            title: "Metrics",
            columns: [
              "Time",
              "V L1",
              "V L2",
              "V L3",
              "A Total",
              "P Total",
              "Energy",
              "PF",
            ],
            rows: readings
              .slice(0, 100)
              .map((r) => [
                r.label,
                r.voltageL1 ?? "-",
                r.voltageL2 ?? "-",
                r.voltageL3 ?? "-",
                r.currentTotal ?? "-",
                r.powerTotal ?? "-",
                r.energyTotal ?? "-",
                r.pfSigma ?? "-",
              ]),
          },
        ],
      });
    }
  };

  const fmtVal = (v: number, decimals = 2) =>
    Number.isFinite(v)
      ? v.toLocaleString("id-ID", { maximumFractionDigits: decimals })
      : "-";

  return (
    <PageTransition>
      <motion.div
        className="space-y-2 max-w-7xl mx-auto px-1"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="h-7 w-7">
              <Link href="/dashboard/electricity">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-sm font-bold">
                {detail?.name || "Outlet Detail"}
              </h1>
              <p className="text-[10px] text-muted-foreground">
                {detail?.address || detail?.region || ""}
              </p>
            </div>
          </div>
          <ExportModal onExport={handleExport} disabled={!detail || loading} />
        </motion.div>

        {error && (
          <motion.div
            variants={itemVariants}
            className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded"
          >
            {error}
          </motion.div>
        )}

        {/* Row 1: Realtime Power & Power Meter */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 lg:grid-cols-3 gap-2"
        >
          {/* Daya Realtime - With circular gauge */}
          <motion.div
            variants={pulseVariants}
            animate={!isOffline ? "pulse" : undefined}
          >
            <Card
              className={cn(
                "border-0 shadow-sm h-full",
                !isOffline && "ring-1 ring-green-500/20",
              )}
            >
              <CardHeader className="px-3 py-2 pb-0">
                <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                  <motion.div
                    animate={!isOffline ? { rotate: [0, 360] } : {}}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Gauge className="h-4 w-4 text-green-500" />
                  </motion.div>
                  Daya Realtime
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-2">
                <div className="flex flex-col items-center">
                  {/* Circular Gauge - Large, centered */}
                  <motion.div
                    className="relative flex-shrink-0"
                    animate={!isOffline ? { scale: [1, 1.02, 1] } : {}}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <svg className="w-40 h-40 -rotate-90">
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        strokeWidth="10"
                        fill="none"
                        className="stroke-muted/20"
                      />
                      <motion.circle
                        cx="80"
                        cy="80"
                        r="70"
                        strokeWidth="10"
                        fill="none"
                        strokeDasharray={440}
                        strokeDashoffset={
                          440 -
                          (440 *
                            Math.min(
                              (realtimeMetrics.powerTotal /
                                (capacityVa ? capacityVa / 1000 : 100)) *
                                100,
                              100,
                            )) /
                            100
                        }
                        strokeLinecap="round"
                        className={cn(
                          "transition-all duration-500",
                          isOffline
                            ? "stroke-slate-400"
                            : realtimeMetrics.powerTotal >
                                (capacityVa ? capacityVa / 1000 : 100)
                              ? "stroke-red-500"
                              : "stroke-green-500",
                        )}
                        initial={{ strokeDashoffset: 440 }}
                        animate={{
                          strokeDashoffset:
                            440 -
                            (440 *
                              Math.min(
                                (realtimeMetrics.powerTotal /
                                  (capacityVa ? capacityVa / 1000 : 100)) *
                                  100,
                                100,
                              )) /
                              100,
                        }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <motion.span
                        className="text-3xl font-bold"
                        key={realtimeMetrics.powerTotal}
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                      >
                        {formatCompactNumber(realtimeMetrics.powerTotal)}
                      </motion.span>
                      <span className="text-xs text-muted-foreground">kW</span>
                    </div>
                  </motion.div>

                  {/* Info below gauge */}
                  <div className="w-full space-y-1.5 mt-2">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-muted-foreground">
                        Status
                      </span>
                      <motion.div
                        animate={!isOffline ? glowAnimation : undefined}
                      >
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[8px] px-1.5 py-0",
                            isOffline
                              ? "bg-slate-500/20 text-slate-500"
                              : "bg-green-500/20 text-green-500 border-green-500/30",
                          )}
                        >
                          <motion.span
                            className={cn(
                              "inline-block w-1 h-1 rounded-full mr-1",
                              isOffline ? "bg-slate-500" : "bg-green-500",
                            )}
                            animate={
                              !isOffline
                                ? { scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }
                                : {}
                            }
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                          {isOffline ? "OFFLINE" : "ONLINE"}
                        </Badge>
                      </motion.div>
                    </div>

                    {/* Capacity Device */}
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-muted-foreground">
                        Capacity
                      </span>
                      <span className="text-[10px] font-semibold">
                        {/* {capacityAmpere
                          ? `${fmtVal(capacityAmpere, 1)} A`
                          : "-"} */}
                        {capacityVa
                          ? `${formatCompactNumber(capacityVa)} VA`
                          : "-"}
                      </span>
                    </div>

                    {/* Total Energy */}
                    <motion.div
                      className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 rounded-lg p-2"
                      whileHover={{ scale: 1.02 }}
                    >
                      <p className="text-[8px] text-muted-foreground">
                        Total Energy
                      </p>
                      <motion.p
                        className="text-lg font-bold text-orange-500"
                        key={realtimeMetrics.energyTotal}
                        initial={{ y: 5, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                      >
                        {fmtVal(realtimeMetrics.energyTotal)}
                        <span className="text-[10px] font-normal ml-1">
                          kWh
                        </span>
                      </motion.p>
                    </motion.div>

                    <p className="text-[7px] text-muted-foreground">
                      {realtimeLastUpdated
                        ? `Updated ${formatDateTime(realtimeLastUpdated)}`
                        : "No data"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Power Meter - Full metrics grouped */}
          <Card className="border-0 shadow-sm lg:col-span-2">
            <CardHeader className="px-3 py-2 pb-0">
              <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-blue-500" />
                Power Meter
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-1">
              {/* Main metrics grid - 3 columns */}
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {/* Voltage L-N */}
                <div className="bg-muted/30 rounded p-1.5">
                  <p className="text-[7px] text-muted-foreground uppercase mb-0.5">
                    V L-N
                  </p>
                  <div className="space-y-0.5 text-[8px]">
                    <div className="flex justify-between">
                      <span className="text-blue-500">L1</span>
                      <span className="font-semibold">
                        {fmtVal(realtimeMetrics.voltageL1, 1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-500">L2</span>
                      <span className="font-semibold">
                        {fmtVal(realtimeMetrics.voltageL2, 1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-500">L3</span>
                      <span className="font-semibold">
                        {fmtVal(realtimeMetrics.voltageL3, 1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Voltage L-L */}
                <div className="bg-muted/30 rounded p-1.5">
                  <p className="text-[7px] text-muted-foreground uppercase mb-0.5">
                    V L-L
                  </p>
                  <div className="space-y-0.5 text-[8px]">
                    <div className="flex justify-between">
                      <span className="text-blue-500">AB</span>
                      <span className="font-semibold">
                        {fmtVal(realtimeMetrics.voltageAB, 1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-500">BC</span>
                      <span className="font-semibold">
                        {fmtVal(realtimeMetrics.voltageBC, 1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-500">CA</span>
                      <span className="font-semibold">
                        {fmtVal(realtimeMetrics.voltageCA, 1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Current */}
                <div className="bg-muted/30 rounded p-1.5">
                  <p className="text-[7px] text-muted-foreground uppercase mb-0.5">
                    Current (A)
                  </p>
                  <div className="space-y-0.5 text-[8px]">
                    <div className="flex justify-between">
                      <span className="text-blue-500">L1</span>
                      <span className="font-semibold">
                        {fmtVal(realtimeMetrics.currentL1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-500">L2</span>
                      <span className="font-semibold">
                        {fmtVal(realtimeMetrics.currentL2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-500">L3</span>
                      <span className="font-semibold">
                        {fmtVal(realtimeMetrics.currentL3)}
                      </span>
                    </div>
                    <div className="flex justify-between bg-primary/10 rounded px-0.5">
                      <span className="text-primary">Σ</span>
                      <span className="font-bold">
                        {fmtVal(realtimeMetrics.currentTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Power */}
                <div className="bg-muted/30 rounded p-1.5">
                  <p className="text-[7px] text-muted-foreground uppercase mb-0.5">
                    Power (kW)
                  </p>
                  <div className="space-y-0.5 text-[8px]">
                    <div className="flex justify-between">
                      <span className="text-blue-500">L1</span>
                      <span className="font-semibold">
                        {fmtVal(realtimeMetrics.powerL1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-500">L2</span>
                      <span className="font-semibold">
                        {fmtVal(realtimeMetrics.powerL2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-500">L3</span>
                      <span className="font-semibold">
                        {fmtVal(realtimeMetrics.powerL3)}
                      </span>
                    </div>
                    <div className="flex justify-between bg-primary/10 rounded px-0.5">
                      <span className="text-primary">Σ</span>
                      <span className="font-bold">
                        {fmtVal(realtimeMetrics.powerTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reactive */}
                <div className="bg-muted/30 rounded p-1.5">
                  <p className="text-[7px] text-muted-foreground uppercase mb-0.5">
                    Reactive (VAR)
                  </p>
                  <div className="space-y-0.5 text-[8px]">
                    <div className="flex justify-between">
                      <span className="text-blue-500">L1</span>
                      <span className="font-semibold">
                        {fmtVal(realtimeMetrics.reactiveL1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-500">L2</span>
                      <span className="font-semibold">
                        {fmtVal(realtimeMetrics.reactiveL2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-500">L3</span>
                      <span className="font-semibold">
                        {fmtVal(realtimeMetrics.reactiveL3)}
                      </span>
                    </div>
                    <div className="flex justify-between bg-primary/10 rounded px-0.5">
                      <span className="text-primary">Σ</span>
                      <span className="font-bold">
                        {fmtVal(realtimeMetrics.reactiveSigma)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Apparent VA */}
                <div className="bg-muted/30 rounded p-1.5">
                  <p className="text-[7px] text-muted-foreground uppercase mb-0.5">
                    Apparent (VA)
                  </p>
                  <div className="space-y-0.5 text-[8px]">
                    <div className="flex justify-between">
                      <span className="text-blue-500">A</span>
                      <span className="font-semibold">
                        {fmtVal(realtimeMetrics.vaA)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-500">B</span>
                      <span className="font-semibold">
                        {fmtVal(realtimeMetrics.vaB)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-500">C</span>
                      <span className="font-semibold">
                        {fmtVal(realtimeMetrics.vaC)}
                      </span>
                    </div>
                    <div className="flex justify-between bg-primary/10 rounded px-0.5">
                      <span className="text-primary">Σ</span>
                      <span className="font-bold">
                        {fmtVal(realtimeMetrics.vaSigma)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Power Factor */}
                <div className="bg-muted/30 rounded p-1.5 col-span-3">
                  <p className="text-[7px] text-muted-foreground uppercase mb-0.5">
                    Power Factor
                  </p>
                  <div className="grid grid-cols-4 gap-1 text-[8px]">
                    <div className="flex justify-between">
                      <span className="text-blue-500">A</span>
                      <span className="font-semibold">
                        {fmtVal(realtimeMetrics.pfA, 3)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-500">B</span>
                      <span className="font-semibold">
                        {fmtVal(realtimeMetrics.pfB, 3)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-500">C</span>
                      <span className="font-semibold">
                        {fmtVal(realtimeMetrics.pfC, 3)}
                      </span>
                    </div>
                    <div className="flex justify-between bg-primary/10 rounded px-0.5">
                      <span className="text-primary">Σ</span>
                      <span className="font-bold">
                        {fmtVal(realtimeMetrics.pfSigma, 3)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Energy & Frequency - Full width at bottom */}
              <div className="bg-gradient-to-r from-orange-500/10 via-purple-500/10 to-cyan-500/10 rounded-lg p-2">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[7px] text-orange-500 uppercase">
                      Total kWh
                    </p>
                    <p className="text-sm font-bold text-orange-600">
                      {fmtVal(realtimeMetrics.energyTotal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[7px] text-purple-500 uppercase">
                      Total kVARh
                    </p>
                    <p className="text-sm font-bold text-purple-600">
                      {fmtVal(realtimeMetrics.kvarh)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[7px] text-cyan-500 uppercase">
                      Frequency
                    </p>
                    <p className="text-sm font-bold text-cyan-600">
                      {fmtVal(realtimeMetrics.frequency)} Hz
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Row 2: Trend Chart + Analytics + Donut */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 lg:grid-cols-3 gap-2"
        >
          {/* Trend Chart - kWh Bar */}
          <Card className="border-0 shadow-sm lg:col-span-2">
            <CardHeader className="px-3 py-2 pb-0 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xs font-semibold">Trend</CardTitle>
                <Select
                  value={trendMetric}
                  onValueChange={(v) => setTrendMetric(v as TrendMetric)}
                >
                  <SelectTrigger className="h-5 w-20 text-[9px] border-0 bg-muted/50 px-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="energy" className="text-[9px]">
                      kWh
                    </SelectItem>
                    <SelectItem value="power" className="text-[9px]">
                      Power
                    </SelectItem>
                    <SelectItem value="voltage" className="text-[9px]">
                      Voltage
                    </SelectItem>
                    <SelectItem value="current" className="text-[9px]">
                      Current
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DateFilter value={historyRange} onChange={setHistoryRange} />
            </CardHeader>
            <CardContent className="p-3 pt-2">
              {trendChartData.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-[10px] text-muted-foreground">
                  No data available
                </div>
              ) : trendMetric === "energy" ? (
                // Modern Bar Chart for kWh
                <ChartContainer
                  config={{
                    [trendChartConfig.dataKey]: {
                      label: trendChartConfig.name,
                      color: trendChartConfig.color,
                    },
                  }}
                  className="h-[200px] w-full"
                >
                  <AreaChart
                    data={trendChartData}
                    margin={{ top: 10, right: 10, bottom: 0, left: -10 }}
                  >
                    <defs>
                      <linearGradient
                        id="energyGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="hsl(38, 92%, 50%)"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="100%"
                          stopColor="hsl(38, 92%, 50%)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 8 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 8 }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey={trendChartConfig.dataKey}
                      stroke="hsl(38, 92%, 50%)"
                      strokeWidth={2}
                      fill="url(#energyGradient)"
                      dot={false}
                      connectNulls
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                // Area Chart for other metrics
                <ChartContainer
                  config={{
                    [trendChartConfig.dataKey]: {
                      label: trendChartConfig.name,
                      color: trendChartConfig.color,
                    },
                  }}
                  className="h-[200px] w-full"
                >
                  <AreaChart
                    data={trendChartData}
                    margin={{ top: 10, right: 10, bottom: 0, left: -10 }}
                  >
                    <defs>
                      <linearGradient
                        id={`fill-${trendChartConfig.dataKey}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={trendChartConfig.color}
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="100%"
                          stopColor={trendChartConfig.color}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 8 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 8 }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey={trendChartConfig.dataKey}
                      stroke={trendChartConfig.color}
                      strokeWidth={2}
                      fill={`url(#fill-${trendChartConfig.dataKey})`}
                      dot={false}
                      connectNulls
                    />
                  </AreaChart>
                </ChartContainer>
              )}

              {/* Peak Hour Info */}
              {trendMetric === "energy" && peakHourAnalysis?.peakHourLabel && (
                <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-[9px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                    <span className="text-muted-foreground">Peak Hour:</span>
                    <span className="font-semibold text-orange-600">
                      {peakHourAnalysis.peakHourLabel}
                    </span>
                    <span className="text-muted-foreground">
                      ({peakHourAnalysis.peakAvgKwh} kWh)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Avg:</span>
                    <span className="font-semibold">
                      {peakHourAnalysis.overallAvgKwh} kWh/hr
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Analytics + Donut */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-3 py-2 pb-0 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold">Analitik</CardTitle>
              <DateFilter value={analyticsRange} onChange={setAnalyticsRange} />
            </CardHeader>
            <CardContent className="p-3 pt-2">
              {/* Analytics Stats */}
              {analytics ? (
                <div className="space-y-1.5 text-[9px] mb-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Peak Power</span>
                    <span className="font-semibold">
                      {analytics.peakPowerKw} kW
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Power</span>
                    <span>{analytics.avgPower} kW</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Voltage</span>
                    <span>{analytics.avgVoltage} V</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Current</span>
                    <span>{analytics.avgCurrent} A</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg PF</span>
                    <span>{analytics.avgPf}</span>
                  </div>
                  <div className="flex justify-between bg-orange-500/10 rounded px-1.5 py-1">
                    <span className="text-orange-600 dark:text-orange-400">
                      Total kWh
                    </span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">
                      {analytics.totalEnergy}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total kVARh</span>
                    <span>{analytics.totalKvarh}</span>
                  </div>
                </div>
              ) : (
                <div className="h-20 flex items-center justify-center text-[9px] text-muted-foreground">
                  No data
                </div>
              )}

              {/* Donut Chart - Device Distribution */}
              {deviceDistribution.length > 0 && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-[9px] font-medium mb-2">
                    Device Distribution
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-20">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={deviceDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={20}
                            outerRadius={35}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {deviceDistribution.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-0.5">
                      {deviceDistribution.slice(0, 4).map((item, index) => (
                        <div
                          key={item.name}
                          className="flex items-center gap-1 text-[8px]"
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor:
                                DONUT_COLORS[index % DONUT_COLORS.length],
                            }}
                          />
                          <span className="truncate flex-1">{item.name}</span>
                          <span className="font-medium">
                            {item.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Row 3: Data Table */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-3 py-2 pb-0 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-xs font-semibold">
                Riwayat Data
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Cari waktu..."
                    value={tableSearch}
                    onChange={(e) => {
                      setTableSearch(e.target.value);
                      setTablePage(0);
                    }}
                    className="h-6 w-32 pl-7 text-[9px]"
                  />
                </div>
                <DateFilter value={historyRange} onChange={setHistoryRange} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="text-[8px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-6 px-2 whitespace-nowrap">
                        Waktu
                      </TableHead>
                      <TableHead className="h-6 px-1 text-right">V1</TableHead>
                      <TableHead className="h-6 px-1 text-right">V2</TableHead>
                      <TableHead className="h-6 px-1 text-right">V3</TableHead>
                      <TableHead className="h-6 px-1 text-right">A1</TableHead>
                      <TableHead className="h-6 px-1 text-right">A2</TableHead>
                      <TableHead className="h-6 px-1 text-right">A3</TableHead>
                      <TableHead className="h-6 px-1 text-right">AΣ</TableHead>
                      <TableHead className="h-6 px-1 text-right">P1</TableHead>
                      <TableHead className="h-6 px-1 text-right">P2</TableHead>
                      <TableHead className="h-6 px-1 text-right">P3</TableHead>
                      <TableHead className="h-6 px-1 text-right">PΣ</TableHead>
                      <TableHead className="h-6 px-1 text-right">kWh</TableHead>
                      <TableHead className="h-6 px-1 text-right">PF</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedTableData.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={14}
                          className="h-12 text-center text-muted-foreground"
                        >
                          No data
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagedTableData.map((r, i) => (
                        <TableRow key={i} className="h-5">
                          <TableCell className="px-2 py-0.5 whitespace-nowrap">
                            {r.label}
                          </TableCell>
                          <TableCell className="px-1 py-0.5 text-right">
                            {r.voltageL1?.toFixed(1) ?? "-"}
                          </TableCell>
                          <TableCell className="px-1 py-0.5 text-right">
                            {r.voltageL2?.toFixed(1) ?? "-"}
                          </TableCell>
                          <TableCell className="px-1 py-0.5 text-right">
                            {r.voltageL3?.toFixed(1) ?? "-"}
                          </TableCell>
                          <TableCell className="px-1 py-0.5 text-right">
                            {r.currentL1?.toFixed(2) ?? "-"}
                          </TableCell>
                          <TableCell className="px-1 py-0.5 text-right">
                            {r.currentL2?.toFixed(2) ?? "-"}
                          </TableCell>
                          <TableCell className="px-1 py-0.5 text-right">
                            {r.currentL3?.toFixed(2) ?? "-"}
                          </TableCell>
                          <TableCell className="px-1 py-0.5 text-right font-medium">
                            {r.currentTotal?.toFixed(2) ?? "-"}
                          </TableCell>
                          <TableCell className="px-1 py-0.5 text-right">
                            {r.powerL1?.toFixed(2) ?? "-"}
                          </TableCell>
                          <TableCell className="px-1 py-0.5 text-right">
                            {r.powerL2?.toFixed(2) ?? "-"}
                          </TableCell>
                          <TableCell className="px-1 py-0.5 text-right">
                            {r.powerL3?.toFixed(2) ?? "-"}
                          </TableCell>
                          <TableCell className="px-1 py-0.5 text-right font-medium">
                            {r.powerTotal?.toFixed(2) ?? "-"}
                          </TableCell>
                          <TableCell className="px-1 py-0.5 text-right text-orange-600">
                            {r.energyTotal?.toFixed(2) ?? "-"}
                          </TableCell>
                          <TableCell className="px-1 py-0.5 text-right">
                            {r.pfSigma?.toFixed(3) ?? "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {totalTablePages > 1 && (
                <div className="flex items-center justify-between px-3 py-1.5 border-t">
                  <span className="text-[8px] text-muted-foreground">
                    {filteredTableData.length} records | Page {tablePage + 1} of{" "}
                    {totalTablePages}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => setTablePage((p) => Math.max(0, p - 1))}
                      disabled={tablePage === 0}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() =>
                        setTablePage((p) =>
                          Math.min(totalTablePages - 1, p + 1),
                        )
                      }
                      disabled={tablePage >= totalTablePages - 1}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Row 4: Outlet Profile with Devices */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-3 py-2 pb-0">
              <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                Profil Outlet
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-2">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-[9px] mb-3">
                <div>
                  <p className="text-muted-foreground text-[8px]">Region</p>
                  <p className="font-medium">{detail?.region || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[8px]">City</p>
                  <p className="font-medium">{detail?.city || "-"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-[8px]">Address</p>
                  <p className="font-medium truncate">
                    {detail?.address || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[8px]">Capacity</p>
                  <p className="font-medium">
                    {capacityVa ? `${formatCompactNumber(capacityVa)} VA` : "-"}
                  </p>
                </div>
              </div>

              {/* Devices List */}
              <div className="pt-2 border-t">
                <p className="text-[9px] font-medium text-muted-foreground mb-2">
                  Daftar Perangkat ({detail?.devices.length || 0})
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
                  {(detail?.devices || []).map((device) => (
                    <motion.div
                      key={device.id}
                      className="flex items-center gap-1.5 bg-muted/30 rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors"
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="relative">
                        <Cpu className="h-4 w-4 text-muted-foreground" />
                        <Circle
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 h-2 w-2 fill-current",
                            device.status.toLowerCase() === "online"
                              ? "text-emerald-500"
                              : device.status.toLowerCase() === "offline"
                                ? "text-red-500"
                                : "text-amber-500",
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-medium truncate">
                          {device.name}
                        </p>
                        <div className="flex items-center gap-1 text-[7px] text-muted-foreground">
                          {device.locationName && (
                            <>
                              <MapPin className="h-2 w-2" />
                              <span className="truncate">
                                {device.locationName}
                              </span>
                            </>
                          )}
                          {!device.locationName && device.serialNo && (
                            <span className="truncate">{device.serialNo}</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </PageTransition>
  );
}
