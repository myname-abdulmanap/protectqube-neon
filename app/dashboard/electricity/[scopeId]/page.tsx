"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, BarChart2, Database } from "lucide-react";
import { PageTransition } from "@/components/ui/page-transition";
import { RealtimePowerCard } from "@/components/electricity/detail/RealtimePowerCard";
import {
  PowerMeterCard,
  type TarifValues,
} from "@/components/electricity/detail/PowerMeterCard";
import { TrendChartCard } from "@/components/electricity/detail/TrendChartCard";
import { PowerChartCard } from "@/components/electricity/detail/PowerChartCard";
import { EnergyChartCard } from "@/components/electricity/detail/EnergyChartCard";
import { HistoryTableCard } from "@/components/electricity/detail/HistoryTableCard";
import { OutletProfileCard } from "@/components/electricity/detail/OutletProfileCard";
import { HourlyEnergyCard } from "@/components/electricity/detail/HourlyEnergyCard";
import {
  DateFilter,
  type DateRange,
  buildRange,
  rangeDateLabel,
} from "@/components/electricity/detail/DateFilter";
import { DataLoadingOverlay } from "@/components/electricity/detail/DataLoadingOverlay";
import {
  deviceMetricsApi,
  energyDashboardApi,
  energyConfigsApi,
  ExportProcessedHourBucket,
  type EnergyOutletDetail,
  type EnergyConfig,
  type HourlyDailyEnergyData,
} from "@/lib/api";
import { exportToExcel, exportToPdf } from "@/lib/report-export";
import {
  ExportModal,
  type ExportFormat,
  type ExportPeriod,
  type ExportOption,
} from "@/components/dashboard/ExportModal";

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
    peakPowerAt: string | null;
    avgPowerKw: number;
    avgVoltageV: number;
    avgCurrentA: number;
    avgPfSigma: number;
    totalEnergyKwh: number;
    totalKvarh: number;
    peakHour: number | null;
    peakHourAvgKw: number;
    overallAvgKwPerHour: number;
    peakHourAvgKwh: number;
    overallAvgKwhPerHour: number;
    totalKvarhDelta: number;
    avgFrequencyHz: number | null;
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

const normalizePowerToKw = (value: number) =>
  Number.isFinite(value) && value > 1000 ? value / 1000 : value;

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
      metricValue:
        r.metricKey === "power_total"
          ? normalizePowerToKw(Number(r.metricValue ?? 0))
          : Number(r.metricValue ?? 0),
    })),
    analytics: {
      peakPowerKw: normalizePowerToKw(
        Number(ext.analytics?.peakPowerKw ?? raw.peakPower ?? 0),
      ),
      peakPowerAt: ext.analytics?.peakPowerAt ?? null,
      avgPowerKw: normalizePowerToKw(Number(ext.analytics?.avgPowerKw ?? 0)),
      avgVoltageV: Number(ext.analytics?.avgVoltageV ?? 0),
      avgCurrentA: Number(ext.analytics?.avgCurrentA ?? 0),
      avgPfSigma: Number(ext.analytics?.avgPfSigma ?? 0),
      totalEnergyKwh: Number(
        ext.analytics?.totalEnergyKwh ?? raw.kpiData?.totalUsage ?? 0,
      ),
      totalKvarh: Number(ext.analytics?.totalKvarh ?? 0),
      peakHour: ext.analytics?.peakHour ?? null,
      peakHourAvgKw: Number(
        ext.analytics?.peakHourAvgKw ?? ext.analytics?.peakHourAvgKwh ?? 0,
      ),
      overallAvgKwPerHour: Number(
        ext.analytics?.overallAvgKwPerHour ??
          ext.analytics?.overallAvgKwhPerHour ??
          0,
      ),
      peakHourAvgKwh: Number(ext.analytics?.peakHourAvgKwh ?? 0),
      overallAvgKwhPerHour: Number(ext.analytics?.overallAvgKwhPerHour ?? 0),
      totalKvarhDelta: Number(ext.analytics?.totalKvarhDelta ?? 0),
      avgFrequencyHz:
        ext.analytics?.avgFrequencyHz != null &&
        Number(ext.analytics.avgFrequencyHz) >= 45 &&
        Number(ext.analytics.avgFrequencyHz) <= 55
          ? Number(ext.analytics.avgFrequencyHz)
          : null,
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
    if (!Number.isNaN(metricTs.getTime()) && metricTs < startAt) return 0;
  }
  return Number(
    Math.max(0, rawValue - Number(startingPoint.initialKwh ?? 0)).toFixed(2),
  );
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

  const [dataLoading, setDataLoading] = useState(false);

  const [latestMetrics, setLatestMetrics] = useState<
    OutletDetailPayload["latestMetrics"]
  >({});
  const [realtimeLastUpdated, setRealtimeLastUpdated] = useState<string | null>(
    null,
  );
  const [isMounted, setIsMounted] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const [energyConfig, setEnergyConfig] = useState<EnergyConfig | null>(null);
  const [hourlyEnergyData, setHourlyEnergyData] =
    useState<HourlyDailyEnergyData | null>(null);

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
        setDetail(payload);
        setTimeSeries(payload.timeSeries);
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

  // Fetch energy config once
  useEffect(() => {
    energyConfigsApi.getAll(scopeId).then((res) => {
      if (res.success && res.data?.length) {
        // Get most recent valid config
        const sorted = [...res.data].sort(
          (a, b) =>
            new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime(),
        );
        setEnergyConfig(sorted[0]);
      }
    });
  }, [scopeId]);

  // Fetch hourly data for TOU cost calculation when date range changes
  useEffect(() => {
    if (
      !energyConfig?.config?.tariff ||
      energyConfig.config.tariff.mode !== "tou"
    )
      return;
    const from =
      dateRange.from ?? new Date(Date.now() - 86400000).toISOString();
    const to = dateRange.to ?? new Date().toISOString();
    energyDashboardApi.getHourlyDailyEnergy(scopeId, from, to).then((res) => {
      if (res.success && res.data) setHourlyEnergyData(res.data);
    });
  }, [scopeId, energyConfig, dateRange]);

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
    if (latestTs) {
      setRealtimeLastUpdated(latestTs);
      setRefreshTick((t) => t + 1);
    }
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
    const energyTotal = roundN(
      applyStartPointOffset(
        g("energy_total"),
        detail?.startingPoint ?? null,
        latestMetrics["energy_total"]?.timestamp,
      ),
    );
    const kvarh = roundN(g("kvarh"));
    const penaltyKvarh =
      energyTotal > 0
        ? Math.max(0, Number((kvarh - 0.62 * energyTotal).toFixed(3)))
        : 0;
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
      penaltyKvarh,
    };
  }, [detail?.startingPoint, latestMetrics]);

  const tarifValues = useMemo(() => {
    if (!energyConfig) return { lwbp: null, wbp: null, totalTarif: null };

    const tariff = energyConfig.config?.tariff;
    const totalKwh = detail?.analytics.totalEnergyKwh ?? 0;

    if (!tariff || tariff.mode === "flat") {
      // Flat: total cost = totalKwh × flatPrice
      const price = tariff?.flatPricePerKwh ?? energyConfig.pricePerKwh ?? 0;
      const totalCost = totalKwh * price;
      return {
        lwbp: null,
        wbp: null,
        totalTarif: totalCost > 0 ? totalCost : null,
      };
    }

    // TOU: accumulate per hour
    if (!tariff.touPeriods?.length || !hourlyEnergyData?.days.length) {
      return { lwbp: null, wbp: null, totalTarif: null };
    }

    const isHourInPeriod = (
      hour: number,
      startTime: string,
      endTime: string,
    ): boolean => {
      const [sh] = startTime.split(":").map(Number);
      const [eh] = endTime.split(":").map(Number);
      if (sh < eh) return hour >= sh && hour < eh;
      if (sh > eh) return hour >= sh || hour < eh; // overnight
      return true; // same = full day
    };

    let lwbpCost = 0;
    let wbpCost = 0;
    let otherCost = 0;

    for (const day of hourlyEnergyData.days) {
      for (const h of day.hours) {
        if (!h.hasData || h.energyKwh <= 0) continue;
        for (const period of tariff.touPeriods) {
          if (!period.startTime || !period.endTime) continue;
          if (isHourInPeriod(h.hour, period.startTime, period.endTime)) {
            const cost = h.energyKwh * (period.pricePerKwh ?? 0);
            const labelUpper = (period.label ?? "").toUpperCase();
            if (labelUpper.includes("LWBP")) lwbpCost += cost;
            else if (labelUpper.includes("WBP")) wbpCost += cost;
            else otherCost += cost;
            break;
          }
        }
      }
    }

    const totalTarif = lwbpCost + wbpCost + otherCost;
    return {
      lwbp: lwbpCost > 0 ? lwbpCost : null,
      wbp: wbpCost > 0 ? wbpCost : null,
      totalTarif: totalTarif > 0 ? totalTarif : null,
    };
  }, [energyConfig, detail?.analytics.totalEnergyKwh, hourlyEnergyData]);

  const handleExportProcessed = async (
    format: ExportFormat,
    period: ExportPeriod,
  ) => {
    if (!detail) return;

    const fromDate = new Date(period.from);
    const toDate = new Date(period.to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime()))
      throw new Error("Periode export tidak valid");

    const start = fromDate <= toDate ? fromDate : toDate;
    const end = fromDate <= toDate ? toDate : fromDate;
    const periodLabel = `${start.toLocaleString("id-ID")} - ${end.toLocaleString("id-ID")}`;

    const res = await energyDashboardApi.getExportProcessed(
      scopeId,
      start.toISOString(),
      end.toISOString(),
    );
    if (!res.success || !res.data)
      throw new Error(res.error ?? "Gagal mengambil data export");

    const d = res.data;
    const {
      analytics,
      hourlyBuckets,
      dailyBuckets,
      scope: s,
      devices: devs,
    } = d;

    const L = {
      waktu: "Waktu",
      energy: "Energy (kWh)",
      reactive: "Reactive (kVArh)",
      power: "Avg Power (kW)",
      voltR: "Avg Voltage R (V)",
      voltS: "Avg Voltage S (V)",
      voltT: "Avg Voltage T (V)",
      currR: "Avg Current R (A)",
      currS: "Avg Current S (A)",
      currT: "Avg Current T (A)",
      currTotal: "Avg Current Total (A)",
      pf: "Avg Power Factor",
      freq: "Avg Frequency (Hz)",
    } as const;

    const bucketToExcelRow = (
      b: ExportProcessedHourBucket,
    ): Record<string, string | number | null> => ({
      [L.waktu]: b.label,
      [L.energy]: b.energyKwh ?? "-",
      [L.reactive]: b.avgKvarh ?? "-",
      [L.power]: b.avgPowerKw ?? "-",
      [L.voltR]: b.avgVoltL1 ?? "-",
      [L.voltS]: b.avgVoltL2 ?? "-",
      [L.voltT]: b.avgVoltL3 ?? "-",
      [L.currR]: b.avgCurrL1 ?? "-",
      [L.currS]: b.avgCurrL2 ?? "-",
      [L.currT]: b.avgCurrL3 ?? "-",
      [L.currTotal]: b.avgCurrTotal ?? "-",
      [L.pf]: b.avgPf ?? "-",
      [L.freq]: b.avgFreq ?? "-",
    });

    const bucketToPdfRow = (
      b: ExportProcessedHourBucket,
    ): Array<string | number> => [
      b.label,
      String(b.energyKwh ?? "-"),
      String(b.avgKvarh ?? "-"),
      String(b.avgPowerKw ?? "-"),
      String(b.avgVoltL1 ?? "-"),
      String(b.avgVoltL2 ?? "-"),
      String(b.avgVoltL3 ?? "-"),
      String(b.avgCurrL1 ?? "-"),
      String(b.avgCurrL2 ?? "-"),
      String(b.avgCurrL3 ?? "-"),
      String(b.avgCurrTotal ?? "-"),
      String(b.avgPf ?? "-"),
      String(b.avgFreq ?? "-"),
    ];

    const pdfCols = [
      L.waktu,
      L.energy,
      L.reactive,
      L.power,
      L.voltR,
      L.voltS,
      L.voltT,
      L.currR,
      L.currS,
      L.currT,
      L.currTotal,
      L.pf,
      L.freq,
    ];

    const analyticsRows: Array<[string, string | number]> = [
      ["Waktu Peak", analytics.peakLabel ?? "-"],
      ["Peak Power (kW)", analytics.peakPowerKw],
      ["Total Energy (kWh)", analytics.totalEnergyKwh],
      ["Total Reactive (kVArh)", analytics.totalKvarh],
      ["Avg Energy (kWh)", analytics.avgEnergyKwh],
      ["Avg Power (kW)", analytics.avgPowerKw],
      ["Avg Voltage (V)", analytics.avgVoltageV],
      ["Avg Current (A)", analytics.avgCurrentA],
      ["Avg Power Factor", analytics.avgPf],
      ["Avg Frequency (Hz)", analytics.avgFreqHz],
    ];

    const deviceExcelRows = devs.map((dev) => ({
      "Nama Device": dev.name,
      "Serial No": dev.serialNo,
      Lokasi: dev.locationName ?? "-",
      "Tipe Lokasi": dev.locationType ?? "-",
      Status: dev.status,
      "Terakhir Online": dev.lastSeenAt
        ? new Date(dev.lastSeenAt).toLocaleString("id-ID")
        : "-",
      Modul: dev.moduleTypes.join(", ") || "-",
    }));

    const infoDeviceCols = [
      "Nama Device",
      "Serial No",
      "Lokasi",
      "Tipe",
      "Status",
      "Terakhir Online",
      "Modul",
    ];
    const devicePdfRows = devs.map((dev) => [
      dev.name,
      dev.serialNo,
      dev.locationName ?? "-",
      dev.locationType ?? "-",
      dev.status,
      dev.lastSeenAt ? new Date(dev.lastSeenAt).toLocaleString("id-ID") : "-",
      dev.moduleTypes.join(", ") || "-",
    ]);

    const summaryBlock = [
      `Outlet: ${s.name}`,
      `Region: ${s.region ?? "-"}`,
      `Alamat: ${s.address ?? "-"}`,
      `Periode: ${periodLabel}`,
      `Capacity (VA): ${s.capacityVa ?? "-"}`,
      `Jumlah Device: ${devs.length}`,
    ];

    if (format === "excel") {
      const sheets: Array<{
        name: string;
        rows: Array<Record<string, string | number | null>>;
      }> = [];
      sheets.push({
        name: "Summary",
        rows: [
          {
            Outlet: s.name,
            Region: s.region ?? "-",
            Alamat: s.address ?? "-",
            Periode: periodLabel,
            "Capacity (VA)": s.capacityVa ?? "-",
            "Jumlah Device": devs.length,
          },
        ],
      });
      sheets.push({ name: "Info Device", rows: deviceExcelRows });
      sheets.push({
        name: "Analytics",
        rows: [Object.fromEntries(analyticsRows)],
      });

      if (!d.period.isSingleDay) {
        sheets.push({
          name: "Pemakaian (Per Hari)",
          rows: dailyBuckets.map(bucketToExcelRow),
        });
        for (const dayBucket of dailyBuckets) {
          const sheetName = `Per Jam ${dayBucket.label}`.slice(0, 31);
          if (dayBucket.hours.length > 0) {
            sheets.push({
              name: sheetName,
              rows: dayBucket.hours.map(bucketToExcelRow),
            });
          }
        }
      } else {
        sheets.push({
          name: "Pemakaian (Per Jam)",
          rows: hourlyBuckets.map(bucketToExcelRow),
        });
      }

      await exportToExcel(`outlet-processed-${s.id}.xlsx`, sheets);
    } else {
      const tables: Array<{
        title: string;
        columns: string[];
        rows: Array<Array<string | number>>;
      }> = [];
      tables.push({
        title: "Info Device",
        columns: infoDeviceCols,
        rows: devicePdfRows,
      });
      tables.push({
        title: "Analytics",
        columns: ["Metrik", "Nilai"],
        rows: analyticsRows,
      });

      if (!d.period.isSingleDay) {
        tables.push({
          title: "Pemakaian (Per Hari)",
          columns: pdfCols,
          rows: dailyBuckets.map(bucketToPdfRow),
        });
        for (const dayBucket of dailyBuckets) {
          if (dayBucket.hours.length > 0) {
            tables.push({
              title: `Pemakaian Per Jam — ${dayBucket.label}`,
              columns: pdfCols,
              rows: dayBucket.hours.map(bucketToPdfRow),
            });
          }
        }
      } else {
        tables.push({
          title: "Pemakaian (Per Jam)",
          columns: pdfCols,
          rows: hourlyBuckets.map(bucketToPdfRow),
        });
      }

      await exportToPdf({
        fileName: `outlet-processed-${s.id}.pdf`,
        title: "Aggregated Data Outlet",
        scopeName: s.name,
        period: periodLabel,
        generatedAt: new Date().toLocaleString("id-ID"),
        summary: summaryBlock,
        tables,
      });
    }
  };

  const handleExportRaw = async (
    format: ExportFormat,
    period: ExportPeriod,
  ) => {
    if (!detail) return;

    const fromDate = new Date(period.from);
    const toDate = new Date(period.to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime()))
      throw new Error("Periode export tidak valid");

    const start = fromDate <= toDate ? fromDate : toDate;
    const end = fromDate <= toDate ? toDate : fromDate;
    const periodLabel = `${start.toLocaleString("id-ID")} - ${end.toLocaleString("id-ID")}`;

    const res = await energyDashboardApi.getExportRaw(
      scopeId,
      start.toISOString(),
      end.toISOString(),
    );
    if (!res.success || !res.data)
      throw new Error(res.error ?? "Gagal mengambil data export");

    const { rows, scope: s, devices: devs } = res.data;

    const normPower = (v: number | null): number | null =>
      v === null ? null : Number((v > 1000 ? v / 1000 : v).toFixed(3));

    const MONTHS = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ] as const;
    const fmtTs = (ts: string): string => {
      try {
        const d = new Date(ts);
        return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      } catch {
        return ts;
      }
    };

    const L = {
      waktu: "Waktu",
      pfR: "Power Factor R",
      pfS: "Power Factor S",
      pfT: "Power Factor T",
      pfAvg: "Power Factor Avg",
      vRLN: "Voltage R L-N (V)",
      vSLN: "Voltage S L-N (V)",
      vTLN: "Voltage T L-N (V)",
      vRSLL: "Voltage RS L-L (V)",
      vSTLL: "Voltage ST L-L (V)",
      vTRLL: "Voltage TR L-L (V)",
      aR: "Current R (A)",
      aS: "Current S (A)",
      aT: "Current T (A)",
      aTotal: "Current Total (A)",
      pR: "Power R (kW)",
      pS: "Power S (kW)",
      pT: "Power T (kW)",
      pTotal: "Power Total (kW)",
      qR: "Reactive R (VAR)",
      qS: "Reactive S (VAR)",
      qT: "Reactive T (VAR)",
      qTotal: "Reactive Total (VAR)",
      vaR: "Apparent R (VA)",
      vaS: "Apparent S (VA)",
      vaT: "Apparent T (VA)",
      vaTotal: "Apparent Total (VA)",
      kWh: "Energy (kWh)",
      kVArh: "Reactive (kVArh)",
      hz: "Frequency (Hz)",
    } as const;

    const deviceExcelRows = devs.map((dev) => ({
      "Nama Device": dev.name,
      "Serial No": dev.serialNo,
      Lokasi: dev.locationName ?? "-",
      "Tipe Lokasi": dev.locationType ?? "-",
      Status: dev.status,
      "Terakhir Online": dev.lastSeenAt
        ? new Date(dev.lastSeenAt).toLocaleString("id-ID")
        : "-",
      Modul: dev.moduleTypes.join(", ") || "-",
    }));
    const infoDeviceCols = [
      "Nama Device",
      "Serial No",
      "Lokasi",
      "Tipe",
      "Status",
      "Terakhir Online",
      "Modul",
    ];
    const devicePdfRows = devs.map((dev) => [
      dev.name,
      dev.serialNo,
      dev.locationName ?? "-",
      dev.locationType ?? "-",
      dev.status,
      dev.lastSeenAt ? new Date(dev.lastSeenAt).toLocaleString("id-ID") : "-",
      dev.moduleTypes.join(", ") || "-",
    ]);

    const summaryData = {
      Outlet: s.name,
      Region: s.region ?? "-",
      Alamat: s.address ?? "-",
      Periode: periodLabel,
      "Capacity (VA)": s.capacityVa ?? "-",
      "Jumlah Device": devs.length,
    };

    if (format === "excel") {
      const rawDataRows = rows.map((r) => ({
        [L.waktu]: fmtTs(r.timestamp),
        [L.pfR]: r.pf_a,
        [L.pfS]: r.pf_b,
        [L.pfT]: r.pf_c,
        [L.pfAvg]: r.pf_sigma,
        [L.vRLN]: r.voltage_l1,
        [L.vSLN]: r.voltage_l2,
        [L.vTLN]: r.voltage_l3,
        [L.vRSLL]: r.voltage_ab,
        [L.vSTLL]: r.voltage_bc,
        [L.vTRLL]: r.voltage_ca,
        [L.aR]: r.current_l1,
        [L.aS]: r.current_l2,
        [L.aT]: r.current_l3,
        [L.aTotal]: r.current_total,
        [L.pR]: normPower(r.power_l1),
        [L.pS]: normPower(r.power_l2),
        [L.pT]: normPower(r.power_l3),
        [L.pTotal]: normPower(r.power_total),
        [L.qR]: r.reactive_l1,
        [L.qS]: r.reactive_l2,
        [L.qT]: r.reactive_l3,
        [L.qTotal]: r.reactive_sigma,
        [L.vaR]: r.va_a,
        [L.vaS]: r.va_b,
        [L.vaT]: r.va_c,
        [L.vaTotal]: r.va_sigma,
        [L.kWh]: r.energy_total,
        [L.kVArh]: r.kvarh,
        [L.hz]: r.frequency,
      }));

      await exportToExcel(`outlet-raw-${s.id}.xlsx`, [
        { name: "Summary", rows: [summaryData] },
        { name: "Info Device", rows: deviceExcelRows },
        { name: "Historical Data", rows: rawDataRows },
      ]);
    } else {
      const pdfRawCols = [
        L.waktu,
        L.pfAvg,
        L.vRLN,
        L.vSLN,
        L.vTLN,
        L.aTotal,
        L.pTotal,
        L.qTotal,
        L.vaTotal,
        L.kWh,
        L.kVArh,
        L.hz,
      ];

      await exportToPdf({
        fileName: `outlet-raw-${s.id}.pdf`,
        title: "Raw Data Outlet",
        scopeName: s.name,
        period: periodLabel,
        generatedAt: new Date().toLocaleString("id-ID"),
        summary: [
          `Outlet: ${s.name}`,
          `Region: ${s.region ?? "-"}`,
          `Alamat: ${s.address ?? "-"}`,
          `Periode: ${periodLabel}`,
          `Capacity (VA): ${s.capacityVa ?? "-"}`,
          `Jumlah Device: ${devs.length}`,
          "Catatan: PDF menampilkan kolom ringkasan (Total). Data lengkap per fase tersedia di ekspor Excel.",
        ],
        tables: [
          {
            title: "Info Device",
            columns: infoDeviceCols,
            rows: devicePdfRows,
          },
          {
            title: "Historical Data (Ringkasan)",
            columns: pdfRawCols,
            rows: rows.map((r) => [
              fmtTs(r.timestamp),
              String(r.pf_sigma ?? "-"),
              String(r.voltage_l1 ?? "-"),
              String(r.voltage_l2 ?? "-"),
              String(r.voltage_l3 ?? "-"),
              String(r.current_total ?? "-"),
              String(normPower(r.power_total) ?? "-"),
              String(r.reactive_sigma ?? "-"),
              String(r.va_sigma ?? "-"),
              String(r.energy_total ?? "-"),
              String(r.kvarh ?? "-"),
              String(r.frequency ?? "-"),
            ]),
          },
        ],
      });
    }
  };

  const exportOptions: ExportOption[] = useMemo(
    () => [
      {
        value: "processed",
        label: "Aggregated Data",
        description: "Pemakaian & analytics per periode",
        icon: <BarChart2 className="h-4 w-4" />,
        onExport: handleExportProcessed,
      },
      {
        value: "raw",
        label: "Raw Data",
        description: "Semua data mentah dari device",
        icon: <Database className="h-4 w-4" />,
        onExport: handleExportRaw,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detail, scopeId],
  );

  const overlayLabel = useMemo(() => {
    if (dateRange.preset === "custom" && (!dateRange.from || !dateRange.to)) {
      return "Load data...";
    }
    return `Load data ${rangeDateLabel(dateRange)}`;
  }, [dateRange]);

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl bg-muted/30 animate-pulse h-80" />
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
        className="p-5 space-y-6"
        initial="hidden"
        animate="visible"
        variants={container}
      >
        <motion.div
          variants={itemVariant}
          className="flex items-center justify-between flex-wrap gap-3"
        >
          <div className="flex items-center gap-3">
            <Link href="/dashboard/electricity">
              <ArrowLeft className="w-9 h-9 rounded-full border p-2 transition-colors border-border text-muted-foreground hover:text-foreground hover:border-foreground" />
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
                {detail?.name ?? "Outlet Detail"}
              </h1>
              <p className="text-base sm:text-sm text-muted-foreground mt-0.5">
                {detail?.address ?? detail?.region ?? ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DateFilter value={dateRange} onChange={handleDateRangeChange} />
            <ExportModal
              options={exportOptions}
              disabled={!detail || loading}
            />
          </div>
        </motion.div>

        <motion.div
          variants={itemVariant}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch"
        >
          <RealtimePowerCard
            scopeId={scopeId}
            powerTotal={pmValues.powerTotal}
            apparentTotal={pmValues.vaSigma}
            capacityVa={detail?.capacityVa ?? null}
            isOffline={isOffline}
            lastUpdated={realtimeLastUpdated}
            refreshTick={refreshTick}
            dateRange={dateRange}
            dateRangeLabel={overlayLabel}
          />
          <div className="lg:col-span-2">
            <PowerMeterCard values={pmValues} tarif={tarifValues} />
          </div>
        </motion.div>

        {detail && (
          <motion.div
            variants={itemVariant}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          >
            <div className="relative">
              <DataLoadingOverlay
                isLoading={dataLoading}
                label={overlayLabel}
              />
              <EnergyChartCard
                scopeId={scopeId}
                timeSeries={timeSeries}
                loadedFrom={dateRange.from}
                loadedTo={dateRange.to}
              />
            </div>
            <div className="relative">
              <DataLoadingOverlay
                isLoading={dataLoading}
                label={overlayLabel}
              />
              <PowerChartCard
                timeSeries={timeSeries}
                loadedFrom={dateRange.from}
                loadedTo={dateRange.to}
              />
            </div>
          </motion.div>
        )}

        {detail && (
          <motion.div variants={itemVariant}>
            <div className="relative">
              <DataLoadingOverlay
                isLoading={dataLoading}
                label={overlayLabel}
              />
              <TrendChartCard
                timeSeries={timeSeries}
                loadedFrom={dateRange.from}
                loadedTo={dateRange.to}
              />
            </div>
          </motion.div>
        )}

        {detail && (
          <motion.div variants={itemVariant}>
            <HourlyEnergyCard scopeId={scopeId} />
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
