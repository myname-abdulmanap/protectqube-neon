"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { MapPinned } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/ui/page-transition";
import {
  energyDashboardApi,
  scopesApi,
  devicesApi,
  deviceMetricsApi,
  type Scope,
  type Device,
  type EnergyOverviewData,
} from "@/lib/api";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import {
  MonthlyEnergyChart,
  EnergyTrendChart,
  PeakHoursChart,
  OutletComparisonChart,
  EnergyDistributionDonut,
  TotalMetricsChart,
} from "@/components/dashboard/EnergyAnalyticsCharts";
import {
  TopOutletsList,
  LowOutletsList,
} from "@/components/dashboard/OutletLists";
import {
  createDefaultRange,
  type DateRange,
} from "@/components/dashboard/ChartDateFilter";
import type { MapOutlet } from "@/components/dashboard/OpenLayersMap";

const OpenLayersMap = dynamic(
  () =>
    import("@/components/dashboard/OpenLayersMap").then(
      (mod) => mod.OpenLayersMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[400px] items-center justify-center rounded-lg bg-muted/30 text-sm text-muted-foreground">
        Loading map...
      </div>
    ),
  },
);

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

type EnergyOverviewPageProps = {
  forcedTenantId?: string;
};

export function EnergyOverviewPage({
  forcedTenantId,
}: EnergyOverviewPageProps = {}) {
  // ── State ──────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Raw data
  const [overviewData, setOverviewData] = useState<EnergyOverviewData | null>(
    null,
  );
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);

  // Filter ranges for each chart section
  const [globalRange, setGlobalRange] = useState<DateRange>(createDefaultRange);
  const [peakRange, setPeakRange] = useState<DateRange>(createDefaultRange);
  const [lowRange, setLowRange] = useState<DateRange>(createDefaultRange);
  const [trendRange, setTrendRange] = useState<DateRange>(createDefaultRange);
  const [hoursRange, setHoursRange] = useState<DateRange>(createDefaultRange);
  const [metricsRange, setMetricsRange] =
    useState<DateRange>(createDefaultRange);
  const [comparisonRange, setComparisonRange] =
    useState<DateRange>(createDefaultRange);

  // Metrics for analytics charts
  const [hourlyMetrics, setHourlyMetrics] = useState<
    Array<{ hour: string; kWh: number }>
  >([]);
  const [dailyMetrics, setDailyMetrics] = useState<
    Array<{ label: string; kWh: number }>
  >([]);
  const [voltageData, setVoltageData] = useState<
    Array<{ label: string; value: number }>
  >([]);
  const [currentData, setCurrentData] = useState<
    Array<{ label: string; value: number }>
  >([]);
  const [powerData, setPowerData] = useState<
    Array<{ label: string; value: number }>
  >([]);

  // ── Load core data ─────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters =
        globalRange.preset === "all"
          ? { from: "2024-01-01T00:00:00.000Z", to: new Date().toISOString() }
          : { from: globalRange.from, to: globalRange.to };

      const [overviewRes, scopesRes, devicesRes] = await Promise.all([
        energyDashboardApi.getOverview(filters),
        forcedTenantId ? scopesApi.getAll(forcedTenantId) : scopesApi.getAll(),
        devicesApi.getAll(),
      ]);

      if (overviewRes.success && overviewRes.data) {
        setOverviewData(overviewRes.data);
      } else {
        setError(overviewRes.error || "Failed to load overview data");
      }

      if (scopesRes.success && scopesRes.data) {
        setScopes(forcedTenantId ? scopesRes.data : scopesRes.data);
      }

      if (devicesRes.success && devicesRes.data) {
        setDevices(devicesRes.data);
      }
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [globalRange, forcedTenantId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // ── Load hourly metrics for peak hours chart ───
  useEffect(() => {
    let active = true;
    const loadHourly = async () => {
      const filters: Record<string, string | number> = {
        metricKey: "energy_total",
        limit: 5000,
      };
      if (hoursRange.preset !== "all") {
        filters.from = hoursRange.from;
        filters.to = hoursRange.to;
      }
      const metricsRes = await deviceMetricsApi.getAll(filters);
      if (!active) return;
      if (metricsRes.success && metricsRes.data) {
        const hourMap = new Map<string, number>();
        for (let h = 0; h < 24; h++) {
          hourMap.set(h.toString().padStart(2, "0"), 0);
        }
        for (const m of metricsRes.data) {
          const hour = format(parseISO(m.timestamp), "HH");
          hourMap.set(hour, (hourMap.get(hour) || 0) + m.metricValue);
        }
        setHourlyMetrics(
          Array.from(hourMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([hour, kWh]) => ({
              hour: `${hour}:00`,
              kWh: Number(kWh.toFixed(2)),
            })),
        );
      }
    };
    void loadHourly();
    return () => {
      active = false;
    };
  }, [hoursRange]);

  // ── Load daily metrics for trend chart ──────────
  useEffect(() => {
    let active = true;
    const loadDaily = async () => {
      const filters: Record<string, string | number> = {
        metricKey: "energy_total",
        limit: 10000,
      };
      if (trendRange.preset !== "all") {
        filters.from = trendRange.from;
        filters.to = trendRange.to;
      }
      const metricsRes = await deviceMetricsApi.getAll(filters);
      if (!active) return;
      if (metricsRes.success && metricsRes.data) {
        const dayMap = new Map<string, number>();
        for (const m of metricsRes.data) {
          const day = format(parseISO(m.timestamp), "dd MMM");
          dayMap.set(day, (dayMap.get(day) || 0) + m.metricValue);
        }
        setDailyMetrics(
          Array.from(dayMap.entries()).map(([label, kWh]) => ({
            label,
            kWh: Number(kWh.toFixed(2)),
          })),
        );
      }
    };
    void loadDaily();
    return () => {
      active = false;
    };
  }, [trendRange]);

  // ── Load all metrics (voltage, current, power) ───────
  useEffect(() => {
    let active = true;
    const loadMetrics = async () => {
      const baseFilters: Record<string, string | number> = { limit: 5000 };
      if (metricsRange.preset !== "all") {
        baseFilters.from = metricsRange.from;
        baseFilters.to = metricsRange.to;
      }

      const [voltageRes, currentRes, powerRes] = await Promise.all([
        deviceMetricsApi.getAll({ ...baseFilters, metricKey: "voltage_l1" }),
        deviceMetricsApi.getAll({ ...baseFilters, metricKey: "current_total" }),
        deviceMetricsApi.getAll({ ...baseFilters, metricKey: "power_total" }),
      ]);

      if (!active) return;

      const processData = (res: typeof voltageRes, decimals: number) => {
        if (!res.success || !res.data) return [];
        const map = new Map<string, { sum: number; count: number }>();
        for (const m of res.data) {
          const key = format(parseISO(m.timestamp), "dd MMM HH:00");
          const entry = map.get(key) || { sum: 0, count: 0 };
          entry.sum += m.metricValue;
          entry.count += 1;
          map.set(key, entry);
        }
        return Array.from(map.entries()).map(([label, { sum, count }]) => ({
          label,
          value: Number((sum / count).toFixed(decimals)),
        }));
      };

      setVoltageData(processData(voltageRes, 1));
      setCurrentData(processData(currentRes, 2));
      setPowerData(processData(powerRes, 2));
    };
    void loadMetrics();
    return () => {
      active = false;
    };
  }, [metricsRange]);

  // ── Derived data ───────────────────────────────
  const tenantScopeIds = useMemo(() => {
    if (!forcedTenantId) return null;
    return new Set(scopes.map((s) => s.id));
  }, [scopes, forcedTenantId]);

  const filteredOutlets = useMemo(() => {
    if (!overviewData) return [];
    if (!tenantScopeIds) return overviewData.outletLocations;
    return overviewData.outletLocations.filter((o) => tenantScopeIds.has(o.id));
  }, [overviewData, tenantScopeIds]);

  const filteredDevices = useMemo(() => {
    if (!tenantScopeIds) return devices;
    return devices.filter((d) => tenantScopeIds.has(d.scopeId));
  }, [devices, tenantScopeIds]);

  // Summary numbers
  const totalEnergy = useMemo(
    () => filteredOutlets.reduce((sum, o) => sum + o.usage, 0),
    [filteredOutlets],
  );
  const totalOutlets = filteredOutlets.length;
  const devicesOnline = useMemo(
    () =>
      filteredDevices.filter(
        (d) => d.status === "ACTIVE" || d.status === "active",
      ).length,
    [filteredDevices],
  );
  const devicesOffline = useMemo(
    () =>
      filteredDevices.filter(
        (d) => d.status !== "ACTIVE" && d.status !== "active",
      ).length,
    [filteredDevices],
  );

  // Map outlets
  const mapOutlets: MapOutlet[] = useMemo(() => {
    return filteredOutlets
      .filter((o) => o.lat != null && o.lng != null)
      .map((outlet) => {
        const outletDevices = filteredDevices.filter(
          (d) => d.scopeId === outlet.id,
        );
        const hasOnlineDevice = outletDevices.some(
          (d) => d.status === "ACTIVE" || d.status === "active",
        );
        return {
          id: outlet.id,
          name: outlet.name,
          address: outlet.address || outlet.city || outlet.region,
          totalEnergy: outlet.usage,
          lat: outlet.lat!,
          lng: outlet.lng!,
          online: hasOnlineDevice,
          devices: outletDevices.map((d) => ({
            id: d.id,
            name: d.name,
            online: d.status === "ACTIVE" || d.status === "active",
          })),
        };
      });
  }, [filteredOutlets, filteredDevices]);

  // Region energy for bar chart
  const regionData = useMemo(() => {
    if (!overviewData) return [];
    if (!tenantScopeIds) return overviewData.regionData;
    const regionMap = new Map<string, number>();
    for (const o of filteredOutlets) {
      const key = o.region || "Unknown";
      regionMap.set(key, (regionMap.get(key) || 0) + o.usage);
    }
    return Array.from(regionMap.entries()).map(([region, kWh]) => ({
      region,
      kWh: Number(kWh.toFixed(2)),
    }));
  }, [overviewData, tenantScopeIds, filteredOutlets]);

  // Peak energy per outlet (top 10)
  const peakOutletData = useMemo(() => {
    return [...filteredOutlets]
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10)
      .map((o) => ({
        name: o.name,
        region: o.region || "Unknown",
        kWh: Number(o.usage.toFixed(2)),
      }));
  }, [filteredOutlets]);

  // Low energy per outlet (bottom 10)
  const lowOutletData = useMemo(() => {
    return [...filteredOutlets]
      .sort((a, b) => a.usage - b.usage)
      .slice(0, 10)
      .map((o) => ({
        name: o.name,
        region: o.region || "Unknown",
        kWh: Number(o.usage.toFixed(2)),
      }));
  }, [filteredOutlets]);

  // Outlet comparison (all outlets)
  const comparisonData = useMemo(() => {
    return [...filteredOutlets]
      .sort((a, b) => b.usage - a.usage)
      .map((o) => ({ name: o.name, kWh: Number(o.usage.toFixed(2)) }));
  }, [filteredOutlets]);

  // Energy distribution for donut (top 8 regions)
  const donutData = useMemo(() => {
    return regionData.slice(0, 8).map((r) => ({ name: r.region, kWh: r.kWh }));
  }, [regionData]);

  // ── Render ─────────────────────────────────────
  return (
    <PageTransition>
      <motion.div
        className="space-y-1.5 p-0"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {error && (
          <motion.div
            variants={itemVariants}
            className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {error}
          </motion.div>
        )}

        {/* Summary Cards */}
        <motion.div variants={itemVariants}>
          <SummaryCards
            totalEnergy={totalEnergy}
            totalOutlets={totalOutlets}
            devicesOnline={devicesOnline}
            devicesOffline={devicesOffline}
            loading={loading}
          />
        </motion.div>

        {/* Main Content Grid: LEFT charts | RIGHT map */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-1.5">
          {/* ── LEFT COLUMN ── */}
          <div className="space-y-1.5">
            {/* Energy by Region */}
            <motion.div variants={itemVariants}>
              <MonthlyEnergyChart
                data={regionData}
                dateRange={globalRange}
                onDateChange={setGlobalRange}
                loading={loading}
              />
            </motion.div>

            {/* Outlet Comparison */}
            <motion.div variants={itemVariants}>
              <OutletComparisonChart
                data={comparisonData}
                dateRange={comparisonRange}
                onDateChange={setComparisonRange}
                loading={loading}
              />
            </motion.div>

            {/* Top Outlets + Low Outlets (LISTS) */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-2 gap-1.5"
            >
              <TopOutletsList
                data={peakOutletData}
                dateRange={peakRange}
                onDateChange={setPeakRange}
                loading={loading}
              />
              <LowOutletsList
                data={lowOutletData}
                dateRange={lowRange}
                onDateChange={setLowRange}
                loading={loading}
              />
            </motion.div>

            {/* Peak Hours (full width) */}
            <motion.div variants={itemVariants}>
              <PeakHoursChart
                data={hourlyMetrics}
                dateRange={hoursRange}
                onDateChange={setHoursRange}
                loading={loading}
              />
            </motion.div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-1.5">
            {/* Outlet Map */}
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="px-2 pt-1.5 pb-0">
                  <CardTitle className="text-[11px] font-semibold flex items-center gap-1.5">
                    <MapPinned className="h-3.5 w-3.5" />
                    Outlet Map
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-1.5 pt-1">
                  <OpenLayersMap outlets={mapOutlets} className="h-[260px]" />
                </CardContent>
              </Card>
            </motion.div>

            {/* Energy Distribution Donut */}
            <motion.div variants={itemVariants}>
              <EnergyDistributionDonut data={donutData} loading={loading} />
            </motion.div>

            {/* Energy Trend */}
            <motion.div variants={itemVariants}>
              <EnergyTrendChart
                data={dailyMetrics}
                dateRange={trendRange}
                onDateChange={setTrendRange}
                loading={loading}
              />
            </motion.div>

            {/* Total Metrics Chart (Power/Voltage/Current dropdown) */}
            <motion.div variants={itemVariants}>
              <TotalMetricsChart
                voltageData={voltageData}
                currentData={currentData}
                powerData={powerData}
                dateRange={metricsRange}
                onDateChange={setMetricsRange}
                loading={loading}
              />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </PageTransition>
  );
}

export default EnergyOverviewPage;
