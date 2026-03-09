"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  Bell,
  Building2,
  Gauge,
  MapPin,
  Package,
  Search,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageTransition } from "@/components/ui/page-transition";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
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
  alertEventsApi,
  devicesApi,
  deviceMetricsApi,
  energyConfigsApi,
  energyDashboardApi,
  scopesApi,
  type EnergyOutletDetail,
} from "@/lib/api";
import {
  buildEnergyFilters,
  createEnergyPeriod,
  formatCompactNumber,
  formatDateTime,
  normalizeEnergyPeriod,
  type EnergyPeriodState,
  type EnergyPreset,
} from "@/lib/energy-monitoring";
import { exportToExcel, exportToPdf } from "@/lib/report-export";
import { EnergyExportActions } from "@/components/dashboard/EnergyExportActions";
import { EnergyPeriodFilter } from "@/components/dashboard/EnergyPeriodFilter";
import { cn } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
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
  reactiveL1: number | null;
  reactiveL2: number | null;
  reactiveL3: number | null;
  frequency: number | null;
  energyTotal: number | null;
};

type MetricGroup =
  | "all"
  | "voltage"
  | "current"
  | "power"
  | "reactive"
  | "energy";

const METRIC_GROUPS: {
  key: Exclude<MetricGroup, "all">;
  label: string;
  lines: { dataKey: keyof HistoricalReading; name: string; color: string }[];
}[] = [
  {
    key: "voltage",
    label: "Tegangan",
    lines: [
      { dataKey: "voltageL1", name: "V L1", color: "#3b82f6" },
      { dataKey: "voltageL2", name: "V L2", color: "#10b981" },
      { dataKey: "voltageL3", name: "V L3", color: "#f59e0b" },
    ],
  },
  {
    key: "current",
    label: "Arus",
    lines: [
      { dataKey: "currentL1", name: "I L1", color: "#3b82f6" },
      { dataKey: "currentL2", name: "I L2", color: "#10b981" },
      { dataKey: "currentL3", name: "I L3", color: "#f59e0b" },
      { dataKey: "currentTotal", name: "I Total", color: "#8b5cf6" },
    ],
  },
  {
    key: "power",
    label: "Daya",
    lines: [
      { dataKey: "powerL1", name: "P L1", color: "#3b82f6" },
      { dataKey: "powerL2", name: "P L2", color: "#10b981" },
      { dataKey: "powerL3", name: "P L3", color: "#f59e0b" },
      { dataKey: "powerTotal", name: "P Total", color: "#8b5cf6" },
    ],
  },
  {
    key: "reactive",
    label: "Reaktif",
    lines: [
      { dataKey: "reactiveL1", name: "Q L1", color: "#3b82f6" },
      { dataKey: "reactiveL2", name: "Q L2", color: "#10b981" },
      { dataKey: "reactiveL3", name: "Q L3", color: "#f59e0b" },
    ],
  },
  {
    key: "energy",
    label: "Energi",
    lines: [
      { dataKey: "frequency", name: "Hz", color: "#3b82f6" },
      { dataKey: "energyTotal", name: "Energy (kWh)", color: "#f97316" },
    ],
  },
];

const getPresetFromSearchParams = (
  from: string | null,
  to: string | null,
): EnergyPeriodState => {
  if (!from || !to) {
    return createEnergyPeriod("today");
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return createEnergyPeriod("today");
  }

  const pad = (value: number) => value.toString().padStart(2, "0");
  const toInputValue = (value: Date) =>
    `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;

  return {
    preset: "custom",
    from: toInputValue(fromDate),
    to: toInputValue(toDate),
  };
};

type RawMetric = {
  timestamp: string;
  metricKey: string;
  metricValue: number;
};

type RawScopedMetric = {
  timestamp: string;
  deviceId: string;
  metricKey: string;
  metricValue: number;
};

const mapMetricsToReadings = (metrics: RawMetric[]): HistoricalReading[] => {
  const grouped = new Map<string, Map<string, number>>();

  for (const metric of metrics) {
    if (!grouped.has(metric.timestamp)) {
      grouped.set(metric.timestamp, new Map());
    }
    grouped.get(metric.timestamp)!.set(metric.metricKey, metric.metricValue);
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ts, values]) => {
      const date = new Date(ts);
      return {
        timestamp: ts,
        label: Number.isNaN(date.getTime())
          ? ts
          : `${date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} ${date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false })}`,
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
        reactiveL1: values.get("reactive_l1") ?? null,
        reactiveL2: values.get("reactive_l2") ?? null,
        reactiveL3: values.get("reactive_l3") ?? null,
        frequency: values.get("frequency") ?? null,
        energyTotal: values.get("energy_total") ?? null,
      };
    });
};

const mapMetricsToHourlyReadings = (
  metrics: RawScopedMetric[],
  fromIso?: string,
  toIso?: string,
): HistoricalReading[] => {
  const latestMetricPerHourDevice = new Map<string, RawScopedMetric>();

  for (const metric of metrics) {
    const ts = new Date(metric.timestamp);
    if (Number.isNaN(ts.getTime())) continue;

    const hourStart = new Date(ts);
    hourStart.setMinutes(0, 0, 0);
    const hourIso = hourStart.toISOString();
    const key = `${hourIso}|${metric.deviceId}|${metric.metricKey}`;

    const current = latestMetricPerHourDevice.get(key);
    if (!current || new Date(metric.timestamp).getTime() > new Date(current.timestamp).getTime()) {
      latestMetricPerHourDevice.set(key, metric);
    }
  }

  const hourlyMap = new Map<string, Map<string, { sum: number; count: number }>>();
  for (const metric of latestMetricPerHourDevice.values()) {
    const ts = new Date(metric.timestamp);
    if (Number.isNaN(ts.getTime())) continue;
    const hourStart = new Date(ts);
    hourStart.setMinutes(0, 0, 0);
    const hourIso = hourStart.toISOString();

    if (!hourlyMap.has(hourIso)) {
      hourlyMap.set(hourIso, new Map());
    }

    const values = hourlyMap.get(hourIso)!;
    const current = values.get(metric.metricKey) ?? { sum: 0, count: 0 };
    current.sum += Number(metric.metricValue ?? 0);
    current.count += 1;
    values.set(metric.metricKey, current);
  }

  const averageKeys = new Set([
    "voltage_l1",
    "voltage_l2",
    "voltage_l3",
    "frequency",
  ]);

  const pickValue = (
    values: Map<string, { sum: number; count: number }>,
    key: string,
  ): number | null => {
    const agg = values.get(key);
    if (!agg || agg.count === 0) return null;
    if (averageKeys.has(key)) {
      return Number((agg.sum / agg.count).toFixed(2));
    }
    return Number(agg.sum.toFixed(2));
  };

  const hourSlots: string[] = [];
  const parsedFrom = fromIso ? new Date(fromIso) : null;
  const parsedTo = toIso ? new Date(toIso) : null;
  const hasValidRange =
    parsedFrom &&
    parsedTo &&
    !Number.isNaN(parsedFrom.getTime()) &&
    !Number.isNaN(parsedTo.getTime());

  if (hasValidRange) {
    const start = new Date(parsedFrom as Date);
    start.setMinutes(0, 0, 0);
    const end = new Date(parsedTo as Date);
    end.setMinutes(0, 0, 0);

    for (let cursor = start.getTime(); cursor <= end.getTime(); cursor += 60 * 60 * 1000) {
      hourSlots.push(new Date(cursor).toISOString());
    }
  } else {
    hourSlots.push(
      ...Array.from(hourlyMap.keys()).sort((a, b) => a.localeCompare(b)),
    );
  }

  return hourSlots.map((hourIso) => {
    const values = hourlyMap.get(hourIso) ?? new Map<string, { sum: number; count: number }>();
    const d = new Date(hourIso);
    const label = Number.isNaN(d.getTime())
      ? hourIso
      : `${d.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })} ${d.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}`;

    return {
      timestamp: hourIso,
      label,
      voltageL1: pickValue(values, "voltage_l1"),
      voltageL2: pickValue(values, "voltage_l2"),
      voltageL3: pickValue(values, "voltage_l3"),
      currentL1: pickValue(values, "current_l1"),
      currentL2: pickValue(values, "current_l2"),
      currentL3: pickValue(values, "current_l3"),
      currentTotal: pickValue(values, "current_total"),
      powerL1: pickValue(values, "power_l1"),
      powerL2: pickValue(values, "power_l2"),
      powerL3: pickValue(values, "power_l3"),
      powerTotal: pickValue(values, "power_total") ?? pickValue(values, "power"),
      reactiveL1: pickValue(values, "reactive_l1"),
      reactiveL2: pickValue(values, "reactive_l2"),
      reactiveL3: pickValue(values, "reactive_l3"),
      frequency: pickValue(values, "frequency"),
      energyTotal: pickValue(values, "energy_total"),
    };
  });
};

export default function ElectricityOutletDetailPage() {
  const params = useParams<{ scopeId: string }>();
  const searchParams = useSearchParams();
  const [period, setPeriod] = useState<EnergyPeriodState>(() =>
    getPresetFromSearchParams(searchParams.get("from"), searchParams.get("to")),
  );
  const [appliedPeriod, setAppliedPeriod] = useState<EnergyPeriodState>(() =>
    getPresetFromSearchParams(searchParams.get("from"), searchParams.get("to")),
  );
  const [detail, setDetail] = useState<EnergyOutletDetail | null>(null);
  const [measurementPeriod, setMeasurementPeriod] = useState<EnergyPeriodState>(
    () => createEnergyPeriod("today"),
  );
  const [appliedMeasurementPeriod, setAppliedMeasurementPeriod] =
    useState<EnergyPeriodState>(() => createEnergyPeriod("today"));
  const [tablePeriod, setTablePeriod] = useState<EnergyPeriodState>(() =>
    createEnergyPeriod("today"),
  );
  const [appliedTablePeriod, setAppliedTablePeriod] =
    useState<EnergyPeriodState>(() => createEnergyPeriod("today"));
  const [analyticsPeriod, setAnalyticsPeriod] = useState<EnergyPeriodState>(
    () => createEnergyPeriod("today"),
  );
  const [appliedAnalyticsPeriod, setAppliedAnalyticsPeriod] =
    useState<EnergyPeriodState>(() => createEnergyPeriod("today"));
  const [alertsPeriod, setAlertsPeriod] = useState<EnergyPeriodState>(() =>
    createEnergyPeriod("today"),
  );
  const [appliedAlertsPeriod, setAppliedAlertsPeriod] =
    useState<EnergyPeriodState>(() => createEnergyPeriod("today"));
  const [historicalChartData, setHistoricalChartData] = useState<
    HistoricalReading[]
  >([]);
  const [historicalTableData, setHistoricalTableData] = useState<
    HistoricalReading[]
  >([]);
  const [analyticsReadings, setAnalyticsReadings] = useState<
    HistoricalReading[]
  >([]);
  const [alertHistoryData, setAlertHistoryData] = useState<
    EnergyOutletDetail["alertHistory"]
  >([]);
  const [latestEnergyByLocation, setLatestEnergyByLocation] = useState<
    { name: string; value: number; color?: string }[]
  >([]);
  const [activeMetricGroup, setActiveMetricGroup] =
    useState<Exclude<MetricGroup, "all">>("voltage");
  const [tableSearch, setTableSearch] = useState("");
  const [measurementSearch, setMeasurementSearch] = useState("");
  const [analyticsSearch, setAnalyticsSearch] = useState("");
  const [alertsSearch, setAlertsSearch] = useState("");
  const [tableMetricFilter, setTableMetricFilter] =
    useState<MetricGroup>("all");
  const [tablePage, setTablePage] = useState(0);
  const [realtimePowerKw, setRealtimePowerKw] = useState(0);
  const [realtimeLastUpdated, setRealtimeLastUpdated] = useState<string | null>(
    null,
  );
  const [capacityVa, setCapacityVa] = useState<number | null>(null);
  const [realtimePhaseMetrics, setRealtimePhaseMetrics] = useState({
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
    reactiveL1: 0,
    reactiveL2: 0,
    reactiveL3: 0,
    frequency: 0,
    energyTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const TABLE_PAGE_SIZE = 20;

  const filters = useMemo(
    () => buildEnergyFilters(appliedPeriod),
    [appliedPeriod],
  );
  const scopeId = params.scopeId;

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await energyDashboardApi.getOutletDetail(
          scopeId,
          filters,
        );
        if (!active) {
          return;
        }

        if (!response.success || !response.data) {
          setDetail(null);
          setError(response.error || "Failed to load outlet detail");
          return;
        }

        setDetail(response.data);
      } catch {
        if (active) {
          setDetail(null);
          setError("Failed to load outlet detail");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [filters, scopeId]);

  const measurementFilters = useMemo(
    () => buildEnergyFilters(appliedMeasurementPeriod),
    [appliedMeasurementPeriod],
  );
  const tableFilters = useMemo(
    () => buildEnergyFilters(appliedTablePeriod),
    [appliedTablePeriod],
  );
  const analyticsFilters = useMemo(
    () => buildEnergyFilters(appliedAnalyticsPeriod),
    [appliedAnalyticsPeriod],
  );
  const alertFilters = useMemo(
    () => buildEnergyFilters(appliedAlertsPeriod),
    [appliedAlertsPeriod],
  );

  useEffect(() => {
    let active = true;
    const loadMeasurementData = async () => {
      const response = await deviceMetricsApi.getAll({
        scopeId,
        moduleType: "power_meter",
        from: measurementFilters.from,
        to: measurementFilters.to,
        limit: 50000,
      });

      if (!active) return;
      if (!response.success || !response.data) {
        setHistoricalChartData([]);
        return;
      }
      setHistoricalChartData(mapMetricsToReadings(response.data));
    };

    void loadMeasurementData();
    return () => {
      active = false;
    };
  }, [measurementFilters.from, measurementFilters.to, scopeId]);

  useEffect(() => {
    let active = true;
    const loadTableData = async () => {
      const response = await deviceMetricsApi.getAll({
        scopeId,
        moduleType: "power_meter",
        from: tableFilters.from,
        to: tableFilters.to,
        limit: 50000,
      });

      if (!active) return;
      if (!response.success || !response.data) {
        setHistoricalTableData([]);
        return;
      }
      setHistoricalTableData(mapMetricsToReadings(response.data));
      setTablePage(0);
    };

    void loadTableData();
    return () => {
      active = false;
    };
  }, [tableFilters.from, tableFilters.to, scopeId]);

  useEffect(() => {
    let active = true;
    const loadAnalyticsData = async () => {
      const response = await deviceMetricsApi.getAll({
        scopeId,
        moduleType: "power_meter",
        from: analyticsFilters.from,
        to: analyticsFilters.to,
        limit: 50000,
      });

      if (!active) return;
      if (!response.success || !response.data) {
        setAnalyticsReadings([]);
        return;
      }
      setAnalyticsReadings(mapMetricsToReadings(response.data));
    };

    void loadAnalyticsData();
    return () => {
      active = false;
    };
  }, [analyticsFilters.from, analyticsFilters.to, scopeId]);

  useEffect(() => {
    let active = true;
    const loadAlertsData = async () => {
      const response = await alertEventsApi.getAll({
        scopeId,
        from: alertFilters.from,
        to: alertFilters.to,
        limit: 1000,
      });

      if (!active) return;
      if (!response.success || !response.data) {
        setAlertHistoryData([]);
        return;
      }

      setAlertHistoryData(
        response.data.map((alert) => ({
          id: alert.id,
          timestamp: alert.timestamp,
          deviceName: alert.device?.name || "Unknown Device",
          locationName: alert.device?.locationName || null,
          type: alert.alertType,
          severity: alert.severity,
          message: alert.description || alert.title,
        })),
      );
    };

    void loadAlertsData();
    return () => {
      active = false;
    };
  }, [alertFilters.from, alertFilters.to, scopeId]);

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

  const currentPower = useMemo(
    () =>
      (detail?.devices || []).reduce(
        (sum, device) => sum + device.latestPowerKw,
        0,
      ),
    [detail],
  );

  const deviceSummary = useMemo(() => {
    const devices = detail?.devices || [];
    const online = devices.filter(
      (device) => device.status.toLowerCase() === "online",
    ).length;
    const offline = devices.filter(
      (device) => device.status.toLowerCase() === "offline",
    ).length;
    return {
      total: devices.length,
      online,
      offline,
      alerts: devices.reduce((sum, device) => sum + device.alertCount, 0),
    };
  }, [detail]);

  useEffect(() => {
    let active = true;

    const refreshRealtimePower = async () => {
      const response = await deviceMetricsApi.getAll({
        scopeId,
        moduleType: "power_meter",
        limit: 500,
      });

      if (!active || !response.success || !response.data?.length) {
        return;
      }

      const latestMetricByKey = new Map<string, (typeof response.data)[0]>();
      for (const metric of response.data) {
        const current = latestMetricByKey.get(metric.metricKey);
        if (!current) {
          latestMetricByKey.set(metric.metricKey, metric);
          continue;
        }

        if (
          new Date(metric.timestamp).getTime() >
          new Date(current.timestamp).getTime()
        ) {
          latestMetricByKey.set(metric.metricKey, metric);
        }
      }

      const powerTotalMetric =
        latestMetricByKey.get("power_total") || latestMetricByKey.get("power");

      if (!powerTotalMetric) {
        return;
      }

      const getMetricValue = (key: string) =>
        Number(latestMetricByKey.get(key)?.metricValue ?? 0);
      const getPowerKw = (key: string) => {
        const metric = latestMetricByKey.get(key);
        if (!metric) return 0;
        const value = Number(metric.metricValue ?? 0);
        return metric.unit === "W" ? value / 1000 : value;
      };

      const raw = Number(powerTotalMetric.metricValue ?? 0);
      const valueKw = powerTotalMetric.unit === "W" ? raw / 1000 : raw;

      setRealtimePowerKw(
        Number.isFinite(valueKw) ? Number(valueKw.toFixed(2)) : 0,
      );
      setRealtimeLastUpdated(powerTotalMetric.timestamp);
      setRealtimePhaseMetrics({
        voltageL1: Number(getMetricValue("voltage_l1").toFixed(2)),
        voltageL2: Number(getMetricValue("voltage_l2").toFixed(2)),
        voltageL3: Number(getMetricValue("voltage_l3").toFixed(2)),
        currentL1: Number(getMetricValue("current_l1").toFixed(2)),
        currentL2: Number(getMetricValue("current_l2").toFixed(2)),
        currentL3: Number(getMetricValue("current_l3").toFixed(2)),
        currentTotal: Number(getMetricValue("current_total").toFixed(2)),
        powerL1: Number(getPowerKw("power_l1").toFixed(2)),
        powerL2: Number(getPowerKw("power_l2").toFixed(2)),
        powerL3: Number(getPowerKw("power_l3").toFixed(2)),
        powerTotal: Number(getPowerKw("power_total").toFixed(2)),
        reactiveL1: Number(getMetricValue("reactive_l1").toFixed(2)),
        reactiveL2: Number(getMetricValue("reactive_l2").toFixed(2)),
        reactiveL3: Number(getMetricValue("reactive_l3").toFixed(2)),
        frequency: Number(getMetricValue("frequency").toFixed(2)),
        energyTotal: Number(getMetricValue("energy_total").toFixed(2)),
      });
    };

    void refreshRealtimePower();
    const intervalId = setInterval(() => {
      void refreshRealtimePower();
    }, 15000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [scopeId]);

  useEffect(() => {
    let active = true;

    const loadLatestEnergyByLocation = async () => {
      const response = await deviceMetricsApi.getAll({
        scopeId,
        moduleType: "power_meter",
        metricKey: "energy_total",
        limit: 50000,
      });

      if (!active || !response.success || !response.data) {
        setLatestEnergyByLocation([]);
        return;
      }

      const latestByDevice = new Map<string, (typeof response.data)[0]>();
      for (const metric of response.data) {
        const current = latestByDevice.get(metric.deviceId);
        if (!current) {
          latestByDevice.set(metric.deviceId, metric);
          continue;
        }
        if (
          new Date(metric.timestamp).getTime() >
          new Date(current.timestamp).getTime()
        ) {
          latestByDevice.set(metric.deviceId, metric);
        }
      }

      const locationByDevice = new Map<string, string>();
      for (const device of detail?.devices || []) {
        locationByDevice.set(
          device.id,
          device.locationName || device.locationType || "Unknown Location",
        );
      }

      const grouped = new Map<string, { value: number; timestamp: string }>();
      for (const [deviceId, metric] of latestByDevice.entries()) {
        const location = locationByDevice.get(deviceId) || "Unknown Location";
        const value = Number(metric.metricValue ?? 0);
        const current = grouped.get(location);
        if (!current) {
          grouped.set(location, { value, timestamp: metric.timestamp });
          continue;
        }

        if (
          new Date(metric.timestamp).getTime() >
          new Date(current.timestamp).getTime()
        ) {
          grouped.set(location, { value, timestamp: metric.timestamp });
        }
      }

      setLatestEnergyByLocation(
        Array.from(grouped.entries())
          .map(([name, data]) => ({ name, value: data.value }))
          .sort((a, b) => b.value - a.value),
      );
    };

    void loadLatestEnergyByLocation();

    return () => {
      active = false;
    };
  }, [scopeId, detail?.devices]);

  useEffect(() => {
    let active = true;

    const loadCapacityConfig = async () => {
      const response = await energyConfigsApi.getAll(scopeId);
      if (!active || !response.success || !response.data) return;

      const latest = response.data[0];
      setCapacityVa(
        typeof latest?.capacityVa === "number" ? latest.capacityVa : null,
      );
    };

    void loadCapacityConfig();

    return () => {
      active = false;
    };
  }, [scopeId]);

  const maxLoadKw = detail?.maxLoad ?? null;

  const realtimeSnapshotCards = useMemo(
    () => [
      { label: "Voltage L1", value: realtimePhaseMetrics.voltageL1, unit: "V" },
      { label: "Voltage L2", value: realtimePhaseMetrics.voltageL2, unit: "V" },
      { label: "Voltage L3", value: realtimePhaseMetrics.voltageL3, unit: "V" },
      { label: "Current L1", value: realtimePhaseMetrics.currentL1, unit: "A" },
      { label: "Current L2", value: realtimePhaseMetrics.currentL2, unit: "A" },
      { label: "Current L3", value: realtimePhaseMetrics.currentL3, unit: "A" },
      {
        label: "Current Total",
        value: realtimePhaseMetrics.currentTotal,
        unit: "A",
      },
      { label: "Power L1", value: realtimePhaseMetrics.powerL1, unit: "kW" },
      { label: "Power L2", value: realtimePhaseMetrics.powerL2, unit: "kW" },
      { label: "Power L3", value: realtimePhaseMetrics.powerL3, unit: "kW" },
      {
        label: "Power Total",
        value: realtimePhaseMetrics.powerTotal || realtimePowerKw,
        unit: "kW",
      },
      {
        label: "Reactive L1",
        value: realtimePhaseMetrics.reactiveL1,
        unit: "var",
      },
      {
        label: "Reactive L2",
        value: realtimePhaseMetrics.reactiveL2,
        unit: "var",
      },
      {
        label: "Reactive L3",
        value: realtimePhaseMetrics.reactiveL3,
        unit: "var",
      },
      { label: "Frequency", value: realtimePhaseMetrics.frequency, unit: "Hz" },
      { label: "Energy", value: realtimePhaseMetrics.energyTotal, unit: "kWh" },
    ],
    [realtimePhaseMetrics, realtimePowerKw],
  );

  const formatRealtimeValue = (value: number) =>
    Number.isFinite(value)
      ? value.toLocaleString("id-ID", { maximumFractionDigits: 2 })
      : "-";

  const buildAnalyticsSummary = (sourceReadings: HistoricalReading[]) => {
    const points = [...sourceReadings].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp),
    );

    const averageOf = (key: keyof HistoricalReading) => {
      const values = points
        .map((item) => item[key])
        .filter((value): value is number => typeof value === "number");
      if (!values.length) return 0;
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    };

    const fallback = {
      peakPowerKw: 0,
      peakTimestamp: null as string | null,
      busiestHourByKwh: "-",
      avgPowerKw: 0,
      avgVoltage: 0,
      avgCurrent: 0,
      avgReactive: 0,
      avgFrequency: 0,
      totalKwhDelta: 0,
      changePercent: 0,
      hourlyKwhProfile: [] as {
        hourLabel: string;
        kwh: number;
        avgPowerKw: number;
      }[],
      conclusionLines: [
        "Data metrik belum cukup untuk menghasilkan kesimpulan analitik.",
      ],
    };

    if (!points.length) {
      return fallback;
    }

    const peakPoint = points.reduce((max, current) => {
      const currentPower = Number(current.powerTotal ?? 0);
      const maxPower = Number(max.powerTotal ?? 0);
      return currentPower > maxPower ? current : max;
    }, points[0]);

    const avgPowerKw = averageOf("powerTotal");
    const avgVoltage =
      (averageOf("voltageL1") +
        averageOf("voltageL2") +
        averageOf("voltageL3")) /
      3;
    const avgCurrent =
      averageOf("currentTotal") ||
      (averageOf("currentL1") +
        averageOf("currentL2") +
        averageOf("currentL3")) /
        3;
    const avgReactive =
      (averageOf("reactiveL1") +
        averageOf("reactiveL2") +
        averageOf("reactiveL3")) /
      3;
    const avgFrequency = averageOf("frequency");

    const firstPower = Number(points[0].powerTotal ?? 0);
    const lastPower = Number(points[points.length - 1].powerTotal ?? 0);
    const changePercent =
      Math.abs(firstPower) > 0
        ? ((lastPower - firstPower) / firstPower) * 100
        : 0;

    const hourlyBucket = new Map<
      number,
      { kwhTotal: number; powerTotal: number; powerCount: number }
    >();
    let totalKwhDelta = 0;

    for (let index = 1; index < points.length; index += 1) {
      const prev = points[index - 1];
      const current = points[index];
      const date = new Date(current.timestamp);
      if (Number.isNaN(date.getTime())) continue;

      const prevEnergy = Number(prev.energyTotal ?? 0);
      const currentEnergy = Number(current.energyTotal ?? 0);
      const deltaKwh = Math.max(currentEnergy - prevEnergy, 0);

      const hour = date.getHours();
      const existing = hourlyBucket.get(hour) ?? {
        kwhTotal: 0,
        powerTotal: 0,
        powerCount: 0,
      };
      hourlyBucket.set(hour, {
        kwhTotal: existing.kwhTotal + deltaKwh,
        powerTotal: existing.powerTotal + Number(current.powerTotal ?? 0),
        powerCount:
          existing.powerCount +
          (typeof current.powerTotal === "number" ? 1 : 0),
      });
      totalKwhDelta += deltaKwh;
    }

    const hourlyKwhProfile = Array.from(hourlyBucket.entries())
      .sort(([a], [b]) => a - b)
      .map(([hour, bucket]) => ({
        hourLabel: `${hour.toString().padStart(2, "0")}:00`,
        kwh: Number(bucket.kwhTotal.toFixed(3)),
        avgPowerKw:
          bucket.powerCount > 0
            ? Number((bucket.powerTotal / bucket.powerCount).toFixed(2))
            : 0,
      }));

    const busiestHour = hourlyKwhProfile.reduce(
      (max, current) => (current.kwh > max.kwh ? current : max),
      hourlyKwhProfile[0] ?? { hourLabel: "-", kwh: 0, avgPowerKw: 0 },
    );

    const trendLabel =
      changePercent > 3 ? "naik" : changePercent < -3 ? "turun" : "stabil";

    return {
      peakPowerKw: Number(Number(peakPoint.powerTotal ?? 0).toFixed(2)),
      peakTimestamp: peakPoint.timestamp,
      busiestHourByKwh: busiestHour.hourLabel,
      avgPowerKw: Number(avgPowerKw.toFixed(2)),
      avgVoltage: Number(avgVoltage.toFixed(2)),
      avgCurrent: Number(avgCurrent.toFixed(2)),
      avgReactive: Number(avgReactive.toFixed(2)),
      avgFrequency: Number(avgFrequency.toFixed(2)),
      totalKwhDelta: Number(totalKwhDelta.toFixed(3)),
      changePercent: Number(changePercent.toFixed(2)),
      hourlyKwhProfile,
      conclusionLines: [
        `Jam beban teramai berdasarkan total kWh ada di ${busiestHour.hourLabel} dengan akumulasi ${formatCompactNumber(busiestHour.kwh)} kWh.`,
        `Puncak daya terjadi pada ${peakPoint.timestamp ? formatDateTime(peakPoint.timestamp) : "-"} sebesar ${formatCompactNumber(peakPoint.powerTotal ?? 0)} kW, dengan rata-rata daya ${formatCompactNumber(avgPowerKw)} kW.`,
        `Rata-rata metrik: Voltage ${formatCompactNumber(avgVoltage)} V, Current ${formatCompactNumber(avgCurrent)} A, Reactive ${formatCompactNumber(avgReactive)} var, Frequency ${formatCompactNumber(avgFrequency)} Hz.`,
        `Total pertambahan energi periode ini ${formatCompactNumber(totalKwhDelta)} kWh dan tren daya ${trendLabel} (${formatCompactNumber(changePercent)}%).`,
      ],
    };
  };

  const analytics = useMemo(
    () => buildAnalyticsSummary(analyticsReadings),
    [analyticsReadings],
  );

  const analyticsChartData = useMemo(() => {
    const keyword = analyticsSearch.toLowerCase().trim();
    return analytics.hourlyKwhProfile.filter(
      (item) => !keyword || item.hourLabel.toLowerCase().includes(keyword),
    );
  }, [analytics.hourlyKwhProfile, analyticsSearch]);

  const measurementChartData = useMemo(() => {
    const keyword = measurementSearch.toLowerCase().trim();
    return historicalChartData.filter(
      (item) => !keyword || item.label.toLowerCase().includes(keyword),
    );
  }, [historicalChartData, measurementSearch]);

  const filteredAlertHistory = useMemo(() => {
    const keyword = alertsSearch.toLowerCase().trim();
    return alertHistoryData.filter((alert) => {
      if (!keyword) return true;
      const bucket =
        `${alert.deviceName} ${alert.type} ${alert.severity} ${alert.message} ${alert.locationName || ""}`.toLowerCase();
      return bucket.includes(keyword);
    });
  }, [alertHistoryData, alertsSearch]);

  const locationBreakdownData = useMemo(() => {
    const source = latestEnergyByLocation;
    if (!source.length)
      return [] as { name: string; value: number; color: string }[];

    const palette = [
      "#0ea5e9",
      "#22c55e",
      "#f59e0b",
      "#a855f7",
      "#ef4444",
      "#14b8a6",
    ];
    return source
      .filter((item) => Number(item.value || 0) > 0)
      .map((item, index) => ({
        name: item.name || `Lokasi ${index + 1}`,
        value: Number(item.value || 0),
        color: item.color || palette[index % palette.length],
      }));
  }, [latestEnergyByLocation]);

  const loadPercentage =
    maxLoadKw && maxLoadKw > 0
      ? Math.min((realtimePowerKw / maxLoadKw) * 100, 999)
      : 0;
  const isRealtimeOffline = realtimeLastUpdated
    ? Date.now() - new Date(realtimeLastUpdated).getTime() > 5 * 60 * 1000
    : true;
  const loadStatus: "OFFLINE" | "NORMAL" | "OVERLOAD" = isRealtimeOffline
    ? "OFFLINE"
    : maxLoadKw && maxLoadKw > 0 && realtimePowerKw > maxLoadKw
      ? "OVERLOAD"
      : "NORMAL";

  const handleExportExcel = async () => {
    if (!detail) return;

    const [metricsResponse, scopeResponse, devicesResponse] = await Promise.all([
      deviceMetricsApi.getAll({
        scopeId,
        moduleType: "power_meter",
        from: filters.from,
        to: filters.to,
        limit: 50000,
      }),
      scopesApi.getById(scopeId),
      devicesApi.getAll(scopeId),
    ]);

    const scopedMetrics: RawScopedMetric[] =
      metricsResponse.success && metricsResponse.data
        ? metricsResponse.data.map((item) => ({
            timestamp: item.timestamp,
            deviceId: item.deviceId,
            metricKey: item.metricKey,
            metricValue: Number(item.metricValue ?? 0),
          }))
        : [];

    const exportReadings = mapMetricsToHourlyReadings(
      scopedMetrics,
      filters.from,
      filters.to,
    );
    const exportAnalytics = buildAnalyticsSummary(exportReadings);
    const latestEnergyTotal = (() => {
      for (let i = exportReadings.length - 1; i >= 0; i -= 1) {
        const value = exportReadings[i]?.energyTotal;
        if (typeof value === "number") return value;
      }
      return 0;
    })();

    const locationEnergyMap = new Map<string, number>();
    const latestEnergyPerDevice = new Map<string, { timestamp: number; value: number }>();
    for (const metric of scopedMetrics) {
      if (metric.metricKey !== "energy_total") continue;
      const ts = new Date(metric.timestamp).getTime();
      if (!Number.isFinite(ts)) continue;
      const current = latestEnergyPerDevice.get(metric.deviceId);
      if (!current || ts > current.timestamp) {
        latestEnergyPerDevice.set(metric.deviceId, {
          timestamp: ts,
          value: Number(metric.metricValue || 0),
        });
      }
    }

    for (const device of detail.devices) {
      const location = device.locationName || device.locationType || "Uncategorized";
      const energy = latestEnergyPerDevice.get(device.id)?.value || 0;
      locationEnergyMap.set(location, Number(((locationEnergyMap.get(location) || 0) + energy).toFixed(2)));
    }

    const locationBreakdownRows = Array.from(locationEnergyMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const tenantName = scopeResponse.success
      ? scopeResponse.data?.tenant?.name || "-"
      : "-";

    const outletDeviceSummary = new Map(
      detail.devices.map((device) => [device.id, device]),
    );

    const richDevices =
      devicesResponse.success && devicesResponse.data
        ? devicesResponse.data
        : [];

    const exportDevices = (richDevices.length > 0 ? richDevices : detail.devices).map(
      (device) => {
        const summary = outletDeviceSummary.get(device.id);
        const moduleList =
          "moduleTypes" in device && Array.isArray(device.moduleTypes)
            ? device.moduleTypes
            : summary?.moduleTypes || [];

        return {
          deviceId: device.id,
          deviceName: device.name,
          serialNo: device.serialNo,
          locationName: device.locationName || "-",
          locationType: device.locationType || "-",
          firmwareVersion:
            "firmwareVersion" in device ? device.firmwareVersion || "-" : "-",
          status:
            ("deviceStatus" in device
              ? (device.deviceStatus as string | null)
              : null) || device.status || "-",
          internetStatus:
            "internetStatus" in device
              ? ((device.internetStatus as string | null) || "-")
              : "-",
          powerStatus:
            "powerStatus" in device
              ? ((device.powerStatus as string | null) || "-")
              : "-",
          uptime:
            "uptime" in device ? ((device.uptime as string | null) || "-") : "-",
          cpuUsagePercent:
            "cpuUsage" in device && typeof device.cpuUsage === "number"
              ? Number(device.cpuUsage.toFixed(2))
              : "-",
          memoryUsagePercent:
            "memoryUsagePercent" in device &&
            typeof device.memoryUsagePercent === "number"
              ? Number(device.memoryUsagePercent.toFixed(2))
              : "-",
          diskUsagePercent:
            "diskUsagePercent" in device &&
            typeof device.diskUsagePercent === "number"
              ? Number(device.diskUsagePercent.toFixed(2))
              : "-",
          modules: moduleList.join(", ") || "-",
          alertCount: summary?.alertCount ?? 0,
        };
      },
    );

    await exportToExcel(`outlet-detail-${detail.id}.xlsx`, [
      {
        name: "OutletSummary",
        rows: [
          {
            outlet: detail.name,
            tenant: tenantName,
            region: detail.region,
            city: detail.city,
            address: detail.address,
            from: detail.period.from,
            to: detail.period.to,
            maxLoadKw: detail.maxLoad ?? "-",
            capacityVa: capacityVa ?? "-",
            devices: detail.devices.length,
            energyTotalKwhHistorical: latestEnergyTotal,
            peakPowerKw: exportAnalytics.peakPowerKw,
            peakAt: exportAnalytics.peakTimestamp
              ? formatDateTime(exportAnalytics.peakTimestamp)
              : "-",
            busiestHourByKwh: exportAnalytics.busiestHourByKwh,
            averagePowerKw: exportAnalytics.avgPowerKw,
            averageVoltageV: exportAnalytics.avgVoltage,
            averageCurrentA: exportAnalytics.avgCurrent,
            averageReactiveVar: exportAnalytics.avgReactive,
            averageFrequencyHz: exportAnalytics.avgFrequency,
            totalKwhDelta: exportAnalytics.totalKwhDelta,
            trendPercent: exportAnalytics.changePercent,
          },
        ],
      },
      {
        name: "DeviceInfo",
        rows: exportDevices,
      },
      {
        name: "HistoricalPerHour",
        rows: exportReadings.map((item) => ({
          "Timestamp (Hour)": item.label,
          "Voltage L1 (V)": item.voltageL1,
          "Voltage L2 (V)": item.voltageL2,
          "Voltage L3 (V)": item.voltageL3,
          "Current L1 (A)": item.currentL1,
          "Current L2 (A)": item.currentL2,
          "Current L3 (A)": item.currentL3,
          "Current Total (A)": item.currentTotal,
          "Power L1 (kW)": item.powerL1,
          "Power L2 (kW)": item.powerL2,
          "Power L3 (kW)": item.powerL3,
          "Power Total (kW)": item.powerTotal,
          "Reactive Power L1 (var)": item.reactiveL1,
          "Reactive Power L2 (var)": item.reactiveL2,
          "Reactive Power L3 (var)": item.reactiveL3,
          "Frequency (Hz)": item.frequency,
          "Energy Total (kWh)": item.energyTotal,
        })),
      },
      {
        name: "LocationBreakdown",
        rows: locationBreakdownRows.map((item) => ({
          location: item.name,
          totalKwhEnergyTotal: item.value,
        })),
      },
      {
        name: "AnalyticsConclusions",
        rows: exportAnalytics.conclusionLines.map((line, index) => ({
          no: index + 1,
          conclusion: line,
        })),
      },
    ]);
  };

  const handleExportPdf = async () => {
    if (!detail) return;

    const [metricsResponse, scopeResponse, devicesResponse] = await Promise.all([
      deviceMetricsApi.getAll({
        scopeId,
        moduleType: "power_meter",
        from: filters.from,
        to: filters.to,
        limit: 50000,
      }),
      scopesApi.getById(scopeId),
      devicesApi.getAll(scopeId),
    ]);

    const scopedMetrics: RawScopedMetric[] =
      metricsResponse.success && metricsResponse.data
        ? metricsResponse.data.map((item) => ({
            timestamp: item.timestamp,
            deviceId: item.deviceId,
            metricKey: item.metricKey,
            metricValue: Number(item.metricValue ?? 0),
          }))
        : [];

    const exportReadings = mapMetricsToHourlyReadings(
      scopedMetrics,
      filters.from,
      filters.to,
    );
    const exportAnalytics = buildAnalyticsSummary(exportReadings);
    const latestEnergyTotal = (() => {
      for (let i = exportReadings.length - 1; i >= 0; i -= 1) {
        const value = exportReadings[i]?.energyTotal;
        if (typeof value === "number") return value;
      }
      return 0;
    })();

    const tenantName = scopeResponse.success
      ? scopeResponse.data?.tenant?.name || undefined
      : undefined;

    const outletDeviceSummary = new Map(
      detail.devices.map((device) => [device.id, device]),
    );

    const richDevices =
      devicesResponse.success && devicesResponse.data
        ? devicesResponse.data
        : [];

    const exportDeviceRows = (richDevices.length > 0 ? richDevices : detail.devices).map(
      (device) => {
        const summary = outletDeviceSummary.get(device.id);
        const moduleList =
          "moduleTypes" in device && Array.isArray(device.moduleTypes)
            ? device.moduleTypes
            : summary?.moduleTypes || [];

        return [
          device.id,
          device.name,
          device.serialNo,
          device.locationName || "-",
          device.locationType || "-",
          "firmwareVersion" in device ? device.firmwareVersion || "-" : "-",
          ("deviceStatus" in device
            ? (device.deviceStatus as string | null)
            : null) || device.status || "-",
          "internetStatus" in device
            ? ((device.internetStatus as string | null) || "-")
            : "-",
          "powerStatus" in device
            ? ((device.powerStatus as string | null) || "-")
            : "-",
          "uptime" in device ? ((device.uptime as string | null) || "-") : "-",
          "cpuUsage" in device && typeof device.cpuUsage === "number"
            ? Number(device.cpuUsage.toFixed(2))
            : "-",
          "memoryUsagePercent" in device &&
          typeof device.memoryUsagePercent === "number"
            ? Number(device.memoryUsagePercent.toFixed(2))
            : "-",
          "diskUsagePercent" in device &&
          typeof device.diskUsagePercent === "number"
            ? Number(device.diskUsagePercent.toFixed(2))
            : "-",
          moduleList.join(", ") || "-",
          summary?.alertCount ?? 0,
        ];
      },
    );

    await exportToPdf({
      fileName: `outlet-detail-${detail.id}.pdf`,
      title: `Laporan Detail Outlet`,
      scopeName: detail.name,
      tenantName,
      period: detail.period.label,
      generatedAt: new Date().toLocaleString("id-ID"),
      summary: [
        `Energi total (energy_total historical terakhir): ${formatCompactNumber(latestEnergyTotal)} kWh`,
        `Tenant: ${tenantName || "-"} | Lokasi: ${detail.address || detail.city || detail.region || "-"}`,
        `Jumlah device: ${detail.devices.length} | Kapasitas: ${capacityVa ? `${formatCompactNumber(capacityVa)} VA` : "-"}`,
        `Peak power: ${formatCompactNumber(exportAnalytics.peakPowerKw)} kW (jam ramai: ${exportAnalytics.busiestHourByKwh})`,
        ...exportAnalytics.conclusionLines,
      ],
      tables: [
        {
          title: "Historical Per Jam",
          columns: [
            "Timestamp (Hour)",
            "Voltage L1 (V)",
            "Voltage L2 (V)",
            "Voltage L3 (V)",
            "Current L1 (A)",
            "Current L2 (A)",
            "Current L3 (A)",
            "Current Total (A)",
            "Power L1 (kW)",
            "Power L2 (kW)",
            "Power L3 (kW)",
            "Power Total (kW)",
            "Reactive Power L1 (var)",
            "Reactive Power L2 (var)",
            "Reactive Power L3 (var)",
            "Frequency (Hz)",
            "Energy Total (kWh)",
          ],
          rows: exportReadings.map((item) => [
            item.label,
            item.voltageL1 ?? "-",
            item.voltageL2 ?? "-",
            item.voltageL3 ?? "-",
            item.currentL1 ?? "-",
            item.currentL2 ?? "-",
            item.currentL3 ?? "-",
            item.currentTotal ?? "-",
            item.powerL1 ?? "-",
            item.powerL2 ?? "-",
            item.powerL3 ?? "-",
            item.powerTotal ?? "-",
            item.reactiveL1 ?? "-",
            item.reactiveL2 ?? "-",
            item.reactiveL3 ?? "-",
            item.frequency ?? "-",
            item.energyTotal ?? "-",
          ]),
        },
        {
          title: "Info Device",
          columns: [
            "Device ID",
            "Device Name",
            "Serial",
            "Lokasi",
            "Tipe Lokasi",
            "Firmware",
            "Device Status",
            "Internet Status",
            "Power Status",
            "Uptime",
            "CPU Usage (%)",
            "Memory Usage (%)",
            "Disk Usage (%)",
            "Modules",
            "Alert Count",
          ],
          rows: exportDeviceRows,
        },
      ],
    });
  };

  return (
    <PageTransition>
      <motion.div
        className="space-y-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div
          variants={itemVariants}
          className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between"
        >
          <div>
            <Button
              asChild
              variant="ghost"
              className="mb-2 px-0 text-sm text-muted-foreground"
            >
              <Link href="/dashboard/electricity">
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Power Outlets
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">
              {detail?.name || "Outlet Detail"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Data lengkap outlet, perangkat, dan histori alert sesuai periode
              aktif.
            </p>
          </div>
          <EnergyExportActions
            onExportPdf={handleExportPdf}
            onExportExcel={handleExportExcel}
            disabled={!detail || loading}
          />
        </motion.div>

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
            loading={loading}
          />
        </motion.div>

        {error && (
          <motion.div
            variants={itemVariants}
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </motion.div>
        )}

        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/80">Total Perangkat</p>
                  <p className="text-2xl font-bold truncate">
                    {deviceSummary.total}
                  </p>
                </div>
                <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Package className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/80">Perangkat Online</p>
                  <p className="text-2xl font-bold truncate">
                    {deviceSummary.online}
                  </p>
                </div>
                <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Zap className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-violet-500 to-purple-500 text-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/80">Perangkat Offline</p>
                  <p className="text-2xl font-bold truncate">
                    {deviceSummary.offline}
                  </p>
                </div>
                <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Gauge className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/80">Alert Perangkat</p>
                  <p className="text-2xl font-bold truncate">
                    {deviceSummary.alerts}
                  </p>
                </div>
                <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Bell className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5" />
                  Daya Real-Time
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="relative inline-flex items-center justify-center">
                    <svg className="w-40 h-40 transform -rotate-90">
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        className="text-muted/20"
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={440}
                        strokeDashoffset={440 - (440 * loadPercentage) / 100}
                        className={cn(
                          "transition-all duration-500",
                          loadStatus === "OFFLINE"
                            ? "text-slate-400"
                            : loadStatus === "OVERLOAD"
                            ? "text-red-500"
                            : "text-green-500",
                        )}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold">
                        {formatCompactNumber(realtimePowerKw)}
                      </span>
                      <span className="text-sm text-muted-foreground">kW</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Status Beban
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        loadStatus === "OFFLINE"
                          ? "bg-slate-500/20 text-slate-500 border-slate-500/30"
                          : loadStatus === "OVERLOAD"
                          ? "bg-red-500/20 text-red-500 border-red-500/30"
                          : "bg-green-500/20 text-green-500 border-green-500/30",
                      )}
                    >
                      {loadStatus === "OFFLINE"
                        ? "DEVICE OFFLINE"
                        : loadStatus === "OVERLOAD"
                          ? "OVERLOAD"
                          : "NORMAL LOAD"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Beban Puncak
                    </span>
                    <span className="font-medium">
                      {formatCompactNumber(detail?.peakPower || 0)} kW
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Kapasitas Maksimal
                    </span>
                    <span className="font-medium">
                      {maxLoadKw ? `${formatCompactNumber(maxLoadKw)} kW` : "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Kapasitas Maksimal (V)
                    </span>
                    <span className="font-medium">
                      {capacityVa !== null
                        ? `${formatCompactNumber(capacityVa)} V`
                        : "-"}
                    </span>
                  </div>
                  <Progress
                    value={loadStatus === "OFFLINE" ? 0 : Math.min(loadPercentage, 100)}
                    className={cn(
                      "h-2",
                      loadStatus === "OVERLOAD" && "[&>div]:bg-red-500",
                      loadStatus === "OFFLINE" && "[&>div]:bg-slate-400",
                    )}
                  />
                  <p className="text-xs text-center text-muted-foreground">
                    {formatCompactNumber(loadPercentage)}% dari kapasitas
                  </p>
                  <p className="text-xs text-center text-muted-foreground">
                    Update realtime:{" "}
                    {realtimeLastUpdated
                      ? formatDateTime(realtimeLastUpdated)
                      : "-"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card className="h-full border shadow-sm">
              <CardHeader className="border-b bg-muted/20">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>Power Series (Termasuk Daya Realtime)</CardTitle>
                  <Badge variant="outline">Realtime aktif</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {realtimeSnapshotCards.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-lg border bg-muted/20 px-3 py-2"
                    >
                      <p className="text-[11px] text-muted-foreground">
                        {metric.label}
                      </p>
                      <p className="text-sm font-semibold leading-tight">
                        {formatRealtimeValue(metric.value)} {metric.unit}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Info Voltage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[170px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { phase: "L1", value: realtimePhaseMetrics.voltageL1 },
                        { phase: "L2", value: realtimePhaseMetrics.voltageL2 },
                        { phase: "L3", value: realtimePhaseMetrics.voltageL3 },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="phase"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis tickLine={false} axisLine={false} width={40} />
                      <Tooltip
                        formatter={(value: number) => [`${value} V`, "Voltage"]}
                      />
                      <Bar
                        dataKey="value"
                        fill="#3b82f6"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Info Current
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[170px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { phase: "L1", value: realtimePhaseMetrics.currentL1 },
                        { phase: "L2", value: realtimePhaseMetrics.currentL2 },
                        { phase: "L3", value: realtimePhaseMetrics.currentL3 },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="phase"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis tickLine={false} axisLine={false} width={40} />
                      <Tooltip
                        formatter={(value: number) => [`${value} A`, "Current"]}
                      />
                      <Bar
                        dataKey="value"
                        fill="#10b981"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Info Power
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[170px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { phase: "L1", value: realtimePhaseMetrics.powerL1 },
                        { phase: "L2", value: realtimePhaseMetrics.powerL2 },
                        { phase: "L3", value: realtimePhaseMetrics.powerL3 },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="phase"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis tickLine={false} axisLine={false} width={40} />
                      <Tooltip
                        formatter={(value: number) => [`${value} kW`, "Power"]}
                      />
                      <Bar
                        dataKey="value"
                        fill="#f59e0b"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Info Reactive
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[170px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { phase: "L1", value: realtimePhaseMetrics.reactiveL1 },
                        { phase: "L2", value: realtimePhaseMetrics.reactiveL2 },
                        { phase: "L3", value: realtimePhaseMetrics.reactiveL3 },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="phase"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis tickLine={false} axisLine={false} width={40} />
                      <Tooltip
                        formatter={(value: number) => [
                          `${value} var`,
                          "Reactive",
                        ]}
                      />
                      <Bar
                        dataKey="value"
                        fill="#8b5cf6"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4" />
                  Riwayat Pengukuran
                </CardTitle>
                <div className="grid gap-2 lg:grid-cols-[1fr_1fr_auto_auto]">
                  <Input
                    type="datetime-local"
                    value={measurementPeriod.from}
                    onChange={(event) =>
                      setMeasurementPeriod((current) => ({
                        ...current,
                        preset: "custom",
                        from: event.target.value,
                      }))
                    }
                    className="h-8 text-xs"
                  />
                  <Input
                    type="datetime-local"
                    value={measurementPeriod.to}
                    onChange={(event) =>
                      setMeasurementPeriod((current) => ({
                        ...current,
                        preset: "custom",
                        to: event.target.value,
                      }))
                    }
                    className="h-8 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => {
                      const next = createEnergyPeriod("today");
                      setMeasurementPeriod(next);
                      setAppliedMeasurementPeriod(next);
                    }}
                  >
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={() =>
                      setAppliedMeasurementPeriod(
                        normalizeEnergyPeriod(measurementPeriod),
                      )
                    }
                  >
                    Terapkan
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Cari waktu..."
                      className="pl-8 h-8 text-xs w-[200px]"
                      value={measurementSearch}
                      onChange={(event) =>
                        setMeasurementSearch(event.target.value)
                      }
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {METRIC_GROUPS.map((group) => (
                      <button
                        key={group.key}
                        onClick={() => setActiveMetricGroup(group.key)}
                        className={
                          activeMetricGroup === group.key
                            ? "px-3 py-1 text-xs rounded-full border bg-primary text-primary-foreground border-primary"
                            : "px-3 py-1 text-xs rounded-full border bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                        }
                      >
                        {group.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {measurementChartData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                  Tidak ada data untuk periode ini
                </div>
              ) : (
                <>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={measurementChartData}
                        margin={{ top: 5, right: 10, bottom: 0, left: -10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 9 }}
                          tickLine={false}
                          axisLine={false}
                          interval={Math.max(
                            0,
                            Math.floor(measurementChartData.length / 12) - 1,
                          )}
                          angle={-30}
                          textAnchor="end"
                          height={50}
                        />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          width={50}
                          tickFormatter={(value: number) =>
                            value.toLocaleString("id-ID", {
                              maximumFractionDigits: 1,
                            })
                          }
                        />
                        <Tooltip
                          contentStyle={{ fontSize: 11 }}
                          labelFormatter={(label) => `Waktu: ${label}`}
                          formatter={(value: number, name: string) => [
                            Number(value).toFixed(2),
                            name,
                          ]}
                        />
                        {METRIC_GROUPS.find(
                          (group) => group.key === activeMetricGroup,
                        )?.lines.map((line) => (
                          <Line
                            key={line.dataKey}
                            type="monotone"
                            dataKey={line.dataKey}
                            name={line.name}
                            stroke={line.color}
                            strokeWidth={1.5}
                            dot={false}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {measurementChartData.length} pembacaan
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4" />
                  Tabel Riwayat Data
                </CardTitle>
                <div className="grid gap-2 lg:grid-cols-[1fr_1fr_auto_auto]">
                  <Input
                    type="datetime-local"
                    value={tablePeriod.from}
                    onChange={(event) =>
                      setTablePeriod((current) => ({
                        ...current,
                        preset: "custom",
                        from: event.target.value,
                      }))
                    }
                    className="h-8 text-xs"
                  />
                  <Input
                    type="datetime-local"
                    value={tablePeriod.to}
                    onChange={(event) =>
                      setTablePeriod((current) => ({
                        ...current,
                        preset: "custom",
                        to: event.target.value,
                      }))
                    }
                    className="h-8 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => {
                      const next = createEnergyPeriod("today");
                      setTablePeriod(next);
                      setAppliedTablePeriod(next);
                    }}
                  >
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={() =>
                      setAppliedTablePeriod(normalizeEnergyPeriod(tablePeriod))
                    }
                  >
                    Terapkan
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={tableMetricFilter}
                    onValueChange={(value) => {
                      setTableMetricFilter(value as MetricGroup);
                      setTablePage(0);
                    }}
                  >
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue placeholder="Semua Metrik" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Metrik</SelectItem>
                      {METRIC_GROUPS.map((group) => (
                        <SelectItem key={group.key} value={group.key}>
                          {group.label}
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
                      onChange={(event) => {
                        setTableSearch(event.target.value);
                        setTablePage(0);
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const metricColumns: Record<
                  MetricGroup,
                  { key: keyof HistoricalReading; label: string }[]
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

                const fmtNum = (value: number | null) =>
                  value !== null ? value.toFixed(2) : "-";

                const columns = metricColumns[tableMetricFilter];
                const searchKeyword = tableSearch.toLowerCase();
                const filteredRows = [...historicalTableData]
                  .reverse()
                  .filter(
                    (row) =>
                      !tableSearch ||
                      row.label.toLowerCase().includes(searchKeyword),
                  );

                const totalPages = Math.max(
                  1,
                  Math.ceil(filteredRows.length / TABLE_PAGE_SIZE),
                );

                const pageData = filteredRows.slice(
                  tablePage * TABLE_PAGE_SIZE,
                  (tablePage + 1) * TABLE_PAGE_SIZE,
                );

                if (historicalTableData.length === 0) {
                  return (
                    <div className="h-[120px] flex items-center justify-center text-sm text-muted-foreground">
                      Tidak ada data untuk periode ini
                    </div>
                  );
                }

                return (
                  <>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Waktu</TableHead>
                            {columns.map((column) => (
                              <TableHead
                                key={column.key}
                                className="text-xs text-right"
                              >
                                {column.label}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pageData.map((row, index) => (
                            <TableRow key={`${row.timestamp}-${index}`}>
                              <TableCell className="text-xs font-medium">
                                {row.label}
                              </TableCell>
                              {columns.map((column) => (
                                <TableCell
                                  key={column.key}
                                  className="text-xs text-right tabular-nums"
                                >
                                  {fmtNum(row[column.key] as number | null)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-muted-foreground">
                        {filteredRows.length} data
                        {tableSearch ? " (difilter)" : ""} - Halaman{" "}
                        {tablePage + 1} dari {totalPages}
                      </p>
                      <div className="flex gap-1">
                        <button
                          onClick={() =>
                            setTablePage((current) => Math.max(0, current - 1))
                          }
                          disabled={tablePage === 0}
                          className="px-3 py-1 text-xs rounded border disabled:opacity-50 hover:bg-muted transition-colors"
                        >
                          Sebelumnya
                        </button>
                        <button
                          onClick={() =>
                            setTablePage((current) =>
                              Math.min(totalPages - 1, current + 1),
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

        <motion.div variants={itemVariants}>
          <Card className="border shadow-sm">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle>Profil Outlet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5 text-sm">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-lg border p-3">
                    <Building2 className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium">Outlet</p>
                      <p className="text-muted-foreground">
                        {detail?.name || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border p-3">
                    <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium">Lokasi</p>
                      <p className="text-muted-foreground">
                        {detail?.address ||
                          detail?.city ||
                          detail?.region ||
                          "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border p-3">
                    <Activity className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium">Perbandingan Periode</p>
                      <p className="text-muted-foreground">
                        {formatCompactNumber(
                          detail?.comparisonData.currentPeriod.current || 0,
                        )}{" "}
                        kWh saat ini, perubahan{" "}
                        {formatCompactNumber(
                          detail?.comparisonData.currentPeriod.change || 0,
                        )}
                        %
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      Peak {formatCompactNumber(analytics.peakPowerKw)} kW
                    </Badge>
                    <Badge variant="outline">
                      Jam Ramai {analytics.busiestHourByKwh}
                    </Badge>
                    <Badge variant="outline">
                      Total Delta {formatCompactNumber(analytics.totalKwhDelta)}{" "}
                      kWh
                    </Badge>
                    <Badge variant="outline">
                      {detail?.period.label || "-"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border p-3">
                  <p className="text-sm font-medium">
                    Distribusi Energi per Lokasi
                  </p>
                  <div className="h-[240px]">
                    {locationBreakdownData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        Data lokasi belum tersedia
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={locationBreakdownData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={48}
                            outerRadius={90}
                            paddingAngle={2}
                          >
                            {locationBreakdownData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => [
                              `${formatCompactNumber(value)} kWh`,
                              "Energi",
                            ]}
                          />
                          <Legend verticalAlign="bottom" height={32} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="grid gap-2 text-xs text-muted-foreground">
                    {locationBreakdownData.slice(0, 4).map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between rounded border px-2 py-1.5"
                      >
                        <span>{item.name}</span>
                        <span className="font-medium text-foreground">
                          {formatCompactNumber(item.value)} kWh
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border shadow-sm">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Analytics Outlet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="grid gap-2 lg:grid-cols-[1fr_1fr_auto_auto]">
                <Input
                  type="datetime-local"
                  value={analyticsPeriod.from}
                  onChange={(event) =>
                    setAnalyticsPeriod((current) => ({
                      ...current,
                      preset: "custom",
                      from: event.target.value,
                    }))
                  }
                  className="h-8 text-xs"
                />
                <Input
                  type="datetime-local"
                  value={analyticsPeriod.to}
                  onChange={(event) =>
                    setAnalyticsPeriod((current) => ({
                      ...current,
                      preset: "custom",
                      to: event.target.value,
                    }))
                  }
                  className="h-8 text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => {
                    const next = createEnergyPeriod("today");
                    setAnalyticsPeriod(next);
                    setAppliedAnalyticsPeriod(next);
                  }}
                >
                  Reset
                </Button>
                <Button
                  size="sm"
                  className="h-8"
                  onClick={() =>
                    setAppliedAnalyticsPeriod(
                      normalizeEnergyPeriod(analyticsPeriod),
                    )
                  }
                >
                  Terapkan
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cari jam analytics (contoh: 09:00)..."
                  className="pl-8 h-8 text-xs"
                  value={analyticsSearch}
                  onChange={(event) => setAnalyticsSearch(event.target.value)}
                />
              </div>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="hourLabel"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis tickLine={false} axisLine={false} width={44} />
                    <Tooltip
                      formatter={(value: number) => [
                        `${formatCompactNumber(value)} kWh`,
                        "Total kWh",
                      ]}
                      labelFormatter={(label) => `Jam ${label}`}
                    />
                    <Bar dataKey="kwh" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 rounded-lg border bg-muted/20 p-3 text-sm">
                {analytics.conclusionLines.map((line, index) => (
                  <p key={index} className="text-muted-foreground">
                    {line}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20">
                <div>
                  <CardTitle>Daftar Perangkat</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Setiap perangkat dengan power terakhir, status, dan jumlah
                    alert
                  </p>
                </div>
                <Badge variant="outline">{detail?.devices.length || 0}</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Perangkat</TableHead>
                      <TableHead>Lokasi</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Power</TableHead>
                      <TableHead className="text-right">Last Seen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(detail?.devices || []).map((device) => (
                      <TableRow key={device.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{device.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {device.serialNo}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {device.locationName || device.locationType || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{device.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCompactNumber(device.latestPowerKw)} kW
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {device.lastSeenAt
                            ? formatDateTime(device.lastSeenAt)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20">
                <div>
                  <CardTitle>Alert History</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Histori lengkap event perangkat pada outlet ini
                  </p>
                </div>
                <Badge variant="outline">{filteredAlertHistory.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                <div className="grid gap-2 lg:grid-cols-[1fr_1fr_auto_auto]">
                  <Input
                    type="datetime-local"
                    value={alertsPeriod.from}
                    onChange={(event) =>
                      setAlertsPeriod((current) => ({
                        ...current,
                        preset: "custom",
                        from: event.target.value,
                      }))
                    }
                    className="h-8 text-xs"
                  />
                  <Input
                    type="datetime-local"
                    value={alertsPeriod.to}
                    onChange={(event) =>
                      setAlertsPeriod((current) => ({
                        ...current,
                        preset: "custom",
                        to: event.target.value,
                      }))
                    }
                    className="h-8 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => {
                      const next = createEnergyPeriod("today");
                      setAlertsPeriod(next);
                      setAppliedAlertsPeriod(next);
                    }}
                  >
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={() =>
                      setAppliedAlertsPeriod(
                        normalizeEnergyPeriod(alertsPeriod),
                      )
                    }
                  >
                    Terapkan
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Cari device, severity, type, pesan..."
                    className="pl-8 h-8 text-xs"
                    value={alertsSearch}
                    onChange={(event) => setAlertsSearch(event.target.value)}
                  />
                </div>
                <ScrollArea className="h-[460px]">
                  <div className="divide-y">
                    {filteredAlertHistory.map((alert) => (
                      <div key={alert.id} className="space-y-2 px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{alert.deviceName}</p>
                            <p className="text-xs text-muted-foreground">
                              {alert.locationName || "No location"} •{" "}
                              {formatDateTime(alert.timestamp)}
                            </p>
                          </div>
                          <Badge variant="outline">{alert.severity}</Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{alert.type}</p>
                          <p className="text-sm text-muted-foreground">
                            {alert.message}
                          </p>
                        </div>
                      </div>
                    ))}
                    {!filteredAlertHistory.length && !loading && (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        Tidak ada alert pada periode ini.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </PageTransition>
  );
}
