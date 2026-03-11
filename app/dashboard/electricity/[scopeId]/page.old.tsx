"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, Circle, Gauge, Zap } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageTransition } from "@/components/ui/page-transition";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type SimpleRange = "today" | "7d" | "30d" | "90d";

// Simple range selector component
function RangeSelect({
  value,
  onChange,
}: {
  value: SimpleRange;
  onChange: (v: SimpleRange) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SimpleRange)}>
      <SelectTrigger className="h-5 w-20 text-[9px] border-0 bg-muted/50 px-1.5">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="today" className="text-[9px]">
          Today
        </SelectItem>
        <SelectItem value="7d" className="text-[9px]">
          7 Days
        </SelectItem>
        <SelectItem value="30d" className="text-[9px]">
          30 Days
        </SelectItem>
        <SelectItem value="90d" className="text-[9px]">
          90 Days
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

type HistoricalReading = {
  timestamp: string;
  label: string;
  voltageL1: number | null;
  voltageL2: number | null;
  voltageL3: number | null;
  currentL1: number | null;
  currentL2: number | null;
  currentL3: number | null;
  currentTotal: number | null;
  powerL1: number | null;
  powerL2: number | null;
  powerL3: number | null;
  powerTotal: number | null;
  energyTotal: number | null;
  frequency: number | null;
};

type MetricType = "voltage" | "current" | "power" | "energy";

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
        currentL1: values.get("current_l1") ?? null,
        currentL2: values.get("current_l2") ?? null,
        currentL3: values.get("current_l3") ?? null,
        currentTotal: values.get("current_total") ?? null,
        powerL1: values.get("power_l1") ?? null,
        powerL2: values.get("power_l2") ?? null,
        powerL3: values.get("power_l3") ?? null,
        powerTotal: values.get("power_total") ?? null,
        energyTotal: values.get("energy_total") ?? null,
        frequency: values.get("frequency") ?? null,
      };
    });
};

const getDateRangeForApi = (
  range: SimpleRange,
): { from: string; to: string } => {
  const now = new Date();
  const toIso = (d: Date) => d.toISOString();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (range) {
    case "today":
      return { from: toIso(today), to: toIso(now) };
    case "7d": {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      return { from: toIso(d), to: toIso(now) };
    }
    case "30d": {
      const d = new Date(today);
      d.setDate(d.getDate() - 30);
      return { from: toIso(d), to: toIso(now) };
    }
    case "90d": {
      const d = new Date(today);
      d.setDate(d.getDate() - 90);
      return { from: toIso(d), to: toIso(now) };
    }
    default:
      return { from: toIso(today), to: toIso(now) };
  }
};

export default function ElectricityOutletDetailPage() {
  const params = useParams<{ scopeId: string }>();
  const scopeId = params.scopeId;

  const [detail, setDetail] = useState<EnergyOutletDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Realtime metrics
  const [realtimePowerKw, setRealtimePowerKw] = useState(0);
  const [realtimeLastUpdated, setRealtimeLastUpdated] = useState<string | null>(
    null,
  );
  const [capacityVa, setCapacityVa] = useState<number | null>(null);
  const [realtimeMetrics, setRealtimeMetrics] = useState({
    voltageL1: 0,
    voltageL2: 0,
    voltageL3: 0,
    currentL1: 0,
    currentL2: 0,
    currentL3: 0,
    currentTotal: 0,
    powerL1: 0,
    powerL2: 0,
    powerL3: 0,
    powerTotal: 0,
    energyTotal: 0,
    frequency: 0,
  });

  // History chart
  const [historyRange, setHistoryRange] = useState<SimpleRange>("today");
  const [historyData, setHistoryData] = useState<HistoricalReading[]>([]);
  const [historyMetric, setHistoryMetric] = useState<MetricType>("power");

  // Analytics
  const [analyticsRange, setAnalyticsRange] = useState<SimpleRange>("7d");
  const [analyticsData, setAnalyticsData] = useState<HistoricalReading[]>([]);

  // Table
  const [tableRange, setTableRange] = useState<SimpleRange>("today");
  const [tableData, setTableData] = useState<HistoricalReading[]>([]);
  const [tablePage, setTablePage] = useState(0);
  const TABLE_PAGE_SIZE = 10;

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

  // Load realtime metrics
  const loadRealtimeMetrics = useCallback(async () => {
    const res = await deviceMetricsApi.getAll({
      scopeId,
      moduleType: "power_meter",
      limit: 200,
    });
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

    const powerMetric =
      latestByKey.get("power_total") || latestByKey.get("power");
    if (powerMetric) {
      const raw = Number(powerMetric.metricValue ?? 0);
      setRealtimePowerKw(powerMetric.unit === "W" ? raw / 1000 : raw);
      setRealtimeLastUpdated(powerMetric.timestamp);
    }

    setRealtimeMetrics({
      voltageL1: Number(getVal("voltage_l1").toFixed(1)),
      voltageL2: Number(getVal("voltage_l2").toFixed(1)),
      voltageL3: Number(getVal("voltage_l3").toFixed(1)),
      currentL1: Number(getVal("current_l1").toFixed(2)),
      currentL2: Number(getVal("current_l2").toFixed(2)),
      currentL3: Number(getVal("current_l3").toFixed(2)),
      currentTotal: Number(getVal("current_total").toFixed(2)),
      powerL1: Number(getPowerKw("power_l1").toFixed(2)),
      powerL2: Number(getPowerKw("power_l2").toFixed(2)),
      powerL3: Number(getPowerKw("power_l3").toFixed(2)),
      powerTotal: Number(getPowerKw("power_total").toFixed(2)),
      energyTotal: Number(getVal("energy_total").toFixed(2)),
      frequency: Number(getVal("frequency").toFixed(2)),
    });
  }, [scopeId]);

  useEffect(() => {
    void loadRealtimeMetrics();
    const id = setInterval(() => void loadRealtimeMetrics(), 15000);
    return () => clearInterval(id);
  }, [loadRealtimeMetrics]);

  // Load history chart data
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { from, to } = getDateRangeForApi(historyRange);
      const res = await deviceMetricsApi.getAll({
        scopeId,
        moduleType: "power_meter",
        from,
        to,
        limit: 5000,
      });
      if (!active) return;
      if (res.success && res.data) {
        setHistoryData(mapMetricsToReadings(res.data));
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [scopeId, historyRange]);

  // Load analytics data
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { from, to } = getDateRangeForApi(analyticsRange);
      const res = await deviceMetricsApi.getAll({
        scopeId,
        moduleType: "power_meter",
        from,
        to,
        limit: 10000,
      });
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

  // Load table data
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { from, to } = getDateRangeForApi(tableRange);
      const res = await deviceMetricsApi.getAll({
        scopeId,
        moduleType: "power_meter",
        from,
        to,
        limit: 5000,
      });
      if (!active) return;
      if (res.success && res.data) {
        setTableData(mapMetricsToReadings(res.data));
        setTablePage(0);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [scopeId, tableRange]);

  const maxLoadKw = detail?.maxLoad ?? null;
  const loadPercentage =
    maxLoadKw && maxLoadKw > 0
      ? Math.min((realtimePowerKw / maxLoadKw) * 100, 999)
      : 0;
  const isOffline = realtimeLastUpdated
    ? Date.now() - new Date(realtimeLastUpdated).getTime() > 5 * 60 * 1000
    : true;
  const loadStatus = isOffline
    ? "OFFLINE"
    : maxLoadKw && realtimePowerKw > maxLoadKw
      ? "OVERLOAD"
      : "NORMAL";

  const historyChartConfig = useMemo(() => {
    const configs: Record<
      MetricType,
      { lines: { key: string; color: string; name: string }[]; unit: string }
    > = {
      voltage: {
        lines: [
          { key: "voltageL1", color: "hsl(217, 91%, 60%)", name: "V L1" },
          { key: "voltageL2", color: "hsl(142, 71%, 45%)", name: "V L2" },
          { key: "voltageL3", color: "hsl(38, 92%, 50%)", name: "V L3" },
        ],
        unit: "V",
      },
      current: {
        lines: [
          { key: "currentL1", color: "hsl(217, 91%, 60%)", name: "A L1" },
          { key: "currentL2", color: "hsl(142, 71%, 45%)", name: "A L2" },
          { key: "currentL3", color: "hsl(38, 92%, 50%)", name: "A L3" },
          { key: "currentTotal", color: "hsl(280, 70%, 55%)", name: "Total" },
        ],
        unit: "A",
      },
      power: {
        lines: [
          { key: "powerL1", color: "hsl(217, 91%, 60%)", name: "P L1" },
          { key: "powerL2", color: "hsl(142, 71%, 45%)", name: "P L2" },
          { key: "powerL3", color: "hsl(38, 92%, 50%)", name: "P L3" },
          { key: "powerTotal", color: "hsl(280, 70%, 55%)", name: "Total" },
        ],
        unit: "kW",
      },
      energy: {
        lines: [
          { key: "energyTotal", color: "hsl(38, 92%, 50%)", name: "Energy" },
        ],
        unit: "kWh",
      },
    };
    return configs[historyMetric];
  }, [historyMetric]);

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

    return {
      peakPowerKw: Number(peakPoint.powerTotal ?? 0).toFixed(2),
      peakTime: peakPoint.timestamp,
      avgPower: avg("powerTotal").toFixed(2),
      avgVoltage: (
        (avg("voltageL1") + avg("voltageL2") + avg("voltageL3")) /
        3
      ).toFixed(1),
      avgCurrent: avg("currentTotal").toFixed(2),
    };
  }, [analyticsData]);

  // Table pagination
  const pagedTableData = useMemo(() => {
    const sorted = [...tableData].sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp),
    );
    return sorted.slice(
      tablePage * TABLE_PAGE_SIZE,
      (tablePage + 1) * TABLE_PAGE_SIZE,
    );
  }, [tableData, tablePage]);
  const totalTablePages = Math.ceil(tableData.length / TABLE_PAGE_SIZE);

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
              maxLoadKw: maxLoadKw ?? "-",
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
          `Max Load: ${maxLoadKw ?? "-"} kW | Capacity: ${capacityVa ?? "-"} VA`,
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
              "A L1",
              "A L2",
              "A L3",
              "A Total",
              "P L1",
              "P L2",
              "P L3",
              "P Total",
              "Energy",
            ],
            rows: readings
              .slice(0, 100)
              .map((r) => [
                r.label,
                r.voltageL1 ?? "-",
                r.voltageL2 ?? "-",
                r.voltageL3 ?? "-",
                r.currentL1 ?? "-",
                r.currentL2 ?? "-",
                r.currentL3 ?? "-",
                r.currentTotal ?? "-",
                r.powerL1 ?? "-",
                r.powerL2 ?? "-",
                r.powerL3 ?? "-",
                r.powerTotal ?? "-",
                r.energyTotal ?? "-",
              ]),
          },
        ],
      });
    }
  };

  const fmtVal = (v: number) =>
    Number.isFinite(v)
      ? v.toLocaleString("id-ID", { maximumFractionDigits: 2 })
      : "-";

  return (
    <PageTransition>
      <motion.div
        className="space-y-1.5 max-w-6xl mx-auto"
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
              <h1 className="text-base font-bold">
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

        {/* Realtime Section - 3 columns */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-1.5"
        >
          {/* Power Gauge */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 py-1.5 pb-0">
              <CardTitle className="text-[10px] font-semibold flex items-center gap-1">
                <Gauge className="h-3 w-3" />
                Daya Realtime
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-1">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <svg className="w-20 h-20 -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="35"
                      strokeWidth="6"
                      fill="none"
                      className="stroke-muted/20"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="35"
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={220}
                      strokeDashoffset={
                        220 - (220 * Math.min(loadPercentage, 100)) / 100
                      }
                      strokeLinecap="round"
                      className={cn(
                        "transition-all duration-300",
                        loadStatus === "OFFLINE"
                          ? "stroke-slate-400"
                          : loadStatus === "OVERLOAD"
                            ? "stroke-red-500"
                            : "stroke-green-500",
                      )}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold">
                      {formatCompactNumber(realtimePowerKw)}
                    </span>
                    <span className="text-[8px] text-muted-foreground">kW</span>
                  </div>
                </div>
                <div className="flex-1 space-y-1 text-[9px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[8px] px-1 py-0",
                        loadStatus === "OFFLINE"
                          ? "bg-slate-500/20 text-slate-500"
                          : loadStatus === "OVERLOAD"
                            ? "bg-red-500/20 text-red-500"
                            : "bg-green-500/20 text-green-500",
                      )}
                    >
                      {loadStatus}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Load</span>
                    <span>
                      {maxLoadKw ? `${formatCompactNumber(maxLoadKw)} kW` : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Capacity</span>
                    <span>
                      {capacityVa
                        ? `${formatCompactNumber(capacityVa)} VA`
                        : "-"}
                    </span>
                  </div>
                  <Progress
                    value={
                      loadStatus === "OFFLINE"
                        ? 0
                        : Math.min(loadPercentage, 100)
                    }
                    className="h-1"
                  />
                  <p className="text-[8px] text-center text-muted-foreground">
                    {fmtVal(loadPercentage)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Voltage & Current */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 py-1.5 pb-0">
              <CardTitle className="text-[10px] font-semibold flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Voltage & Current
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-1">
              <div className="grid grid-cols-2 gap-1">
                <div className="space-y-0.5">
                  <p className="text-[8px] text-muted-foreground uppercase">
                    Voltage
                  </p>
                  <div className="grid grid-cols-3 gap-0.5 text-[9px]">
                    <div className="bg-muted/30 rounded px-1 py-0.5 text-center">
                      <p className="text-[7px] text-muted-foreground">L1</p>
                      <p className="font-semibold">
                        {fmtVal(realtimeMetrics.voltageL1)}
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded px-1 py-0.5 text-center">
                      <p className="text-[7px] text-muted-foreground">L2</p>
                      <p className="font-semibold">
                        {fmtVal(realtimeMetrics.voltageL2)}
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded px-1 py-0.5 text-center">
                      <p className="text-[7px] text-muted-foreground">L3</p>
                      <p className="font-semibold">
                        {fmtVal(realtimeMetrics.voltageL3)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[8px] text-muted-foreground uppercase">
                    Current
                  </p>
                  <div className="grid grid-cols-4 gap-0.5 text-[9px]">
                    <div className="bg-muted/30 rounded px-1 py-0.5 text-center">
                      <p className="text-[7px] text-muted-foreground">L1</p>
                      <p className="font-semibold">
                        {fmtVal(realtimeMetrics.currentL1)}
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded px-1 py-0.5 text-center">
                      <p className="text-[7px] text-muted-foreground">L2</p>
                      <p className="font-semibold">
                        {fmtVal(realtimeMetrics.currentL2)}
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded px-1 py-0.5 text-center">
                      <p className="text-[7px] text-muted-foreground">L3</p>
                      <p className="font-semibold">
                        {fmtVal(realtimeMetrics.currentL3)}
                      </p>
                    </div>
                    <div className="bg-primary/10 rounded px-1 py-0.5 text-center">
                      <p className="text-[7px] text-muted-foreground">Total</p>
                      <p className="font-semibold">
                        {fmtVal(realtimeMetrics.currentTotal)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-1">
                <div className="space-y-0.5">
                  <p className="text-[8px] text-muted-foreground uppercase">
                    Power
                  </p>
                  <div className="grid grid-cols-4 gap-0.5 text-[9px]">
                    <div className="bg-muted/30 rounded px-1 py-0.5 text-center">
                      <p className="text-[7px] text-muted-foreground">L1</p>
                      <p className="font-semibold">
                        {fmtVal(realtimeMetrics.powerL1)}
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded px-1 py-0.5 text-center">
                      <p className="text-[7px] text-muted-foreground">L2</p>
                      <p className="font-semibold">
                        {fmtVal(realtimeMetrics.powerL2)}
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded px-1 py-0.5 text-center">
                      <p className="text-[7px] text-muted-foreground">L3</p>
                      <p className="font-semibold">
                        {fmtVal(realtimeMetrics.powerL3)}
                      </p>
                    </div>
                    <div className="bg-primary/10 rounded px-1 py-0.5 text-center">
                      <p className="text-[7px] text-muted-foreground">Total</p>
                      <p className="font-semibold">
                        {fmtVal(realtimeMetrics.powerTotal)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[8px] text-muted-foreground uppercase">
                    Energy
                  </p>
                  <div className="grid grid-cols-2 gap-0.5 text-[9px]">
                    <div className="bg-orange-500/10 rounded px-1 py-0.5 text-center">
                      <p className="text-[7px] text-muted-foreground">Total</p>
                      <p className="font-semibold">
                        {fmtVal(realtimeMetrics.energyTotal)} kWh
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded px-1 py-0.5 text-center">
                      <p className="text-[7px] text-muted-foreground">Freq</p>
                      <p className="font-semibold">
                        {fmtVal(realtimeMetrics.frequency)} Hz
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analytics Summary */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 py-1.5 pb-0 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-semibold">
                Analitik
              </CardTitle>
              <RangeSelect
                value={analyticsRange}
                onChange={setAnalyticsRange}
              />
            </CardHeader>
            <CardContent className="p-2 pt-1">
              {analytics ? (
                <div className="space-y-1 text-[9px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Peak Power</span>
                    <span className="font-semibold">
                      {analytics.peakPowerKw} kW
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Peak Time</span>
                    <span>
                      {analytics.peakTime
                        ? formatDateTime(analytics.peakTime)
                        : "-"}
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
                </div>
              ) : (
                <div className="h-16 flex items-center justify-center text-[9px] text-muted-foreground">
                  No data
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* History Chart */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 py-1.5 pb-0 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-[10px] font-semibold">
                  Riwayat Pengukuran
                </CardTitle>
                <Select
                  value={historyMetric}
                  onValueChange={(v) => setHistoryMetric(v as MetricType)}
                >
                  <SelectTrigger className="h-5 w-20 text-[9px] border-0 bg-muted/50 px-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="power" className="text-[9px]">
                      Power
                    </SelectItem>
                    <SelectItem value="voltage" className="text-[9px]">
                      Voltage
                    </SelectItem>
                    <SelectItem value="current" className="text-[9px]">
                      Current
                    </SelectItem>
                    <SelectItem value="energy" className="text-[9px]">
                      Energy
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <RangeSelect value={historyRange} onChange={setHistoryRange} />
            </CardHeader>
            <CardContent className="p-2 pt-1">
              {historyData.length === 0 ? (
                <div className="h-[120px] flex items-center justify-center text-[9px] text-muted-foreground">
                  No data
                </div>
              ) : (
                <ChartContainer
                  config={historyChartConfig.lines.reduce(
                    (acc, l) => ({
                      ...acc,
                      [l.key]: { label: l.name, color: l.color },
                    }),
                    {},
                  )}
                  className="h-[120px] w-full"
                >
                  <AreaChart
                    data={historyData}
                    margin={{ top: 5, right: 5, bottom: 0, left: -15 }}
                  >
                    <defs>
                      {historyChartConfig.lines.map((l) => (
                        <linearGradient
                          key={l.key}
                          id={`fill-${l.key}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor={l.color}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="100%"
                            stopColor={l.color}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 7 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 7 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    {historyChartConfig.lines.map((l) => (
                      <Area
                        key={l.key}
                        type="monotone"
                        dataKey={l.key}
                        name={l.name}
                        stroke={l.color}
                        strokeWidth={1.5}
                        fill={`url(#fill-${l.key})`}
                        dot={false}
                        connectNulls
                      />
                    ))}
                  </AreaChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Data Table */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 py-1.5 pb-0 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-semibold">
                Riwayat Data
              </CardTitle>
              <RangeSelect value={tableRange} onChange={setTableRange} />
            </CardHeader>
            <CardContent className="p-0">
              <Table className="text-[9px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-6 px-2">Waktu</TableHead>
                    <TableHead className="h-6 px-2 text-right">V L1</TableHead>
                    <TableHead className="h-6 px-2 text-right">V L2</TableHead>
                    <TableHead className="h-6 px-2 text-right">V L3</TableHead>
                    <TableHead className="h-6 px-2 text-right">
                      A Total
                    </TableHead>
                    <TableHead className="h-6 px-2 text-right">
                      P Total
                    </TableHead>
                    <TableHead className="h-6 px-2 text-right">
                      Energy
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedTableData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-12 text-center text-muted-foreground"
                      >
                        No data
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedTableData.map((r, i) => (
                      <TableRow key={i} className="h-6">
                        <TableCell className="px-2 py-1">{r.label}</TableCell>
                        <TableCell className="px-2 py-1 text-right">
                          {r.voltageL1 ?? "-"}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-right">
                          {r.voltageL2 ?? "-"}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-right">
                          {r.voltageL3 ?? "-"}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-right">
                          {r.currentTotal ?? "-"}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-right">
                          {r.powerTotal ?? "-"}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-right">
                          {r.energyTotal ?? "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {totalTablePages > 1 && (
                <div className="flex items-center justify-between px-2 py-1 border-t">
                  <span className="text-[8px] text-muted-foreground">
                    Page {tablePage + 1} of {totalTablePages}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => setTablePage((p) => Math.max(0, p - 1))}
                      disabled={tablePage === 0}
                    >
                      &lt;
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
                      &gt;
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Profile & Devices */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 py-1.5 pb-0">
              <CardTitle className="text-[10px] font-semibold flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Profil Outlet
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-1">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[9px] mb-2">
                <div>
                  <p className="text-muted-foreground">Region</p>
                  <p className="font-medium">{detail?.region || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">City</p>
                  <p className="font-medium">{detail?.city || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Address</p>
                  <p className="font-medium">{detail?.address || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Max Load</p>
                  <p className="font-medium">
                    {maxLoadKw ? `${formatCompactNumber(maxLoadKw)} kW` : "-"}
                  </p>
                </div>
              </div>

              {/* Devices List */}
              <p className="text-[9px] text-muted-foreground mb-1">
                Daftar Perangkat ({detail?.devices.length || 0})
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
                {(detail?.devices || []).map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center gap-1 bg-muted/30 rounded px-2 py-1"
                  >
                    <Circle
                      className={cn(
                        "h-2 w-2 fill-current",
                        device.status.toLowerCase() === "online"
                          ? "text-emerald-500"
                          : device.status.toLowerCase() === "offline"
                            ? "text-red-500"
                            : "text-amber-500",
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-medium truncate">
                        {device.name}
                      </p>
                      <p className="text-[7px] text-muted-foreground truncate">
                        {device.locationName ||
                          device.locationType ||
                          device.serialNo}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </PageTransition>
  );
}
