"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/ui/page-transition";

import { RealtimePowerCard } from "@/components/electricity/detail/RealtimePowerCard";
import { PowerMeterCard } from "@/components/electricity/detail/PowerMeterCard";
import { TrendChartCard } from "@/components/electricity/detail/TrendChartCard";
import { AnalyticsCard } from "@/components/electricity/detail/AnalyticsCard";
import { HistoryTableCard } from "@/components/electricity/detail/HistoryTableCard";
import { OutletProfileCard } from "@/components/electricity/detail/OutletProfileCard";
import {
  DateFilter,
  type DateRange,
  buildRange,
} from "@/components/electricity/detail/DateFilter";
import { DataLoadingOverlay } from "@/components/electricity/detail/DataLoadingOverlay";

import {
  deviceMetricsApi,
  energyDashboardApi,
  type EnergyOutletDetail,
} from "@/lib/api";
import { exportToExcel, exportToPdf } from "@/lib/report-export";
import {
  ExportModal,
  type ExportFormat,
  type ExportPeriod,
} from "@/components/dashboard/ExportModal";
import { formatCompactNumber } from "@/lib/energy-monitoring";

export interface OutletDetailPayload {
  id: string;
  name: string;
  region: string | null;
  city: string | null;
  address: string | null;
  period: {
    from: string;
    to: string;
    days: number;
    isSingleDay: boolean;
    label: string;
  };
  latestMetrics: Record<
    string,
    { value: number; unit: string | null; timestamp: string }
  >;
  capacityVa: number | null;
  maxLoadKw: number | null;
  timeSeries: Array<{
    timestamp: string;
    metricKey: string;
    metricValue: number;
  }>;
  analytics: {
    peakPowerKw: number;
    avgPowerKw: number;
    avgVoltageV: number;
    avgCurrentA: number;
    avgPfSigma: number;
    totalEnergyKwh: number;
    totalKvarh: number;
    peakHour: number | null;
    peakHourAvgKwh: number;
    overallAvgKwhPerHour: number;
  };
  startingPoint: {
    startAt: string;
    initialKwh: number;
  } | null;
  devices: Array<{
    id: string;
    name: string;
    serialNo: string;
    locationName: string | null;
    locationType: string | null;
    status: string;
    lastSeenAt: string | null;
    moduleTypes: string[];
  }>;
}

function adaptApiResponse(raw: EnergyOutletDetail): OutletDetailPayload {
  type ExtendedRaw = EnergyOutletDetail & {
    latestMetrics?: Record<
      string,
      { value: number; unit: string | null; timestamp: string }
    >;
    timeSeries?: Array<{
      timestamp: string;
      metricKey: string;
      metricValue: unknown;
    }>;
    analytics?: Partial<OutletDetailPayload["analytics"]>;
    capacityVa?: number | null;
    maxLoadKw?: number | null;
    startingPoint?: OutletDetailPayload["startingPoint"];
  };
  const ext = raw as ExtendedRaw;
  return {
    id: raw.id,
    name: raw.name,
    region: raw.region ?? null,
    city: raw.city ?? null,
    address: raw.address ?? null,
    period: {
      from: raw.period.from,
      to: raw.period.to,
      days: raw.period.days,
      isSingleDay: raw.period.isSingleDay,
      label: raw.period.label,
    },
    latestMetrics: ext.latestMetrics ?? {},
    capacityVa: ext.capacityVa ?? null,
    maxLoadKw: ext.maxLoadKw ?? null,
    timeSeries: (ext.timeSeries ?? []).map((r) => ({
      timestamp: r.timestamp,
      metricKey: r.metricKey,
      metricValue: Number(r.metricValue ?? 0),
    })),
    analytics: {
      peakPowerKw: Number(ext.analytics?.peakPowerKw ?? raw.peakPower ?? 0),
      avgPowerKw: Number(ext.analytics?.avgPowerKw ?? 0),
      avgVoltageV: Number(ext.analytics?.avgVoltageV ?? 0),
      avgCurrentA: Number(ext.analytics?.avgCurrentA ?? 0),
      avgPfSigma: Number(ext.analytics?.avgPfSigma ?? 0),
      totalEnergyKwh: Number(
        ext.analytics?.totalEnergyKwh ?? raw.kpiData?.totalUsage ?? 0,
      ),
      totalKvarh: Number(ext.analytics?.totalKvarh ?? 0),
      peakHour: ext.analytics?.peakHour ?? null,
      peakHourAvgKwh: Number(ext.analytics?.peakHourAvgKwh ?? 0),
      overallAvgKwhPerHour: Number(ext.analytics?.overallAvgKwhPerHour ?? 0),
    },
    startingPoint: ext.startingPoint ?? null,
    devices: (raw.devices ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      serialNo: d.serialNo ?? "",
      locationName: d.locationName ?? null,
      locationType: d.locationType ?? null,
      status: d.status ?? "unknown",
      lastSeenAt: d.lastSeenAt ?? null,
      moduleTypes: d.moduleTypes ?? [],
    })),
  };
}

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariant = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

const roundN = (v: number, d = 2) => Number(v.toFixed(d));
function mv(
  metrics: OutletDetailPayload["latestMetrics"],
  key: string,
): number {
  return metrics[key]?.value ?? 0;
}

const applyStartPointOffset = (
  rawValue: number,
  startingPoint: OutletDetailPayload["startingPoint"],
  timestamp?: string,
) => {
  if (!startingPoint) return Number(rawValue.toFixed(2));

  const startAt = new Date(startingPoint.startAt);
  if (!Number.isNaN(startAt.getTime()) && timestamp) {
    const metricTs = new Date(timestamp);
    if (!Number.isNaN(metricTs.getTime()) && metricTs < startAt) {
      return 0;
    }
  }

  return Number(
    Math.max(0, rawValue - Number(startingPoint.initialKwh ?? 0)).toFixed(2),
  );
};

type ExportMetricRow = {
  timestamp: string;
  deviceId: string;
  metricKey: string;
  metricValue: number;
};

type ExportHistoricalRow = {
  timestamp: string;
  label: string;
  voltageL1: number | null;
  voltageL2: number | null;
  voltageL3: number | null;
  currentTotal: number | null;
  powerTotal: number | null;
  energyTotal: number | null;
  pfSigma: number | null;
};

const normalizeExportPeriod = (period: ExportPeriod) => {
  const fromDate = new Date(period.from);
  const toDate = new Date(period.to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new Error("Periode export tidak valid");
  }
  const start = fromDate <= toDate ? fromDate : toDate;
  const end = fromDate <= toDate ? toDate : fromDate;
  return {
    fromIso: start.toISOString(),
    toIso: end.toISOString(),
    label: `${start.toLocaleString("id-ID")} - ${end.toLocaleString("id-ID")}`,
  };
};

const buildHourlyExportRows = (
  metrics: ExportMetricRow[],
): ExportHistoricalRow[] => {
  const latestPerHourDeviceMetric = new Map<string, ExportMetricRow>();

  for (const metric of metrics) {
    const ts = new Date(metric.timestamp);
    if (Number.isNaN(ts.getTime())) continue;
    const hourStart = new Date(ts);
    hourStart.setMinutes(0, 0, 0);
    const key = `${hourStart.toISOString()}|${metric.deviceId}|${metric.metricKey}`;
    const current = latestPerHourDeviceMetric.get(key);
    if (
      !current ||
      new Date(metric.timestamp).getTime() >
        new Date(current.timestamp).getTime()
    ) {
      latestPerHourDeviceMetric.set(key, metric);
    }
  }

  const hourMap = new Map<
    string,
    Map<string, { sum: number; count: number }>
  >();
  for (const metric of latestPerHourDeviceMetric.values()) {
    const ts = new Date(metric.timestamp);
    if (Number.isNaN(ts.getTime())) continue;
    const hourStart = new Date(ts);
    hourStart.setMinutes(0, 0, 0);
    const hourIso = hourStart.toISOString();
    const metricMap =
      hourMap.get(hourIso) ?? new Map<string, { sum: number; count: number }>();
    const prev = metricMap.get(metric.metricKey) ?? { sum: 0, count: 0 };
    prev.sum += Number(metric.metricValue ?? 0);
    prev.count += 1;
    metricMap.set(metric.metricKey, prev);
    hourMap.set(hourIso, metricMap);
  }

  const averageKeys = new Set([
    "voltage_l1",
    "voltage_l2",
    "voltage_l3",
    "pf_sigma",
  ]);
  const pick = (
    metricMap: Map<string, { sum: number; count: number }>,
    key: string,
  ): number | null => {
    const agg = metricMap.get(key);
    if (!agg || agg.count === 0) return null;
    const value = averageKeys.has(key) ? agg.sum / agg.count : agg.sum;
    return Number(value.toFixed(2));
  };

  return Array.from(hourMap.keys())
    .sort((a, b) => a.localeCompare(b))
    .map((hourIso) => {
      const m =
        hourMap.get(hourIso) ??
        new Map<string, { sum: number; count: number }>();
      const d = new Date(hourIso);
      const label = `${d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })} ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
      return {
        timestamp: hourIso,
        label,
        voltageL1: pick(m, "voltage_l1"),
        voltageL2: pick(m, "voltage_l2"),
        voltageL3: pick(m, "voltage_l3"),
        currentTotal: pick(m, "current_total"),
        powerTotal: pick(m, "power_total") ?? pick(m, "power"),
        energyTotal: pick(m, "energy_total"),
        pfSigma: pick(m, "pf_sigma"),
      };
    });
};

const buildExportAnalytics = (rows: ExportHistoricalRow[]) => {
  const powerValues = rows
    .map((row) => row.powerTotal ?? 0)
    .filter((v) => Number.isFinite(v));
  const voltageValues = rows
    .flatMap((row) => [row.voltageL1, row.voltageL2, row.voltageL3])
    .filter((v): v is number => typeof v === "number");
  const currentValues = rows
    .map((row) => row.currentTotal)
    .filter((v): v is number => typeof v === "number");
  const energyValues = rows
    .map((row) => row.energyTotal)
    .filter((v): v is number => typeof v === "number");

  const peakPowerKw = powerValues.length ? Math.max(...powerValues) : 0;
  const avgPowerKw = powerValues.length
    ? powerValues.reduce((s, v) => s + v, 0) / powerValues.length
    : 0;
  const avgVoltageV = voltageValues.length
    ? voltageValues.reduce((s, v) => s + v, 0) / voltageValues.length
    : 0;
  const avgCurrentA = currentValues.length
    ? currentValues.reduce((s, v) => s + v, 0) / currentValues.length
    : 0;
  const totalEnergyKwh = energyValues.length ? Math.max(...energyValues) : 0;

  const peakRow = rows.reduce<ExportHistoricalRow | null>(
    (best, row) =>
      (row.powerTotal ?? -Infinity) > (best?.powerTotal ?? -Infinity)
        ? row
        : best,
    null,
  );

  return {
    peakPowerKw: roundN(peakPowerKw),
    avgPowerKw: roundN(avgPowerKw),
    avgVoltageV: roundN(avgVoltageV, 1),
    avgCurrentA: roundN(avgCurrentA),
    totalEnergyKwh: roundN(totalEnergyKwh),
    peakAt: peakRow?.label ?? "-",
  };
};

export default function ElectricityOutletDetailPage() {
  const params = useParams<{ scopeId: string }>();
  const scopeId = params.scopeId;

  const [dateRange, setDateRange] = useState<DateRange>(buildRange("today"));
  const [detail, setDetail] = useState<OutletDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeSeries, setTimeSeries] = useState<
    OutletDetailPayload["timeSeries"]
  >([]);
  const [analyticsData, setAnalyticsData] = useState<
    OutletDetailPayload["analytics"] | null
  >(null);

  const [dataLoading, setDataLoading] = useState(false);
  const [loadedFrom, setLoadedFrom] = useState("");
  const [loadedTo, setLoadedTo] = useState("");

  const [latestMetrics, setLatestMetrics] = useState<
    OutletDetailPayload["latestMetrics"]
  >({});
  const [realtimeLastUpdated, setRealtimeLastUpdated] = useState<string | null>(
    null,
  );
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isOffline = useMemo(() => {
    if (!isMounted || !realtimeLastUpdated) return true;
    return Date.now() - new Date(realtimeLastUpdated).getTime() > 5 * 60 * 1000;
  }, [isMounted, realtimeLastUpdated]);

  const fetchForRange = useCallback(
    async (range: DateRange, isInitial = false) => {
      if (range.preset === "custom" && (!range.from || !range.to)) return;
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        isInitial ? setLoading(true) : setDataLoading(true);
        setError(null);
        const res = await energyDashboardApi.getOutletDetail(scopeId, {
          from: range.from,
          to: range.to,
        });
        if (!res.success || !res.data) {
          setError(res.error ?? "Failed to load outlet");
          return;
        }
        const payload = adaptApiResponse(res.data);
        if (isInitial) setDetail(payload);
        setTimeSeries(payload.timeSeries);
        setAnalyticsData(payload.analytics);
        setLoadedFrom(range.from);
        setLoadedTo(range.to);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error loading outlet");
      } finally {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        isInitial ? setLoading(false) : setDataLoading(false);
      }
    },
    [scopeId],
  );

  useEffect(() => {
    void fetchForRange(buildRange("today"), true);
  }, [fetchForRange]);

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    if (range.preset === "custom" && (!range.from || !range.to)) return;
    void fetchForRange(range, false);
  };

  const pollRealtimeMetrics = useCallback(async () => {
    const res = await deviceMetricsApi.getAll({
      scopeId,
      moduleType: "power_meter",
      limit: 50,
    });
    if (!res.success || !res.data?.length) return;
    const latestByKey = new Map<string, (typeof res.data)[0]>();
    for (const m of res.data) {
      const cur = latestByKey.get(m.metricKey);
      if (!cur || new Date(m.timestamp) > new Date(cur.timestamp))
        latestByKey.set(m.metricKey, m);
    }
    const updated: OutletDetailPayload["latestMetrics"] = {};
    for (const [key, m] of latestByKey)
      updated[key] = {
        value: Number(m.metricValue),
        unit: m.unit ?? null,
        timestamp: m.timestamp,
      };
    setLatestMetrics(updated);
    const latestTs = Array.from(latestByKey.values())
      .map((m) => m.timestamp)
      .sort()
      .pop();
    if (latestTs) setRealtimeLastUpdated(latestTs);
  }, [scopeId]);

  useEffect(() => {
    void pollRealtimeMetrics();
    const id = setInterval(() => void pollRealtimeMetrics(), 15_000);
    return () => clearInterval(id);
  }, [pollRealtimeMetrics]);

  const pmValues = useMemo(() => {
    const g = (key: string) => mv(latestMetrics, key);
    const kw = (key: string) => {
      const m = latestMetrics[key];
      if (!m) return 0;
      return m.unit === "W" ? m.value / 1000 : m.value;
    };
    return {
      voltageL1: roundN(g("voltage_l1"), 1),
      voltageL2: roundN(g("voltage_l2"), 1),
      voltageL3: roundN(g("voltage_l3"), 1),
      voltageAB: roundN(g("voltage_ab"), 1),
      voltageBC: roundN(g("voltage_bc"), 1),
      voltageCA: roundN(g("voltage_ca"), 1),
      currentL1: roundN(g("current_l1")),
      currentL2: roundN(g("current_l2")),
      currentL3: roundN(g("current_l3")),
      currentTotal: roundN(g("current_total")),
      powerL1: roundN(kw("power_l1")),
      powerL2: roundN(kw("power_l2")),
      powerL3: roundN(kw("power_l3")),
      powerTotal: roundN(kw("power_total")),
      reactiveL1: roundN(g("reactive_l1")),
      reactiveL2: roundN(g("reactive_l2")),
      reactiveL3: roundN(g("reactive_l3")),
      reactiveSigma: roundN(g("reactive_sigma")),
      vaA: roundN(g("va_a")),
      vaB: roundN(g("va_b")),
      vaC: roundN(g("va_c")),
      vaSigma: roundN(g("va_sigma")),
      pfA: roundN(g("pf_a"), 3),
      pfB: roundN(g("pf_b"), 3),
      pfC: roundN(g("pf_c"), 3),
      pfSigma: roundN(g("pf_sigma"), 3),
      energyTotal: roundN(
        applyStartPointOffset(
          g("energy_total"),
          detail?.startingPoint ?? null,
          latestMetrics["energy_total"]?.timestamp,
        ),
      ),
      kvarh: roundN(g("kvarh")),
      frequency: roundN(g("frequency"), 1),
    };
  }, [detail?.startingPoint, latestMetrics]);

  const handleExport = async (format: ExportFormat, period: ExportPeriod) => {
    if (!detail) return;
    const {
      fromIso,
      toIso,
      label: periodLabel,
    } = normalizeExportPeriod(period);
    const metricsRes = await deviceMetricsApi.getAll({
      scopeId,
      moduleType: "power_meter",
      from: fromIso,
      to: toIso,
      limit: 50_000,
    });

    const rawMetrics: ExportMetricRow[] =
      metricsRes.success && metricsRes.data
        ? metricsRes.data.map((item) => ({
            timestamp: item.timestamp,
            deviceId: item.deviceId,
            metricKey: item.metricKey,
            metricValue: Number(item.metricValue ?? 0),
          }))
        : [];

    const trendRows = buildHourlyExportRows(rawMetrics).map((row) => ({
      ...row,
      energyTotal:
        row.energyTotal !== null
          ? applyStartPointOffset(
              row.energyTotal,
              detail.startingPoint,
              row.timestamp,
            )
          : null,
    }));
    const analytics = buildExportAnalytics(trendRows);
    const historicalRows = trendRows.map((row) => ({
      timestamp: row.label,
      voltageL1: row.voltageL1,
      voltageL2: row.voltageL2,
      voltageL3: row.voltageL3,
      currentTotal: row.currentTotal,
      powerTotal: row.powerTotal,
      energyTotal: row.energyTotal,
      pfSigma: row.pfSigma,
    }));

    const deviceRows = detail.devices.map((device) => ({
      deviceId: device.id,
      deviceName: device.name,
      serialNo: device.serialNo,
      locationName: device.locationName ?? "-",
      locationType: device.locationType ?? "-",
      status: device.status,
      lastSeenAt: device.lastSeenAt
        ? new Date(device.lastSeenAt).toLocaleString("id-ID")
        : "-",
      modules: device.moduleTypes.join(", ") || "-",
    }));

    if (format === "excel") {
      await exportToExcel(`outlet-${detail.id}.xlsx`, [
        {
          name: "Summary",
          rows: [
            {
              outlet: detail.name,
              region: detail.region ?? "-",
              address: detail.address ?? "-",
              period: periodLabel,
              capacityVa: detail.capacityVa ?? "-",
              devices: detail.devices.length,
              startingPoint: detail.startingPoint
                ? new Date(detail.startingPoint.startAt).toLocaleString("id-ID")
                : "-",
              initialKwh: detail.startingPoint
                ? detail.startingPoint.initialKwh
                : "-",
            },
          ],
        },
        {
          name: "Analytics",
          rows: [
            {
              peakPowerKw: analytics.peakPowerKw,
              peakAt: analytics.peakAt,
              avgPowerKw: analytics.avgPowerKw,
              avgVoltageV: analytics.avgVoltageV,
              avgCurrentA: analytics.avgCurrentA,
              totalEnergyKwh: analytics.totalEnergyKwh,
            },
          ],
        },
        {
          name: "Trend",
          rows: trendRows.map((row) => ({
            timestamp: row.label,
            powerTotalKw: row.powerTotal,
            energyTotalKwh: row.energyTotal,
          })),
        },
        { name: "HistoricalData", rows: historicalRows },
        { name: "DeviceInfo", rows: deviceRows },
      ]);
    } else {
      await exportToPdf({
        fileName: `outlet-${detail.id}.pdf`,
        title: "Detail Outlet",
        scopeName: detail.name,
        period: periodLabel,
        generatedAt: new Date().toLocaleString("id-ID"),
        summary: [
          `Outlet: ${detail.name} | Region: ${detail.region ?? "-"}`,
          `Capacity: ${detail.capacityVa ? `${formatCompactNumber(detail.capacityVa)} VA` : "-"}`,
          `Devices: ${detail.devices.length}`,
          detail.startingPoint
            ? `Starting Point: ${new Date(detail.startingPoint.startAt).toLocaleString("id-ID")} WIB, Initial ${detail.startingPoint.initialKwh} kWh`
            : "Starting Point: -",
          `Peak Power: ${analytics.peakPowerKw} kW (${analytics.peakAt})`,
          `Avg Power: ${analytics.avgPowerKw} kW | Avg Voltage: ${analytics.avgVoltageV} V | Avg Current: ${analytics.avgCurrentA} A`,
        ],
        tables: [
          {
            title: "Analytics Detail",
            columns: ["Metric", "Value"],
            rows: [
              ["Peak Power (kW)", analytics.peakPowerKw],
              ["Peak Time", analytics.peakAt],
              ["Avg Power (kW)", analytics.avgPowerKw],
              ["Avg Voltage (V)", analytics.avgVoltageV],
              ["Avg Current (A)", analytics.avgCurrentA],
              ["Total Energy (kWh)", analytics.totalEnergyKwh],
            ],
          },
          {
            title: "Trend",
            columns: ["Time", "Power Total (kW)", "Energy Total (kWh)"],
            rows: trendRows
              .slice(0, 250)
              .map((row) => [
                row.label,
                row.powerTotal ?? "-",
                row.energyTotal ?? "-",
              ]),
          },
          {
            title: "Historical Data",
            columns: [
              "Time",
              "V1",
              "V2",
              "V3",
              "A Total",
              "P Total",
              "Energy",
              "PF",
            ],
            rows: historicalRows
              .slice(0, 250)
              .map((r) => [
                String(r.timestamp),
                String(r.voltageL1 ?? "-"),
                String(r.voltageL2 ?? "-"),
                String(r.voltageL3 ?? "-"),
                String(r.currentTotal ?? "-"),
                String(r.powerTotal ?? "-"),
                String(r.energyTotal ?? "-"),
                String(r.pfSigma ?? "-"),
              ]),
          },
          {
            title: "Info Device",
            columns: [
              "Device ID",
              "Device Name",
              "Serial",
              "Location",
              "Type",
              "Status",
              "Last Seen",
              "Modules",
            ],
            rows: deviceRows.map((row) => [
              row.deviceId,
              row.deviceName,
              row.serialNo,
              row.locationName,
              row.locationType,
              row.status,
              row.lastSeenAt,
              row.modules,
            ]),
          },
        ],
      });
    }
  };

  const dateRangeLabel = useMemo(() => {
    if (!loadedFrom || !loadedTo) return "";
    const from = new Date(loadedFrom).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
    });
    const to = new Date(loadedTo).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
    });
    return from === to ? from : `${from} – ${to}`;
  }, [loadedFrom, loadedTo]);

  const overlayLabel = `Load data${dateRangeLabel ? ` ${dateRangeLabel}` : "..."}`;

  if (loading && !detail) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto px-3 pt-1">
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-muted/30 animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-48 rounded bg-muted/30 animate-pulse" />
              <div className="h-3 w-32 rounded bg-muted/30 animate-pulse" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-32 rounded-md bg-muted/30 animate-pulse" />
            <div className="h-9 w-9 rounded-md bg-muted/30 animate-pulse" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-xl bg-muted/30 animate-pulse h-72" />
          <div className="rounded-xl bg-muted/30 animate-pulse h-72 lg:col-span-2" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-xl bg-muted/30 animate-pulse h-80 lg:col-span-2" />
          <div className="rounded-xl bg-muted/30 animate-pulse h-80" />
        </div>
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto px-3 pt-4">
        <div className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <motion.div
        className="space-y-4 max-w-7xl mx-auto px-3"
        initial="hidden"
        animate="visible"
        variants={container}
      >
        <motion.div
          variants={itemVariant}
          className="flex items-center justify-between pt-1 flex-wrap gap-3"
        >
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="h-9 w-9">
              <Link href="/dashboard/electricity">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-bold">
                {detail?.name ?? "Outlet Detail"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {detail?.address ?? detail?.region ?? ""}
              </p>
              {detail?.startingPoint && (
                <p className="text-xs text-muted-foreground mt-1">
                  Starting point: {new Date(detail.startingPoint.startAt).toLocaleString("id-ID")} WIB, awal {detail.startingPoint.initialKwh} kWh
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DateFilter value={dateRange} onChange={handleDateRangeChange} />
            <ExportModal
              onExport={handleExport}
              disabled={!detail || loading}
            />
          </div>
        </motion.div>

        <motion.div
          variants={itemVariant}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        >
          <RealtimePowerCard
            powerTotal={pmValues.powerTotal}
            energyTotal={pmValues.energyTotal}
            capacityVa={detail?.capacityVa ?? null}
            isOffline={isOffline}
            lastUpdated={realtimeLastUpdated}
          />
          <PowerMeterCard values={pmValues} />
        </motion.div>

        {detail && (
          <motion.div
            variants={itemVariant}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          >
            <div className="lg:col-span-2 relative">
              <DataLoadingOverlay
                isLoading={dataLoading}
                label={overlayLabel}
              />
              <TrendChartCard
                timeSeries={timeSeries}
                loadedFrom={loadedFrom}
                loadedTo={loadedTo}
              />
            </div>
            <div className="relative">
              <DataLoadingOverlay
                isLoading={dataLoading}
                label={overlayLabel}
              />
              <AnalyticsCard
                analytics={analyticsData ?? detail.analytics}
                devices={detail.devices}
              />
            </div>
          </motion.div>
        )}

        {detail && (
          <motion.div variants={itemVariant} className="relative">
            <DataLoadingOverlay isLoading={dataLoading} label={overlayLabel} />
            <HistoryTableCard
              scopeId={scopeId}
              dateRange={dateRange}
              dataLoading={dataLoading}
            />
          </motion.div>
        )}

        {detail && (
          <motion.div variants={itemVariant}>
            <OutletProfileCard detail={detail} />
          </motion.div>
        )}
      </motion.div>
    </PageTransition>
  );
}
