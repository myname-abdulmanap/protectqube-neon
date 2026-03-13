"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  startTransition,
} from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Store,
  Activity,
  Zap,
  Gauge,
  TrendingUp,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/ui/page-transition";
import {
  deviceMetricsApi,
  energyConfigsApi,
  energyDashboardApi,
  scopesApi,
  type EnergyOutletDetail,
  type Scope,
} from "@/lib/api";
import { exportToExcel, exportToPdf } from "@/lib/report-export";
import { EnergyExportActions } from "@/components/dashboard/EnergyExportActions";
import { EnergyPeriodFilter } from "@/components/dashboard/EnergyPeriodFilter";
import {
  buildEnergyFilters,
  createEnergyPeriod,
  formatPeriodLabel,
  normalizeEnergyPeriod,
  type EnergyPeriodState,
  type EnergyPreset,
} from "@/lib/energy-monitoring";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

type OutletView = {
  id: string;
  name: string;
  region: string;
  city: string | null;
  address: string | null;
  devices: EnergyOutletDetail["devices"];
  kpiData: EnergyOutletDetail["kpiData"];
  hourlyData: EnergyOutletDetail["hourlyData"];
  sectionData: EnergyOutletDetail["sectionData"];
  comparisonData: EnergyOutletDetail["comparisonData"];
  peakPower: number;
  maxLoad: number | null;
};

type HistoricalRow = {
  timestampIso: string;
  waktu: string;
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
  reactiveL1: number | null;
  reactiveL2: number | null;
  reactiveL3: number | null;
  frequency: number | null;
  energyTotal: number | null;
};

type RawScopeMetric = {
  scopeId: string;
  timestamp: string;
  deviceId: string;
  metricKey: string;
  metricValue: number;
};

type MetricGroup = "voltage" | "current" | "power" | "reactive" | "energy";
type ExportMode = "aggregate" | "selected";

const METRIC_GROUP_OPTIONS: { key: MetricGroup; label: string }[] = [
  { key: "voltage", label: "Tegangan (V)" },
  { key: "current", label: "Arus (A)" },
  { key: "power", label: "Daya Aktif (W)" },
  { key: "reactive", label: "Daya Reaktif (VAr)" },
  { key: "energy", label: "Energi & Frekuensi" },
];

const METRIC_COLUMNS: Record<
  MetricGroup | "all",
  { key: keyof HistoricalRow; label: string }[]
> = {
  all: [
    { key: "voltageL1", label: "V L1" },
    { key: "voltageL2", label: "V L2" },
    { key: "voltageL3", label: "V L3" },
    { key: "currentL1", label: "I L1" },
    { key: "currentL2", label: "I L2" },
    { key: "currentL3", label: "I L3" },
    { key: "currentTotal", label: "I Tot" },
    { key: "powerL1", label: "P L1" },
    { key: "powerL2", label: "P L2" },
    { key: "powerL3", label: "P L3" },
    { key: "powerTotal", label: "P Tot" },
    { key: "reactiveL1", label: "Q L1" },
    { key: "reactiveL2", label: "Q L2" },
    { key: "reactiveL3", label: "Q L3" },
    { key: "frequency", label: "Hz" },
    { key: "energyTotal", label: "kWh" },
  ],
  voltage: [
    { key: "voltageL1", label: "V L1" },
    { key: "voltageL2", label: "V L2" },
    { key: "voltageL3", label: "V L3" },
  ],
  current: [
    { key: "currentL1", label: "I L1" },
    { key: "currentL2", label: "I L2" },
    { key: "currentL3", label: "I L3" },
    { key: "currentTotal", label: "I Tot" },
  ],
  power: [
    { key: "powerL1", label: "P L1" },
    { key: "powerL2", label: "P L2" },
    { key: "powerL3", label: "P L3" },
    { key: "powerTotal", label: "P Tot" },
  ],
  reactive: [
    { key: "reactiveL1", label: "Q L1" },
    { key: "reactiveL2", label: "Q L2" },
    { key: "reactiveL3", label: "Q L3" },
  ],
  energy: [
    { key: "frequency", label: "Hz" },
    { key: "energyTotal", label: "kWh" },
  ],
};

const SECTION_DOT_CLASSES = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-cyan-500",
  "bg-rose-500",
];

export default function ReportsPage() {
  const [period, setPeriod] = useState<EnergyPeriodState>(() =>
    createEnergyPeriod("today"),
  );
  const [appliedPeriod, setAppliedPeriod] = useState<EnergyPeriodState>(() =>
    createEnergyPeriod("today"),
  );
  const filters = useMemo(
    () => buildEnergyFilters(appliedPeriod),
    [appliedPeriod],
  );
  const periodLabel = formatPeriodLabel(appliedPeriod);

  const [outlets, setOutlets] = useState<OutletView[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>("");
  const [exportMode, setExportMode] = useState<ExportMode>("aggregate");
  const [historicalReadings, setHistoricalReadings] = useState<HistoricalRow[]>(
    [],
  );
  const [rawScopeMetrics, setRawScopeMetrics] = useState<RawScopeMetric[]>([]);
  const [selectedScopeDetail, setSelectedScopeDetail] = useState<Scope | null>(
    null,
  );
  const [selectedEnergyConfig, setSelectedEnergyConfig] = useState<{
    maxLoadKw: number | null;
    capacityVa: number | null;
    startPoint: { startAt: string; initialKwh: number } | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState("");
  const [tableMetricFilter, setTableMetricFilter] = useState<
    MetricGroup | "all"
  >("all");
  const [tablePage, setTablePage] = useState(0);
  const TABLE_PAGE_SIZE = 20;

  const handlePresetChange = (preset: EnergyPreset) => {
    setPeriod(createEnergyPeriod(preset));
  };

  const handleApply = () => {
    startTransition(() => {
      setAppliedPeriod(normalizeEnergyPeriod(period));
    });
  };

  const handleReset = () => {
    const next = createEnergyPeriod("today");
    setPeriod(next);
    startTransition(() => {
      setAppliedPeriod(next);
    });
  };

  useEffect(() => {
    const loadOutlets = async () => {
      try {
        setError(null);
        setLoading(true);

        const listResponse = await energyDashboardApi.getOutlets(filters);
        if (!listResponse.success || !listResponse.data) {
          setError(listResponse.error || "Failed to load outlet list");
          return;
        }

        const details = await Promise.all(
          listResponse.data.map(async (item) => {
            const detailResponse = await energyDashboardApi.getOutletDetail(
              item.scopeId,
              filters,
            );
            return detailResponse.success ? detailResponse.data : null;
          }),
        );

        const mapped: OutletView[] = details
          .filter((d): d is EnergyOutletDetail => Boolean(d))
          .map((d) => ({
            id: d.id,
            name: d.name,
            region: d.region || "Unknown",
            city: d.city,
            address: d.address,
            devices: d.devices,
            kpiData: d.kpiData,
            hourlyData: d.hourlyData,
            sectionData: d.sectionData,
            comparisonData: d.comparisonData,
            peakPower: d.peakPower,
            maxLoad: d.maxLoad,
          }));

        setOutlets(mapped);
        if (mapped[0] && !selectedOutlet) {
          setSelectedOutlet(mapped[0].id);
        }
      } catch {
        setError("Gagal memuat data outlet");
      } finally {
        setLoading(false);
      }
    };

    loadOutlets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const outlet = outlets.find((o) => o.id === selectedOutlet) || outlets[0];

  useEffect(() => {
    if (!outlet) return;
    if (!filters.from || !filters.to) return;
    const outletId = outlet.id;
    const filterFrom = filters.from;
    const filterTo = filters.to;

    const loadData = async () => {
      const [
        metricResponse,
        aggregatedResponse,
        scopeResponse,
        configResponse,
      ] = await Promise.all([
        deviceMetricsApi.getAll({
          scopeId: outletId,
          moduleType: "power_meter",
          from: filterFrom,
          to: filterTo,
          limit: 50000,
        }),
        deviceMetricsApi.getAggregated({
          scopeId: outletId,
          moduleType: "power_meter",
          from: filterFrom,
          to: filterTo,
          interval: "hour",
        }),
        scopesApi.getById(outletId),
        energyConfigsApi.getAll(outletId),
      ]);

      let activeStartPoint: { startAt: string; initialKwh: number } | null =
        null;

      if (scopeResponse.success && scopeResponse.data) {
        setSelectedScopeDetail(scopeResponse.data);
      } else {
        setSelectedScopeDetail(null);
      }

      if (
        configResponse.success &&
        configResponse.data &&
        configResponse.data.length > 0
      ) {
        const sortedConfigs = [...configResponse.data].sort(
          (a, b) =>
            new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime(),
        );
        const latestConfig = sortedConfigs[0];
        const startPoint = latestConfig.config?.startPoint;
        activeStartPoint =
          startPoint?.startAt && typeof startPoint.initialKwh === "number"
            ? {
                startAt: startPoint.startAt,
                initialKwh: Number(startPoint.initialKwh),
              }
            : null;
        setSelectedEnergyConfig({
          maxLoadKw: latestConfig.maxLoadKw ?? null,
          capacityVa: latestConfig.capacityVa ?? null,
          startPoint: activeStartPoint,
        });
      } else {
        setSelectedEnergyConfig(null);
      }

      if (metricResponse.success && metricResponse.data) {
        setRawScopeMetrics(
          metricResponse.data.map((item) => ({
            scopeId: outletId,
            timestamp: item.timestamp,
            deviceId: item.deviceId,
            metricKey: item.metricKey,
            metricValue: Number(item.metricValue ?? 0),
          })),
        );
      } else {
        setRawScopeMetrics([]);
      }

      if (aggregatedResponse.success && aggregatedResponse.data) {
        const hourlyAgg = new Map<string, Map<string, number>>();
        for (const point of aggregatedResponse.data) {
          const tsIso = new Date(point.timestamp).toISOString();
          const metricMap = hourlyAgg.get(tsIso) ?? new Map<string, number>();
          metricMap.set(
            point.metricKey,
            Number(toSafeNumber(point.avg).toFixed(2)),
          );
          hourlyAgg.set(tsIso, metricMap);
        }

        const fmtTs = (tsIso: string) => {
          const d = new Date(tsIso);
          return Number.isNaN(d.getTime())
            ? tsIso
            : `${d.toLocaleDateString("id-ID")} ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })} WIB`;
        };

        const pick = (
          metricMap: Map<string, number>,
          key: string,
        ): number | null => {
          const val = metricMap.get(key);
          return val === undefined ? null : Number(val.toFixed(2));
        };

        setHistoricalReadings(
          Array.from(hourlyAgg.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([hourIso, values]) => ({
              timestampIso: hourIso,
              waktu: fmtTs(hourIso),
              voltageL1: pick(values, "voltage_l1"),
              voltageL2: pick(values, "voltage_l2"),
              voltageL3: pick(values, "voltage_l3"),
              currentL1: pick(values, "current_l1"),
              currentL2: pick(values, "current_l2"),
              currentL3: pick(values, "current_l3"),
              currentTotal: pick(values, "current_total"),
              powerL1: pick(values, "power_l1"),
              powerL2: pick(values, "power_l2"),
              powerL3: pick(values, "power_l3"),
              powerTotal: pick(values, "power_total") ?? pick(values, "power"),
              reactiveL1: pick(values, "reactive_l1"),
              reactiveL2: pick(values, "reactive_l2"),
              reactiveL3: pick(values, "reactive_l3"),
              frequency: pick(values, "frequency"),
              energyTotal: (() => {
                const raw = pick(values, "energy_total");
                if (raw === null) return null;
                return applyStartPointOffset(raw, activeStartPoint, hourIso);
              })(),
            })),
        );
      } else {
        setHistoricalReadings([]);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outlet?.id, filters]);

  useEffect(() => {
    setTablePage(0);
  }, [outlet?.id, filters.from, filters.to]);

  const toSafeNumber = (value: unknown) => {
    const parsed =
      typeof value === "number" ? value : Number(value ?? Number.NaN);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const applyStartPointOffset = useCallback(
    (
      rawValue: number,
      startPoint: { startAt: string; initialKwh: number } | null,
      timestampIso?: string,
    ) => {
      if (!startPoint) return Number(rawValue.toFixed(2));
      const startAt = new Date(startPoint.startAt);
      if (!Number.isNaN(startAt.getTime()) && timestampIso) {
        const ts = new Date(timestampIso);
        if (!Number.isNaN(ts.getTime()) && ts < startAt) {
          return 0;
        }
      }
      return Number(
        Math.max(0, rawValue - toSafeNumber(startPoint.initialKwh)).toFixed(2),
      );
    },
    [],
  );

  const formatKwh = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(toSafeNumber(value));

  const formatReportDate = () =>
    `${new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })} ${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false })} WIB`;

  const loadAggregateComparisonFromOverview = useCallback(async () => {
    if (!filters.from || !filters.to) {
      return {
        avgDailyCurrent: 0,
        avgDailyPrevious: 0,
        avgDailyChange: 0,
        totalCurrentPeriod: 0,
        totalPreviousPeriod: 0,
        totalPeriodChange: 0,
      };
    }

    const currentFrom = new Date(filters.from);
    const currentTo = new Date(filters.to);
    if (
      Number.isNaN(currentFrom.getTime()) ||
      Number.isNaN(currentTo.getTime())
    ) {
      return {
        avgDailyCurrent: 0,
        avgDailyPrevious: 0,
        avgDailyChange: 0,
        totalCurrentPeriod: 0,
        totalPreviousPeriod: 0,
        totalPeriodChange: 0,
      };
    }

    const durationMs = Math.max(1, currentTo.getTime() - currentFrom.getTime());
    const previousTo = new Date(currentFrom.getTime());
    const previousFrom = new Date(currentFrom.getTime() - durationMs);

    const [currentOverview, previousOverview] = await Promise.all([
      energyDashboardApi.getOverview({
        from: currentFrom.toISOString(),
        to: currentTo.toISOString(),
      }),
      energyDashboardApi.getOverview({
        from: previousFrom.toISOString(),
        to: previousTo.toISOString(),
      }),
    ]);

    const totalCurrentPeriod = toSafeNumber(
      currentOverview.data?.globalKpi?.totalEnergy,
    );
    const totalPreviousPeriod = toSafeNumber(
      previousOverview.data?.globalKpi?.totalEnergy,
    );

    const currentDays = Math.max(
      1,
      Math.ceil(
        (currentTo.getTime() - currentFrom.getTime()) / (24 * 60 * 60 * 1000),
      ),
    );
    const previousDays = Math.max(
      1,
      Math.ceil(
        (previousTo.getTime() - previousFrom.getTime()) / (24 * 60 * 60 * 1000),
      ),
    );

    const avgDailyCurrent = totalCurrentPeriod / currentDays;
    const avgDailyPrevious = totalPreviousPeriod / previousDays;
    const avgDailyChange = avgDailyPrevious
      ? ((avgDailyCurrent - avgDailyPrevious) / avgDailyPrevious) * 100
      : 0;
    const totalPeriodChange = totalPreviousPeriod
      ? ((totalCurrentPeriod - totalPreviousPeriod) / totalPreviousPeriod) * 100
      : 0;

    return {
      avgDailyCurrent,
      avgDailyPrevious,
      avgDailyChange,
      totalCurrentPeriod,
      totalPreviousPeriod,
      totalPeriodChange,
    };
  }, [filters.from, filters.to]);

  const latestHistoricalEnergyTotal = useMemo(() => {
    for (let i = historicalReadings.length - 1; i >= 0; i -= 1) {
      const value = historicalReadings[i]?.energyTotal;
      if (value !== null && value !== undefined) {
        return toSafeNumber(value);
      }
    }
    return 0;
  }, [historicalReadings]);

  const hourlyUsageFromHistorical = useMemo(() => {
    return historicalReadings.map((row) => ({
      hour: row.waktu,
      usage: toSafeNumber(row.energyTotal),
    }));
  }, [historicalReadings]);

  const sectionConsumptionFromHistorical = useMemo(() => {
    if (!outlet)
      return [] as Array<{ name: string; kWh: number; value: number }>;

    const latestEnergyByDevice = new Map<
      string,
      { timestamp: number; value: number }
    >();
    for (const metric of rawScopeMetrics) {
      if (metric.metricKey !== "energy_total") continue;
      const ts = new Date(metric.timestamp).getTime();
      if (!Number.isFinite(ts)) continue;
      const current = latestEnergyByDevice.get(metric.deviceId);
      if (!current || ts > current.timestamp) {
        latestEnergyByDevice.set(metric.deviceId, {
          timestamp: ts,
          value: toSafeNumber(metric.metricValue),
        });
      }
    }

    const sectionMap = new Map<string, number>();
    let latestEnergyTimestamp = 0;
    for (const device of outlet.devices) {
      const locationName =
        device.locationName || device.locationType || "Uncategorized";
      const latestEnergyEntry = latestEnergyByDevice.get(device.id);
      const latestEnergy = latestEnergyEntry?.value || 0;
      latestEnergyTimestamp = Math.max(
        latestEnergyTimestamp,
        latestEnergyEntry?.timestamp ?? 0,
      );
      sectionMap.set(
        locationName,
        toSafeNumber((sectionMap.get(locationName) || 0) + latestEnergy),
      );
    }

    const rawTotal = Array.from(sectionMap.values()).reduce(
      (sum, v) => sum + v,
      0,
    );
    const adjustedTotal = applyStartPointOffset(
      rawTotal,
      selectedEnergyConfig?.startPoint ?? null,
      latestEnergyTimestamp
        ? new Date(latestEnergyTimestamp).toISOString()
        : undefined,
    );

    return Array.from(sectionMap.entries())
      .map(([name, rawKwh]) => {
        const ratio = rawTotal > 0 ? rawKwh / rawTotal : 0;
        const adjustedKwh = adjustedTotal * ratio;
        return {
          name,
          kWh: Number(adjustedKwh.toFixed(2)),
          value: adjustedTotal > 0 ? Number((ratio * 100).toFixed(2)) : 0,
        };
      })
      .sort((a, b) => b.kWh - a.kWh);
  }, [
    outlet,
    rawScopeMetrics,
    selectedEnergyConfig?.startPoint,
    applyStartPointOffset,
  ]);

  const peakPowerFromHistorical = useMemo(() => {
    let peak = 0;
    for (const row of historicalReadings) {
      peak = Math.max(peak, toSafeNumber(row.powerTotal));
    }
    return Number(peak.toFixed(2));
  }, [historicalReadings]);

  const loadAggregatedExportDataset = async () => {
    if (!outlets.length) {
      return {
        aggregatedReadings: [] as HistoricalRow[],
        aggregatedHourlyUsage: [] as Array<{ hour: string; usage: number }>,
        outletBreakdown: [] as Array<{
          outlet: string;
          kWh: number;
          devices: number;
        }>,
        deviceRows: [] as Array<Record<string, string | number>>,
        totalEnergy: 0,
        peakPower: 0,
        scopeStartPointMap: new Map<
          string,
          { startAt: string; initialKwh: number }
        >(),
      };
    }

    if (!filters.from || !filters.to) {
      return {
        aggregatedReadings: [] as HistoricalRow[],
        aggregatedHourlyUsage: [] as Array<{ hour: string; usage: number }>,
        outletBreakdown: [] as Array<{
          outlet: string;
          kWh: number;
          devices: number;
        }>,
        deviceRows: [] as Array<Record<string, string | number>>,
        totalEnergy: 0,
        peakPower: 0,
        scopeStartPointMap: new Map<
          string,
          { startAt: string; initialKwh: number }
        >(),
      };
    }

    const aggregatedMetricsResponse = await deviceMetricsApi.getAggregated({
      moduleType: "power_meter",
      from: filters.from,
      to: filters.to,
      interval: "hour",
    });

    const configResponses = await Promise.all(
      outlets.map((o) => energyConfigsApi.getAll(o.id)),
    );

    const scopeStartPointMap = new Map<
      string,
      { startAt: string; initialKwh: number }
    >();
    configResponses.forEach((res, index) => {
      const scopeId = outlets[index]?.id;
      if (!scopeId || !res.success || !res.data?.length) return;
      const latestConfig = [...res.data].sort(
        (a, b) =>
          new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime(),
      )[0];
      const sp = latestConfig?.config?.startPoint;
      if (sp?.startAt && typeof sp.initialKwh === "number") {
        scopeStartPointMap.set(scopeId, {
          startAt: sp.startAt,
          initialKwh: Number(sp.initialKwh),
        });
      }
    });

    const hourlyAgg = new Map<string, Map<string, number>>();
    if (aggregatedMetricsResponse.success && aggregatedMetricsResponse.data) {
      for (const row of aggregatedMetricsResponse.data) {
        const tsIso = new Date(row.timestamp).toISOString();
        const metricMap = hourlyAgg.get(tsIso) ?? new Map<string, number>();
        metricMap.set(row.metricKey, Number(toSafeNumber(row.avg).toFixed(2)));
        hourlyAgg.set(tsIso, metricMap);
      }
    }

    const toMetricValue = (
      metricMap: Map<string, number>,
      metricKey: string,
    ): number | null => {
      const value = metricMap.get(metricKey);
      return value === undefined ? null : Number(value.toFixed(2));
    };

    const fmtTs = (tsIso: string) => {
      const d = new Date(tsIso);
      return Number.isNaN(d.getTime())
        ? tsIso
        : `${d.toLocaleDateString("id-ID")} ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })} WIB`;
    };

    const aggregatedReadings: HistoricalRow[] = Array.from(hourlyAgg.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hourIso, values]) => ({
        timestampIso: hourIso,
        waktu: fmtTs(hourIso),
        voltageL1: toMetricValue(values, "voltage_l1"),
        voltageL2: toMetricValue(values, "voltage_l2"),
        voltageL3: toMetricValue(values, "voltage_l3"),
        currentL1: toMetricValue(values, "current_l1"),
        currentL2: toMetricValue(values, "current_l2"),
        currentL3: toMetricValue(values, "current_l3"),
        currentTotal: toMetricValue(values, "current_total"),
        powerL1: toMetricValue(values, "power_l1"),
        powerL2: toMetricValue(values, "power_l2"),
        powerL3: toMetricValue(values, "power_l3"),
        powerTotal:
          toMetricValue(values, "power_total") ??
          toMetricValue(values, "power"),
        reactiveL1: toMetricValue(values, "reactive_l1"),
        reactiveL2: toMetricValue(values, "reactive_l2"),
        reactiveL3: toMetricValue(values, "reactive_l3"),
        frequency: toMetricValue(values, "frequency"),
        energyTotal: (() => {
          const raw = toMetricValue(values, "energy_total");
          if (raw === null) return null;
          const offset = Array.from(scopeStartPointMap.values()).reduce(
            (sum, sp) =>
              sum +
              (new Date(hourIso) >= new Date(sp.startAt)
                ? toSafeNumber(sp.initialKwh)
                : 0),
            0,
          );
          return Number(Math.max(0, raw - offset).toFixed(2));
        })(),
      }));

    const aggregatedHourlyUsage = aggregatedReadings.map((row) => ({
      hour: row.waktu,
      usage: toSafeNumber(row.energyTotal),
    }));

    const outletBreakdown = outlets
      .map((o) => {
        const kWh = toSafeNumber(o.kpiData?.totalUsage);
        return {
          outlet: o.name,
          kWh: Number(kWh.toFixed(2)),
          devices: o.devices.length,
        };
      })
      .sort((a, b) => b.kWh - a.kWh);

    const deviceRows = outlets.flatMap((o) =>
      o.devices.map((d) => ({
        outlet: o.name,
        deviceId: d.id,
        deviceName: d.name,
        serialNo: d.serialNo,
        location: d.locationName || "-",
        locationType: d.locationType || "-",
        status: d.status,
        lastSeen: d.lastSeenAt || "-",
        modules: d.moduleTypes.join(", ") || "-",
      })),
    );

    const totalEnergy = (() => {
      for (let i = aggregatedReadings.length - 1; i >= 0; i -= 1) {
        const value = aggregatedReadings[i]?.energyTotal;
        if (value !== null && value !== undefined) return toSafeNumber(value);
      }
      return 0;
    })();

    const peakPower = aggregatedReadings.reduce(
      (max, row) => Math.max(max, toSafeNumber(row.powerTotal)),
      0,
    );

    return {
      aggregatedReadings,
      aggregatedHourlyUsage,
      outletBreakdown,
      deviceRows,
      totalEnergy: Number(totalEnergy.toFixed(2)),
      peakPower: Number(peakPower.toFixed(2)),
      scopeStartPointMap,
    };
  };

  const handleExportExcel = async () => {
    if (!outlets.length) return;
    const fmtNum = (v: number | null) =>
      v !== null ? Number(v.toFixed(2)) : "-";

    if (exportMode === "selected") {
      if (!outlet) return;

      await exportToExcel(
        `laporan-listrik-${outlet.name}-${new Date().toISOString().slice(0, 10)}.xlsx`,
        [
          {
            name: "Info Outlet",
            rows: [
              {
                "Scope / Outlet": outlet.name,
                Tenant: selectedScopeDetail?.tenant?.name || "-",
                Region: outlet.region,
                Kota: outlet.city || "-",
                Alamat: outlet.address || "-",
                "Scope Type": selectedScopeDetail?.scopeType || "-",
                Periode: periodLabel,
                "Tanggal Cetak": formatReportDate(),
                "Energy Total kWh (historical terakhir)":
                  latestHistoricalEnergyTotal,
                "Peak Power (historical, kW)": peakPowerFromHistorical,
                "Kapasitas Maks (kW)":
                  selectedEnergyConfig?.maxLoadKw ?? outlet.maxLoad ?? "-",
                "Kapasitas (VA)": selectedEnergyConfig?.capacityVa ?? "-",
                "Starting Point": selectedEnergyConfig?.startPoint
                  ? new Date(
                      selectedEnergyConfig.startPoint.startAt,
                    ).toLocaleString("id-ID")
                  : "-",
                "Initial kWh": selectedEnergyConfig?.startPoint
                  ? selectedEnergyConfig.startPoint.initialKwh
                  : "-",
                "Jumlah Device": outlet.devices.length,
              },
            ],
          },
          {
            name: "Info Device",
            rows: outlet.devices.map((device) => ({
              "Device ID": device.id,
              "Device Name": device.name,
              "Serial No": device.serialNo,
              Lokasi: device.locationName || "-",
              "Tipe Lokasi": device.locationType || "-",
              Status: device.status,
              "Last Seen": device.lastSeenAt || "-",
              "Module Types": device.moduleTypes.join(", "),
            })),
          },
          {
            name: "Riwayat Pengukuran",
            rows: historicalReadings.map((r) => ({
              Waktu: r.waktu,
              "Voltage L1 (V)": fmtNum(r.voltageL1),
              "Voltage L2 (V)": fmtNum(r.voltageL2),
              "Voltage L3 (V)": fmtNum(r.voltageL3),
              "Current L1 (A)": fmtNum(r.currentL1),
              "Current L2 (A)": fmtNum(r.currentL2),
              "Current L3 (A)": fmtNum(r.currentL3),
              "Current Total (A)": fmtNum(r.currentTotal),
              "Power L1 (W)": fmtNum(r.powerL1),
              "Power L2 (W)": fmtNum(r.powerL2),
              "Power L3 (W)": fmtNum(r.powerL3),
              "Power Total (W)": fmtNum(r.powerTotal),
              "Reactive L1 (VAr)": fmtNum(r.reactiveL1),
              "Reactive L2 (VAr)": fmtNum(r.reactiveL2),
              "Reactive L3 (VAr)": fmtNum(r.reactiveL3),
              "Frequency (Hz)": fmtNum(r.frequency),
              "Energy Total (kWh)": fmtNum(r.energyTotal),
            })),
          },
          {
            name: "Penggunaan per Jam",
            rows: hourlyUsageFromHistorical.map((h) => ({
              Jam: h.hour,
              "Energy Total (kWh)": h.usage,
            })),
          },
          {
            name: "Konsumsi per Bagian",
            rows: sectionConsumptionFromHistorical.map((s) => ({
              Bagian: s.name,
              "Persentase (%)": s.value,
              kWh: s.kWh,
            })),
          },
        ],
      );
      return;
    }

    const aggregated = await loadAggregatedExportDataset();
    const {
      avgDailyCurrent,
      avgDailyPrevious,
      avgDailyChange,
      totalCurrentPeriod,
      totalPreviousPeriod,
      totalPeriodChange,
    } = await loadAggregateComparisonFromOverview();

    await exportToExcel(
      `laporan-listrik-aggregate-${new Date().toISOString().slice(0, 10)}.xlsx`,
      [
        {
          name: "Info Aggregate",
          rows: [
            {
              "Jumlah Outlet": outlets.length,
              "Total Device": outlets.reduce(
                (sum, o) => sum + o.devices.length,
                0,
              ),
              Periode: periodLabel,
              "Tanggal Cetak": formatReportDate(),
              "Energy Total kWh (historical terakhir)": aggregated.totalEnergy,
              "Peak Power (historical, kW)": aggregated.peakPower,
              "Mode Agregasi":
                "Voltage/Frequency = Average, lainnya = Penjumlahan",
              "Outlet dengan Starting Point":
                aggregated.scopeStartPointMap.size,
            },
          ],
        },
        {
          name: "Info Device",
          rows: aggregated.deviceRows,
        },
        {
          name: "Riwayat Pengukuran",
          rows: aggregated.aggregatedReadings.map((r) => ({
            Waktu: r.waktu,
            "Voltage L1 (V)": fmtNum(r.voltageL1),
            "Voltage L2 (V)": fmtNum(r.voltageL2),
            "Voltage L3 (V)": fmtNum(r.voltageL3),
            "Current L1 (A)": fmtNum(r.currentL1),
            "Current L2 (A)": fmtNum(r.currentL2),
            "Current L3 (A)": fmtNum(r.currentL3),
            "Current Total (A)": fmtNum(r.currentTotal),
            "Power L1 (W)": fmtNum(r.powerL1),
            "Power L2 (W)": fmtNum(r.powerL2),
            "Power L3 (W)": fmtNum(r.powerL3),
            "Power Total (W)": fmtNum(r.powerTotal),
            "Reactive L1 (VAr)": fmtNum(r.reactiveL1),
            "Reactive L2 (VAr)": fmtNum(r.reactiveL2),
            "Reactive L3 (VAr)": fmtNum(r.reactiveL3),
            "Frequency (Hz)": fmtNum(r.frequency),
            "Energy Total (kWh)": fmtNum(r.energyTotal),
          })),
        },
        {
          name: "Penggunaan per Jam",
          rows: aggregated.aggregatedHourlyUsage.map((h) => ({
            Jam: h.hour,
            "Energy Total (kWh)": h.usage,
          })),
        },
        {
          name: "Konsumsi per Outlet",
          rows: aggregated.outletBreakdown.map((s) => ({
            Outlet: s.outlet,
            "Total Device": s.devices,
            kWh: s.kWh,
          })),
        },
        {
          name: "Perbandingan",
          rows: [
            {
              Metrik: "Rata-rata Harian - Periode Ini",
              kWh: Number(avgDailyCurrent.toFixed(2)),
            },
            {
              Metrik: "Rata-rata Harian - Periode Sebelumnya",
              kWh: Number(avgDailyPrevious.toFixed(2)),
            },
            {
              Metrik: "Perubahan Rata-rata Harian (%)",
              kWh: Number(avgDailyChange.toFixed(2)),
            },
            {
              Metrik: "Total Periode Ini",
              kWh: Number(totalCurrentPeriod.toFixed(2)),
            },
            {
              Metrik: "Total Periode Sebelumnya",
              kWh: Number(totalPreviousPeriod.toFixed(2)),
            },
            {
              Metrik: "Perubahan Total Periode (%)",
              kWh: Number(totalPeriodChange.toFixed(2)),
            },
          ],
        },
      ],
    );
  };

  const handleExportPdf = async () => {
    if (!outlets.length) return;
    const fmtNum = (v: number | null) => (v !== null ? v.toFixed(2) : "-");

    if (exportMode === "selected") {
      if (!outlet) return;

      await exportToPdf({
        fileName: `laporan-listrik-${outlet.name}-${new Date().toISOString().slice(0, 10)}.pdf`,
        title: "Laporan Monitoring Listrik",
        scopeName: outlet.name,
        tenantName: selectedScopeDetail?.tenant?.name || outlet.region,
        period: periodLabel,
        generatedAt: formatReportDate(),
        summary: [
          `Energy Total (historical terakhir): ${formatKwh(latestHistoricalEnergyTotal)} kWh`,
          `Peak (historical): ${formatKwh(peakPowerFromHistorical)} kW | Kapasitas Maks: ${selectedEnergyConfig?.maxLoadKw ?? outlet.maxLoad ?? "N/A"} kW`,
          selectedEnergyConfig?.startPoint
            ? `Starting Point: ${new Date(selectedEnergyConfig.startPoint.startAt).toLocaleString("id-ID")} WIB, Initial ${selectedEnergyConfig.startPoint.initialKwh} kWh`
            : "Starting Point: -",
          `Kapasitas VA: ${selectedEnergyConfig?.capacityVa ?? "N/A"} | Tenant: ${selectedScopeDetail?.tenant?.name || "-"}`,
          `Total Data Pengukuran: ${historicalReadings.length} pembacaan`,
        ],
        tables: [
          {
            title: "Riwayat Pengukuran",
            columns: [
              "Waktu",
              "V L1",
              "V L2",
              "V L3",
              "I L1",
              "I L2",
              "I L3",
              "I Tot",
              "P L1",
              "P L2",
              "P L3",
              "P Tot",
              "Q L1",
              "Q L2",
              "Q L3",
              "Hz",
              "kWh",
            ],
            rows: historicalReadings.map((r) => [
              r.waktu,
              fmtNum(r.voltageL1),
              fmtNum(r.voltageL2),
              fmtNum(r.voltageL3),
              fmtNum(r.currentL1),
              fmtNum(r.currentL2),
              fmtNum(r.currentL3),
              fmtNum(r.currentTotal),
              fmtNum(r.powerL1),
              fmtNum(r.powerL2),
              fmtNum(r.powerL3),
              fmtNum(r.powerTotal),
              fmtNum(r.reactiveL1),
              fmtNum(r.reactiveL2),
              fmtNum(r.reactiveL3),
              fmtNum(r.frequency),
              fmtNum(r.energyTotal),
            ]),
          },
          {
            title: "Penggunaan Listrik per Jam",
            columns: ["Jam", "Energy Total (kWh)"],
            rows: hourlyUsageFromHistorical.map((h) => [h.hour, h.usage]),
          },
          {
            title: "Konsumsi per Bagian",
            columns: ["Bagian", "Persentase (%)", "kWh"],
            rows: sectionConsumptionFromHistorical.map((s) => [
              s.name,
              s.value,
              s.kWh,
            ]),
          },
          {
            title: "Info Device",
            columns: [
              "Device ID",
              "Nama",
              "Serial",
              "Lokasi",
              "Tipe Lokasi",
              "Status",
              "Last Seen",
              "Modules",
            ],
            rows: outlet.devices.map((device) => [
              device.id,
              device.name,
              device.serialNo,
              device.locationName || "-",
              device.locationType || "-",
              device.status,
              device.lastSeenAt || "-",
              device.moduleTypes.join(", "),
            ]),
          },
        ],
      });
      return;
    }

    const aggregated = await loadAggregatedExportDataset();
    const {
      avgDailyCurrent,
      avgDailyPrevious,
      avgDailyChange,
      totalCurrentPeriod,
      totalPreviousPeriod,
      totalPeriodChange,
    } = await loadAggregateComparisonFromOverview();

    await exportToPdf({
      fileName: `laporan-listrik-aggregate-${new Date().toISOString().slice(0, 10)}.pdf`,
      title: "Laporan Monitoring Listrik (Aggregate Outlet)",
      scopeName: `Semua Outlet (${outlets.length})`,
      tenantName: "Multi Tenant / Multi Outlet",
      period: periodLabel,
      generatedAt: formatReportDate(),
      summary: [
        `Energy Total (historical terakhir): ${formatKwh(aggregated.totalEnergy)} kWh`,
        `Peak (historical): ${formatKwh(aggregated.peakPower)} kW`,
        `Jumlah Outlet: ${outlets.length} | Jumlah Device: ${outlets.reduce((sum, o) => sum + o.devices.length, 0)}`,
        `Mode agregasi: Voltage/Frequency = Average, metrik lain = Penjumlahan`,
        `Outlet dengan starting point: ${aggregated.scopeStartPointMap.size}`,
        `Total Data Pengukuran: ${aggregated.aggregatedReadings.length} pembacaan`,
      ],
      tables: [
        {
          title: "Riwayat Pengukuran",
          columns: [
            "Waktu",
            "V L1",
            "V L2",
            "V L3",
            "I L1",
            "I L2",
            "I L3",
            "I Tot",
            "P L1",
            "P L2",
            "P L3",
            "P Tot",
            "Q L1",
            "Q L2",
            "Q L3",
            "Hz",
            "kWh",
          ],
          rows: aggregated.aggregatedReadings.map((r) => [
            r.waktu,
            fmtNum(r.voltageL1),
            fmtNum(r.voltageL2),
            fmtNum(r.voltageL3),
            fmtNum(r.currentL1),
            fmtNum(r.currentL2),
            fmtNum(r.currentL3),
            fmtNum(r.currentTotal),
            fmtNum(r.powerL1),
            fmtNum(r.powerL2),
            fmtNum(r.powerL3),
            fmtNum(r.powerTotal),
            fmtNum(r.reactiveL1),
            fmtNum(r.reactiveL2),
            fmtNum(r.reactiveL3),
            fmtNum(r.frequency),
            fmtNum(r.energyTotal),
          ]),
        },
        {
          title: "Penggunaan Listrik per Jam",
          columns: ["Jam", "Energy Total (kWh)"],
          rows: aggregated.aggregatedHourlyUsage.map((h) => [h.hour, h.usage]),
        },
        {
          title: "Konsumsi per Outlet",
          columns: ["Outlet", "Total Device", "kWh"],
          rows: aggregated.outletBreakdown.map((s) => [
            s.outlet,
            s.devices,
            s.kWh,
          ]),
        },
        {
          title: "Info Device",
          columns: [
            "Device ID",
            "Nama",
            "Serial",
            "Lokasi",
            "Tipe Lokasi",
            "Status",
            "Last Seen",
            "Modules",
          ],
          rows: aggregated.deviceRows.map((device) => [
            String(device.deviceId),
            String(device.deviceName),
            String(device.serialNo),
            String(device.location),
            String(device.locationType),
            String(device.status),
            String(device.lastSeen),
            String(device.modules),
          ]),
        },
        {
          title: "Perbandingan Penggunaan",
          columns: ["Metrik", "Nilai (kWh)", "Perubahan (%)"],
          rows: [
            [
              "Rata-rata Harian - Periode Ini",
              Number(avgDailyCurrent.toFixed(2)),
              Number(avgDailyChange.toFixed(2)),
            ],
            [
              "Rata-rata Harian - Periode Sebelumnya",
              Number(avgDailyPrevious.toFixed(2)),
              "-",
            ],
            [
              "Total Periode Ini",
              Number(totalCurrentPeriod.toFixed(2)),
              Number(totalPeriodChange.toFixed(2)),
            ],
            [
              "Total Periode Sebelumnya",
              Number(totalPreviousPeriod.toFixed(2)),
              "-",
            ],
          ],
        },
      ],
    });
  };

  const fmtNum = (v: number | null) => (v !== null ? v.toFixed(2) : "-");

  return (
    <PageTransition>
      <motion.div
        className="space-y-4 max-w-7xl mx-auto px-4 pb-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm"
        >
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Laporan &amp; Export
            </h1>
            <p className="text-sm text-muted-foreground">
              Export data monitoring listrik dalam format PDF atau Excel
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-[220px_1fr_auto] xl:items-center">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Mode Export
              </p>
              <Select
                value={exportMode}
                onValueChange={(value) => setExportMode(value as ExportMode)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Mode Export" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aggregate">
                    Aggregate Semua Outlet
                  </SelectItem>
                  <SelectItem value="selected">Outlet Terpilih</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Outlet Preview
              </p>
              <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Outlet" />
                </SelectTrigger>
                <SelectContent>
                  {outlets.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        <span>{o.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {o.region}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <EnergyExportActions
              onExportPdf={handleExportPdf}
              onExportExcel={handleExportExcel}
              disabled={
                !outlets.length ||
                loading ||
                (exportMode === "selected" && !outlet)
              }
            />
          </div>
        </motion.div>

        {/* Period Filter */}
        <motion.div variants={itemVariants}>
          <EnergyPeriodFilter
            period={period}
            onPresetChange={handlePresetChange}
            onFromChange={(value) =>
              setPeriod((current) => ({
                ...current,
                preset: "custom",
                from: value,
              }))
            }
            onToChange={(value) =>
              setPeriod((current) => ({
                ...current,
                preset: "custom",
                to: value,
              }))
            }
            onApply={handleApply}
            onReset={handleReset}
          />
        </motion.div>

        {!outlet ? (
          <div className="p-4 text-sm text-muted-foreground">
            {loading ? "Memuat data..." : "Tidak ada data outlet"}
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Energy Total (Historical)
                      </p>
                      <p className="text-lg font-bold">
                        {formatKwh(latestHistoricalEnergyTotal)} kWh
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Tenant / Lokasi
                      </p>
                      <p className="text-lg font-bold">
                        {selectedScopeDetail?.tenant?.name || "-"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {outlet.city || outlet.region || "-"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Gauge className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Peak Power (Historical)
                      </p>
                      <p className="text-lg font-bold">
                        {formatKwh(peakPowerFromHistorical)} kW
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Device / Kapasitas
                      </p>
                      <p className="text-lg font-bold">
                        {outlet.devices.length} device
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {selectedEnergyConfig?.capacityVa
                          ? `Capacity ${formatKwh(selectedEnergyConfig.capacityVa)} VA`
                          : "Capacity -"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Data Preview: Historical Readings */}
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileText className="h-4 w-4" />
                        Tabel Riwayat Pengukuran
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        Periode: {periodLabel} &middot;{" "}
                        {historicalReadings.length} data per jam
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={tableMetricFilter}
                        onValueChange={(v) => {
                          setTableMetricFilter(v as MetricGroup | "all");
                          setTablePage(0);
                        }}
                      >
                        <SelectTrigger className="w-[180px] h-8 text-xs">
                          <SelectValue placeholder="Semua Metrik" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua Metrik</SelectItem>
                          {METRIC_GROUP_OPTIONS.map((g) => (
                            <SelectItem key={g.key} value={g.key}>
                              {g.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Cari waktu..."
                          className="pl-8 h-8 text-xs w-[180px]"
                          value={tableSearch}
                          onChange={(e) => {
                            setTableSearch(e.target.value);
                            setTablePage(0);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const cols = METRIC_COLUMNS[tableMetricFilter];
                    const searchLower = tableSearch.toLowerCase();
                    const filtered = [...historicalReadings]
                      .reverse()
                      .filter(
                        (r) =>
                          !tableSearch ||
                          r.waktu.toLowerCase().includes(searchLower),
                      );
                    const totalPages = Math.max(
                      1,
                      Math.ceil(filtered.length / TABLE_PAGE_SIZE),
                    );
                    const pageData = filtered.slice(
                      tablePage * TABLE_PAGE_SIZE,
                      (tablePage + 1) * TABLE_PAGE_SIZE,
                    );

                    if (historicalReadings.length === 0) {
                      return (
                        <div className="h-[120px] flex items-center justify-center text-sm text-muted-foreground">
                          Tidak ada data untuk periode ini
                        </div>
                      );
                    }

                    return (
                      <>
                        <div className="rounded-lg border bg-card/60">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Waktu</TableHead>
                                {cols.map((c) => (
                                  <TableHead
                                    key={c.key}
                                    className="text-xs text-right"
                                  >
                                    {c.label}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pageData.map((row, idx) => (
                                <TableRow key={`${row.waktu}-${idx}`}>
                                  <TableCell className="text-xs font-medium">
                                    {row.waktu}
                                  </TableCell>
                                  {cols.map((c) => (
                                    <TableCell
                                      key={c.key}
                                      className="text-xs text-right tabular-nums"
                                    >
                                      {fmtNum(row[c.key] as number | null)}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <p className="text-xs text-muted-foreground">
                            {filtered.length} data
                            {tableSearch ? " (difilter)" : ""} — Halaman{" "}
                            {tablePage + 1} dari {totalPages}
                          </p>
                          <div className="flex gap-1">
                            <button
                              onClick={() =>
                                setTablePage((p) => Math.max(0, p - 1))
                              }
                              disabled={tablePage === 0}
                              className="px-3 py-1 text-xs rounded border disabled:opacity-50 hover:bg-muted transition-colors"
                            >
                              Sebelumnya
                            </button>
                            <button
                              onClick={() =>
                                setTablePage((p) =>
                                  Math.min(totalPages - 1, p + 1),
                                )
                              }
                              disabled={tablePage >= totalPages - 1}
                              className="px-3 py-1 text-xs rounded border disabled:opacity-50 hover:bg-muted transition-colors"
                            >
                              Berikutnya
                            </button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </motion.div>

            {/* Data Preview: Hourly + Section + Comparison */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-1 lg:grid-cols-2 gap-4"
            >
              {/* Hourly Usage */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Activity className="h-4 w-4 text-blue-500" />
                    Penggunaan per Jam
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border max-h-[250px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Jam</TableHead>
                          <TableHead className="text-xs text-right">
                            Energy Total (kWh)
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hourlyUsageFromHistorical.length ? (
                          hourlyUsageFromHistorical.map((h, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-xs">
                                {h.hour}
                              </TableCell>
                              <TableCell className="text-xs text-right tabular-nums">
                                {h.usage}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={2}
                              className="h-24 text-center text-xs text-muted-foreground"
                            >
                              Tidak ada data untuk periode ini
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Section Consumption */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Store className="h-4 w-4 text-emerald-500" />
                    Konsumsi per Bagian
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border max-h-[250px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Bagian</TableHead>
                          <TableHead className="text-xs text-right">
                            %
                          </TableHead>
                          <TableHead className="text-xs text-right">
                            kWh
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sectionConsumptionFromHistorical.length ? (
                          sectionConsumptionFromHistorical.map((s, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-xs">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={cn(
                                      "w-2 h-2 rounded-full",
                                      SECTION_DOT_CLASSES[
                                        i % SECTION_DOT_CLASSES.length
                                      ],
                                    )}
                                  />
                                  {s.name}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-right tabular-nums">
                                {s.value}%
                              </TableCell>
                              <TableCell className="text-xs text-right tabular-nums">
                                {s.kWh}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={3}
                              className="h-24 text-center text-xs text-muted-foreground"
                            >
                              Tidak ada data untuk periode ini
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </motion.div>
    </PageTransition>
  );
}
