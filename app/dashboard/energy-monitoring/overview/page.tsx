"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { MapPinned } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/ui/page-transition";
import {
  useEnergyOverview,
  useScopes,
  useDevices,
  useDeviceMetrics,
  useAggregatedMetrics,
} from "@/lib/use-energy-data";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import {
  MonthlyEnergyChart,
  PeakHoursChart,
  OutletComparisonChart,
  EnergyDistributionDonut,
  OverviewTrendChart,
} from "@/components/dashboard/EnergyAnalyticsCharts";
import {
  TopOutletsList,
  LowOutletsList,
} from "@/components/dashboard/OutletLists";
import {
  ChartDateFilter,
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
  const downsample = <T,>(arr: T[], maxPoints: number): T[] => {
    if (arr.length <= maxPoints) return arr;
    const step = Math.ceil(arr.length / maxPoints);
    return arr.filter((_, idx) => idx % step === 0);
  };

  // Single global filter for all overview components
  const [globalRange, setGlobalRange] = useState<DateRange>(createDefaultRange);

  // ── Build API filters from ranges ──────────────
  const globalFilters = useMemo(
    () =>
      globalRange.preset === "all"
        ? { from: "2024-01-01T00:00:00.000Z", to: new Date().toISOString() }
        : { from: globalRange.from, to: globalRange.to },
    [globalRange],
  );

  const metricLimit = useMemo(() => {
    switch (globalRange.preset) {
      case "today":
        return 400;
      case "yesterday":
        return 400;
      default:
        // For 7d, 30d, all - we'll use aggregated endpoint instead
        return 500;
    }
  }, [globalRange.preset]);

  // Use aggregation for longer ranges
  const useAggregation = ["7d", "30d", "all"].includes(globalRange.preset);
  const aggregationInterval = globalRange.preset === "7d" ? "hour" : "day";

  const metricBaseFilters = useMemo(() => {
    const base: Record<string, string | number> = {
      moduleType: "power_meter",
      limit: metricLimit,
    };
    if (globalRange.preset !== "all") {
      base.from = globalRange.from;
      base.to = globalRange.to;
    }
    return base;
  }, [globalRange, metricLimit]);

  const aggregatedParams = useMemo(() => {
    if (!useAggregation) return null;
    return {
      moduleType: "power_meter",
      from:
        globalRange.preset === "all"
          ? "2024-01-01T00:00:00.000Z"
          : globalRange.from,
      to: globalRange.to || new Date().toISOString(),
      interval: aggregationInterval as "hour" | "day",
    };
  }, [useAggregation, globalRange, aggregationInterval]);

  // ── SWR data fetching (cached + deduped) ───────
  const {
    data: overviewData,
    error: overviewError,
    isLoading: loading,
  } = useEnergyOverview(globalFilters);
  const { data: scopes } = useScopes(forcedTenantId);
  const { data: deviceList } = useDevices();
  const devices = useMemo(() => deviceList || [], [deviceList]);

  // Regular metrics for short ranges (today, yesterday)
  const { data: energyRaw } = useDeviceMetrics(
    useMemo(
      () =>
        useAggregation
          ? null
          : { ...metricBaseFilters, metricKey: "energy_total" },
      [metricBaseFilters, useAggregation],
    ),
  );
  const { data: voltageRaw } = useDeviceMetrics(
    useMemo(
      () =>
        useAggregation
          ? null
          : { ...metricBaseFilters, metricKey: "voltage_l1" },
      [metricBaseFilters, useAggregation],
    ),
  );
  const { data: currentRaw } = useDeviceMetrics(
    useMemo(
      () =>
        useAggregation
          ? null
          : { ...metricBaseFilters, metricKey: "current_total" },
      [metricBaseFilters, useAggregation],
    ),
  );
  const { data: powerRaw } = useDeviceMetrics(
    useMemo(
      () =>
        useAggregation
          ? null
          : { ...metricBaseFilters, metricKey: "power_total" },
      [metricBaseFilters, useAggregation],
    ),
  );

  // Aggregated metrics for long ranges (7d, 30d, all)
  const { data: aggregatedRaw } = useAggregatedMetrics(aggregatedParams);

  const error = overviewError?.message || null;

  // Helper to extract aggregated data by metricKey
  const getAggregatedByKey = useCallback(
    (key: string) => {
      if (!aggregatedRaw) return [];
      return aggregatedRaw.filter((m) => m.metricKey === key);
    },
    [aggregatedRaw],
  );

  // ── Peak Hours from power_total: average kW per hour ───────────────────
  const hourlyMetrics = useMemo(() => {
    // For aggregated data, use power_total from aggregated endpoint
    if (useAggregation) {
      const powerAgg = getAggregatedByKey("power_total");
      if (!powerAgg.length) return [];

      const hourMap = new Map<string, { sumKw: number; count: number }>();
      for (let h = 0; h < 24; h++) {
        hourMap.set(h.toString().padStart(2, "0"), { sumKw: 0, count: 0 });
      }
      for (const m of powerAgg) {
        const hour = format(parseISO(m.timestamp), "HH");
        const entry = hourMap.get(hour) || { sumKw: 0, count: 0 };
        entry.sumKw += m.avg;
        entry.count += 1;
        hourMap.set(hour, entry);
      }
      return Array.from(hourMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([hour, entry]) => ({
          hour: `${hour}:00`,
          powerKw: Number(
            (entry.count > 0 ? entry.sumKw / entry.count : 0).toFixed(2),
          ),
          samples: entry.count,
        }));
    }

    if (!powerRaw) return [];
    const hourMap = new Map<string, { sumKw: number; count: number }>();
    for (let h = 0; h < 24; h++) {
      hourMap.set(h.toString().padStart(2, "0"), { sumKw: 0, count: 0 });
    }
    for (const m of powerRaw) {
      const hour = format(parseISO(m.timestamp), "HH");
      const entry = hourMap.get(hour) || { sumKw: 0, count: 0 };
      const valueKw =
        (m.unit || "").toUpperCase() === "W"
          ? m.metricValue / 1000
          : m.metricValue;
      entry.sumKw += valueKw;
      entry.count += 1;
      hourMap.set(hour, entry);
    }
    return Array.from(hourMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, entry]) => ({
        hour: `${hour}:00`,
        powerKw: Number(
          (entry.count > 0 ? entry.sumKw / entry.count : 0).toFixed(2),
        ),
        samples: entry.count,
      }));
  }, [powerRaw, useAggregation, getAggregatedByKey]);

  // ── Transform daily metrics ────────────────────
  const dailyMetrics = useMemo(() => {
    if (useAggregation) {
      const energyAgg = getAggregatedByKey("energy_total");
      if (!energyAgg.length) return [];
      return energyAgg.map((m) => ({
        label: format(parseISO(m.timestamp), "dd MMM"),
        kWh: Number(m.avg.toFixed(2)),
      }));
    }

    if (!energyRaw) return [];
    const dayMap = new Map<string, number>();
    for (const m of energyRaw) {
      const day = format(parseISO(m.timestamp), "dd MMM");
      dayMap.set(day, (dayMap.get(day) || 0) + m.metricValue);
    }
    const points = Array.from(dayMap.entries()).map(([label, kWh]) => ({
      label,
      kWh: Number(kWh.toFixed(2)),
    }));
    return downsample(points, 240);
  }, [energyRaw, useAggregation, getAggregatedByKey]);

  const voltageData = useMemo(() => {
    if (useAggregation) {
      const voltageAgg = getAggregatedByKey("voltage_l1");
      if (!voltageAgg.length) return [];
      return voltageAgg.map((m) => ({
        label: format(parseISO(m.timestamp), "dd MMM HH:00"),
        value: Number(m.avg.toFixed(1)),
      }));
    }

    if (!voltageRaw) return [];
    const map = new Map<string, { sum: number; count: number }>();
    for (const m of voltageRaw) {
      const key = format(parseISO(m.timestamp), "dd MMM HH:00");
      const entry = map.get(key) || { sum: 0, count: 0 };
      entry.sum += m.metricValue;
      entry.count += 1;
      map.set(key, entry);
    }
    const points = Array.from(map.entries()).map(([label, { sum, count }]) => ({
      label,
      value: Number((sum / count).toFixed(1)),
    }));
    return downsample(points, 300);
  }, [voltageRaw, useAggregation, getAggregatedByKey]);

  const currentData = useMemo(() => {
    if (useAggregation) {
      const currentAgg = getAggregatedByKey("current_total");
      if (!currentAgg.length) return [];
      return currentAgg.map((m) => ({
        label: format(parseISO(m.timestamp), "dd MMM HH:00"),
        value: Number(m.avg.toFixed(2)),
      }));
    }

    if (!currentRaw) return [];
    const map = new Map<string, { sum: number; count: number }>();
    for (const m of currentRaw) {
      const key = format(parseISO(m.timestamp), "dd MMM HH:00");
      const entry = map.get(key) || { sum: 0, count: 0 };
      entry.sum += m.metricValue;
      entry.count += 1;
      map.set(key, entry);
    }
    const points = Array.from(map.entries()).map(([label, { sum, count }]) => ({
      label,
      value: Number((sum / count).toFixed(2)),
    }));
    return downsample(points, 300);
  }, [currentRaw, useAggregation, getAggregatedByKey]);

  const powerData = useMemo(() => {
    if (useAggregation) {
      const powerAgg = getAggregatedByKey("power_total");
      if (!powerAgg.length) return [];
      return powerAgg.map((m) => ({
        label: format(parseISO(m.timestamp), "dd MMM HH:00"),
        value: Number(m.avg.toFixed(2)),
      }));
    }

    if (!powerRaw) return [];
    const map = new Map<string, { sum: number; count: number }>();
    for (const m of powerRaw) {
      const key = format(parseISO(m.timestamp), "dd MMM HH:00");
      const entry = map.get(key) || { sum: 0, count: 0 };
      entry.sum += m.metricValue;
      entry.count += 1;
      map.set(key, entry);
    }
    const points = Array.from(map.entries()).map(([label, { sum, count }]) => ({
      label,
      value: Number((sum / count).toFixed(2)),
    }));
    return downsample(points, 300);
  }, [powerRaw, useAggregation, getAggregatedByKey]);

  // Derived data
  const tenantScopeIds = useMemo(() => {
    if (!forcedTenantId || !scopes) return null;
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
      filteredDevices.filter((d) => {
        const normalized = (d.deviceStatus || d.status || "").toLowerCase();
        return normalized === "online";
      }).length,
    [filteredDevices],
  );
  const devicesOffline = useMemo(
    () => filteredDevices.length - devicesOnline,
    [filteredDevices, devicesOnline],
  );

  // Map outlets with region + address (all outlets with coordinates)
  const mapOutlets: MapOutlet[] = useMemo(() => {
    // Show all outlets or just those with coords - try to include all but prioritize those with coords
    return filteredOutlets
      .map((outlet) => {
        const outletDevices = filteredDevices.filter(
          (d) => d.scopeId === outlet.id,
        );
        const hasOnlineDevice = outletDevices.some(
          (d) => (d.deviceStatus || d.status || "").toLowerCase() === "online",
        );
        return {
          id: outlet.id,
          name: outlet.name,
          address: `${outlet.address ? outlet.address + ", " : ""}${outlet.region || "Unknown"}`,
          totalEnergy: outlet.usage,
          // Use device coordinates when available; fallback to scope coordinates.
          lat:
            outletDevices.length > 0
              ? Number(
                  (
                    outletDevices
                      .filter(
                        (d) =>
                          Number.isFinite(d.latitude) &&
                          Number.isFinite(d.longitude),
                      )
                      .reduce((sum, d) => sum + Number(d.latitude), 0) /
                    Math.max(
                      1,
                      outletDevices.filter(
                        (d) =>
                          Number.isFinite(d.latitude) &&
                          Number.isFinite(d.longitude),
                      ).length,
                    )
                  ).toFixed(6),
                ) ||
                outlet.lat ||
                -7.25
              : outlet.lat || -7.25,
          lng:
            outletDevices.length > 0
              ? Number(
                  (
                    outletDevices
                      .filter(
                        (d) =>
                          Number.isFinite(d.latitude) &&
                          Number.isFinite(d.longitude),
                      )
                      .reduce((sum, d) => sum + Number(d.longitude), 0) /
                    Math.max(
                      1,
                      outletDevices.filter(
                        (d) =>
                          Number.isFinite(d.latitude) &&
                          Number.isFinite(d.longitude),
                      ).length,
                    )
                  ).toFixed(6),
                ) ||
                outlet.lng ||
                110.0
              : outlet.lng || 110.0,
          online: hasOnlineDevice,
          devices: outletDevices.map((d) => ({
            id: d.id,
            name: d.name,
            online:
              (d.deviceStatus || d.status || "").toLowerCase() === "online",
          })),
        };
      })
      .sort((a, b) => b.totalEnergy - a.totalEnergy);
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
        className="space-y-3 p-0"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
        >
          <div>
            <h2 className="text-base font-semibold">Dashboard Overview</h2>
            <p className="text-sm text-muted-foreground">
              Overview keseluruhan outlet dan pemakaian energi. Gunakan filter
              tanggal untuk analisis lebih detail.
            </p>
          </div>
          <ChartDateFilter value={globalRange} onChange={setGlobalRange} />
        </motion.div>

        {error && (
          <motion.div
            variants={itemVariants}
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
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
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-3">
          {/* ── LEFT COLUMN ── */}
          <div className="min-w-0 space-y-3">
            {/* Energy by Region */}
            <motion.div variants={itemVariants}>
              <MonthlyEnergyChart
                data={regionData}
                dateRange={globalRange}
                onDateChange={setGlobalRange}
                loading={loading}
                showDateFilter={false}
              />
            </motion.div>

            {/* Outlet Comparison */}
            <motion.div variants={itemVariants}>
              <OutletComparisonChart
                data={comparisonData}
                dateRange={globalRange}
                onDateChange={setGlobalRange}
                loading={loading}
                showDateFilter={false}
              />
            </motion.div>

            {/* Top Outlets + Low Outlets (LISTS) */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <TopOutletsList
                data={peakOutletData}
                dateRange={globalRange}
                onDateChange={setGlobalRange}
                loading={loading}
                showDateFilter={false}
              />
              <LowOutletsList
                data={lowOutletData}
                dateRange={globalRange}
                onDateChange={setGlobalRange}
                loading={loading}
                showDateFilter={false}
              />
            </motion.div>

            {/* Peak Hours (full width) */}
            <motion.div variants={itemVariants}>
              <PeakHoursChart
                data={hourlyMetrics}
                dateRange={globalRange}
                onDateChange={setGlobalRange}
                loading={loading}
                showDateFilter={false}
                totalDevices={filteredDevices.length}
                devicesOnline={devicesOnline}
              />
            </motion.div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="min-w-0 space-y-3">
            {/* Outlet Map with Region and Address Info */}
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="px-4 pt-3 pb-1">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <MapPinned className="h-4 w-4" />
                    Outlet Map
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Lokasi outlet yang terdaftar. Klik pin untuk detail.
                  </p>
                </CardHeader>
                <CardContent className="p-3 pt-2">
                  <OpenLayersMap outlets={mapOutlets} className="h-[280px]" />
                  <div className="mt-2 flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      <span className="text-green-600 font-medium">
                        {devicesOnline} Online
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span className="text-red-500 font-medium">
                        {devicesOffline} Offline
                      </span>
                    </span>
                    <span className="text-muted-foreground ml-auto">
                      {totalOutlets} outlet total
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Energy Distribution Donut */}
            <motion.div variants={itemVariants}>
              <EnergyDistributionDonut data={donutData} loading={loading} />
            </motion.div>

            {/* Trend chart (like electricity detail) */}
            <motion.div variants={itemVariants}>
              <OverviewTrendChart
                energyData={dailyMetrics}
                voltageData={voltageData}
                currentData={currentData}
                powerData={powerData}
                dateRange={globalRange}
                onDateChange={setGlobalRange}
                loading={loading}
                showDateFilter={false}
              />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </PageTransition>
  );
}

export default EnergyOverviewPage;
