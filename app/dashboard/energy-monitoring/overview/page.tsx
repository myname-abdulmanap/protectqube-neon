"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { MapPinned, Zap, Activity, AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/ui/page-transition";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHeaderPage } from "@/components/providers/HeaderPageProvider";

import { SummaryCards } from "@/components/dashboard/SummaryCards";
import {
  AvgHourlyConsumptionChart,
  EnergyDistributionDonut,
  HourlyEnergyConsumptionChart,
  MonthlyEnergyChart,
  MonthlyEnergyUsageChart,
  OutletComparisonChart,
} from "@/components/dashboard/EnergyAnalyticsCharts";
import {
  TopOutletsList,
  LowOutletsList,
} from "@/components/dashboard/OutletLists";
import {
  DateFilter,
  buildRange,
  type DateRange,
} from "@/components/electricity/detail/DateFilter";
import type { DateRange as ChartDateRange } from "@/components/dashboard/ChartDateFilter";
import type { MapOutlet } from "@/components/dashboard/OpenLayersMap";

import {
  useEnergyOverview,
  useScopes,
  useTenants,
} from "@/lib/use-energy-data";
import { deviceMetricsApi } from "@/lib/api";
import {
  MidnightEnergyOverviewCard,
  type OverviewMidnightPoint,
} from "@/components/dashboard/MidnightEnergyOverviewCard";

const OpenLayersMap = dynamic(
  () =>
    import("@/components/dashboard/OpenLayersMap").then(
      (mod) => mod.OpenLayersMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] items-center justify-center rounded-lg bg-muted/30 text-sm text-muted-foreground">
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

const DISPLAY_TIMEZONE = "Asia/Jakarta";
const DAY_MS = 24 * 60 * 60 * 1000;

const getJakartaDateTimeParts = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DISPLAY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
  };
};

const buildLastDayKeys = (
  referenceDate: Date = new Date(),
  totalDays: number,
) => {
  const keys: string[] = [];
  for (let i = totalDays - 1; i >= 0; i -= 1) {
    const d = new Date(referenceDate.getTime() - i * DAY_MS);
    const p = getJakartaDateTimeParts(d);
    keys.push(`${p.year}-${p.month}-${p.day}`);
  }
  return keys;
};

const buildLast7DayKeys = (referenceDate: Date = new Date()) =>
  buildLastDayKeys(referenceDate, 7);

const buildEmptyMidnightPoints = (
  referenceDate: Date = new Date(),
): OverviewMidnightPoint[] => {
  const weekdayFormatterLong = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    timeZone: DISPLAY_TIMEZONE,
  });
  const weekdayFormatterShort = new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    timeZone: DISPLAY_TIMEZONE,
  });
  const dateFormatter = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    timeZone: DISPLAY_TIMEZONE,
  });

  return buildLast7DayKeys(referenceDate).map((dayKey) => {
    const currentDay = new Date(`${dayKey}T00:00:00+07:00`);
    const previousDay = new Date(currentDay.getTime() - DAY_MS);
    return {
      key: dayKey,
      transitionLabel: `${weekdayFormatterLong.format(previousDay)} - ${weekdayFormatterLong.format(currentDay)}`,
      shortLabel: `${weekdayFormatterShort.format(previousDay)}-${weekdayFormatterShort.format(currentDay)}`,
      dateLabel: dateFormatter.format(currentDay),
      energyKwh: null,
      contributingOutlets: 0,
    };
  });
};

type EnergyOverviewPageProps = {
  forcedTenantId?: string;
};

type FilterValue = "all" | string;

export function EnergyOverviewPage({
  forcedTenantId,
}: EnergyOverviewPageProps = {}) {
  const [tenantFilter, setTenantFilter] = useState<FilterValue>(
    forcedTenantId ?? "all",
  );
  const [scopeFilter, setScopeFilter] = useState<FilterValue>("all");
  const [globalRange, setGlobalRange] = useState<DateRange>(
    buildRange("today"),
  );
  const [midnightPoints, setMidnightPoints] = useState<OverviewMidnightPoint[]>(
    () => buildEmptyMidnightPoints(),
  );
  const [midnightLoading, setMidnightLoading] = useState(false);
  const [todayPartialKwh, setTodayPartialKwh] = useState<number | null>(null);

  const { setTitle, setFilterSlot } = useHeaderPage();

  useEffect(() => {
    setTitle("Dashboard Overview");
    return () => setTitle("");
  }, [setTitle]);

  useEffect(() => {
    if (forcedTenantId) {
      setTenantFilter(forcedTenantId);
      setScopeFilter("all");
    }
  }, [forcedTenantId]);

  const effectiveTenantId =
    forcedTenantId ?? (tenantFilter === "all" ? undefined : tenantFilter);
  const effectiveScopeId = scopeFilter === "all" ? undefined : scopeFilter;

  const { data: tenants } = useTenants();
  const { data: scopes } = useScopes(effectiveTenantId);

  useEffect(() => {
    setFilterSlot(
      <div className="flex items-center gap-1">
        <Select value={scopeFilter} onValueChange={setScopeFilter}>
          <SelectTrigger className="h-6 w-[110px] text-[10px] bg-background border-border/50">
            <SelectValue placeholder="Outlet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outlets</SelectItem>
            {(scopes ?? []).map((scope) => (
              <SelectItem key={scope.id} value={scope.id}>
                {scope.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DateFilter value={globalRange} onChange={setGlobalRange} size="xs" />
      </div>,
    );
    return () => setFilterSlot(null);
  }, [
    scopeFilter,
    scopes,
    globalRange,
    setFilterSlot,
    setScopeFilter,
    setGlobalRange,
  ]);

  const overviewFilters = useMemo(
    () => ({
      from: globalRange.from,
      to: globalRange.to,
      includeHeavy: false,
      ...(effectiveTenantId ? { tenantId: effectiveTenantId } : {}),
      ...(effectiveScopeId ? { scopeId: effectiveScopeId } : {}),
    }),
    [effectiveScopeId, effectiveTenantId, globalRange.from, globalRange.to],
  );

  const {
    data: overviewData,
    error: overviewError,
    isLoading: loading,
  } = useEnergyOverview(overviewFilters);

  const fetchMidnightSeries = useCallback(async () => {
    const now = new Date();
    // Fetch ALL historical midnight data (independent of date filter)
    const fetchFrom = new Date("2025-01-01T00:00:00+07:00");
    const totalDays =
      Math.round((now.getTime() - fetchFrom.getTime()) / DAY_MS) + 1;
    const midnightDayKeys = buildLastDayKeys(now, totalDays);

    const scopeIds = effectiveScopeId
      ? [effectiveScopeId]
      : (scopes ?? []).map((scope) => scope.id);

    if (!scopeIds.length) {
      setMidnightPoints(buildEmptyMidnightPoints(now));
      return;
    }

    // Build per-scope starting point offset map
    const spItems = overviewData?.startingPoint?.items ?? [];
    const spMap = new Map<string, { startAt: Date; initialKwh: number }>();
    for (const sp of spItems) {
      const startAt = new Date(sp.startAt);
      if (!Number.isNaN(startAt.getTime())) {
        spMap.set(sp.scopeId, { startAt, initialKwh: sp.initialKwh });
      }
    }

    setMidnightLoading(true);
    try {
      const responses = await Promise.all(
        scopeIds.map((scopeId) =>
          deviceMetricsApi.getAggregated({
            scopeId,
            moduleType: "power_meter",
            from: fetchFrom.toISOString(),
            to: now.toISOString(),
            interval: "hour",
          }),
        ),
      );

      const perDayReadings = new Map<
        string,
        { sum: number; scopeIds: Set<string> }
      >();

      // Track latest reading per scope for today's partial consumption
      const latestPerScope = new Map<
        string,
        { value: number; timestamp: Date }
      >();
      const todayKey = (() => {
        const p = getJakartaDateTimeParts(now);
        return `${p.year}-${p.month}-${p.day}`;
      })();

      responses.forEach((response, index) => {
        const currentScopeId = scopeIds[index];
        if (!response.success || !response.data || !currentScopeId) return;

        const sp = spMap.get(currentScopeId);

        for (const item of response.data) {
          if (item.metricKey !== "energy_total") continue;

          const ts = new Date(item.timestamp);
          if (Number.isNaN(ts.getTime())) continue;

          // Apply starting point offset
          let rawValue = Number((item.min ?? item.avg ?? 0).toFixed(2));
          if (sp) {
            if (ts < sp.startAt) {
              rawValue = 0;
            } else {
              rawValue = Math.max(
                0,
                Number((rawValue - sp.initialKwh).toFixed(2)),
              );
            }
          }

          // Track latest reading per scope (for today's partial)
          const existing = latestPerScope.get(currentScopeId);
          if (!existing || ts > existing.timestamp) {
            latestPerScope.set(currentScopeId, {
              value: rawValue,
              timestamp: ts,
            });
          }

          // Only 00:00 readings go into midnight map
          const p = getJakartaDateTimeParts(ts);
          if (p.hour !== "00") continue;

          const dayKey = `${p.year}-${p.month}-${p.day}`;
          if (!midnightDayKeys.includes(dayKey)) continue;

          const aggregate = perDayReadings.get(dayKey) ?? {
            sum: 0,
            scopeIds: new Set<string>(),
          };
          aggregate.sum += rawValue;
          aggregate.scopeIds.add(currentScopeId);
          perDayReadings.set(dayKey, aggregate);
        }
      });

      const weekdayFormatterLong = new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        timeZone: DISPLAY_TIMEZONE,
      });
      const weekdayFormatterShort = new Intl.DateTimeFormat("id-ID", {
        weekday: "short",
        timeZone: DISPLAY_TIMEZONE,
      });
      const dateFormatter = new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        timeZone: DISPLAY_TIMEZONE,
      });

      const points = midnightDayKeys.map((dayKey) => {
        const currentDay = new Date(`${dayKey}T00:00:00+07:00`);
        const previousDay = new Date(currentDay.getTime() - DAY_MS);
        const reading = perDayReadings.get(dayKey);

        return {
          key: dayKey,
          transitionLabel: `${weekdayFormatterLong.format(previousDay)} - ${weekdayFormatterLong.format(currentDay)}`,
          shortLabel: `${weekdayFormatterShort.format(previousDay)}-${weekdayFormatterShort.format(currentDay)}`,
          dateLabel: dateFormatter.format(currentDay),
          energyKwh: reading ? Number(reading.sum.toFixed(2)) : null,
          contributingOutlets: reading?.scopeIds.size ?? 0,
        };
      });

      // Compute today's partial consumption: latest reading - today's midnight reading
      const todayMidnight = perDayReadings.get(todayKey);
      if (todayMidnight && latestPerScope.size > 0) {
        let latestSum = 0;
        latestPerScope.forEach((entry) => {
          latestSum += entry.value;
        });
        const partial = Math.max(
          0,
          Number((latestSum - todayMidnight.sum).toFixed(2)),
        );
        setTodayPartialKwh(partial);
      } else {
        setTodayPartialKwh(null);
      }

      setMidnightPoints(points);
    } catch {
      setMidnightPoints(buildEmptyMidnightPoints(now));
      setTodayPartialKwh(null);
    } finally {
      setMidnightLoading(false);
    }
  }, [effectiveScopeId, scopes, overviewData?.startingPoint]);

  useEffect(() => {
    void fetchMidnightSeries();
  }, [fetchMidnightSeries]);

  useEffect(() => {
    if (!effectiveScopeId || !scopes) return;
    if (!scopes.some((scope) => scope.id === effectiveScopeId)) {
      setScopeFilter("all");
    }
  }, [effectiveScopeId, scopes]);

  // Daily consumption from midnight deltas (for Total Energy Consumption chart)
  const dailyConsumption = useMemo(() => {
    const result: Array<{ label: string; kWh: number }> = [];
    for (let i = 1; i < midnightPoints.length; i++) {
      const curr = midnightPoints[i];
      const prev = midnightPoints[i - 1];
      if (curr.energyKwh === null || prev.energyKwh === null) continue;
      const delta = Math.max(
        0,
        Number((curr.energyKwh - prev.energyKwh).toFixed(2)),
      );
      // Delta between 00:00 prev and 00:00 curr = consumption during prev's day
      result.push({ label: prev.dateLabel, kWh: delta });
    }
    // Append today's partial consumption (latest reading - midnight today)
    if (todayPartialKwh !== null && todayPartialKwh > 0) {
      const todayLabel = new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        timeZone: DISPLAY_TIMEZONE,
      }).format(new Date());
      result.push({ label: todayLabel, kWh: todayPartialKwh });
    }
    return result;
  }, [midnightPoints, todayPartialKwh]);

  const chartDateRange = useMemo<ChartDateRange>(() => {
    const validChartPresets = [
      "all",
      "today",
      "yesterday",
      "7d",
      "30d",
      "custom",
    ];
    const preset = validChartPresets.includes(globalRange.preset)
      ? globalRange.preset
      : "custom";
    return {
      preset: preset as ChartDateRange["preset"],
      from: globalRange.from,
      to: globalRange.to,
      label: overviewData?.range.label ?? "Overview",
    };
  }, [
    globalRange.from,
    globalRange.preset,
    globalRange.to,
    overviewData?.range.label,
  ]);

  const selectedTenantName = useMemo(() => {
    if (overviewData?.selection.tenantName)
      return overviewData.selection.tenantName;
    if (!effectiveTenantId || !tenants) return "All Tenants";
    return (
      tenants.find((tenant) => tenant.id === effectiveTenantId)?.name ??
      "All Tenants"
    );
  }, [effectiveTenantId, overviewData?.selection.tenantName, tenants]);

  const selectedScopeName = useMemo(() => {
    if (overviewData?.selection.scopeName)
      return overviewData.selection.scopeName;
    if (!effectiveScopeId || !scopes) return "All Outlets";
    return (
      scopes.find((scope) => scope.id === effectiveScopeId)?.name ??
      "All Outlets"
    );
  }, [effectiveScopeId, overviewData?.selection.scopeName, scopes]);

  const mapOutlets = useMemo<MapOutlet[]>(() => {
    if (!overviewData) return [];
    return overviewData.outletLocations.map((outlet) => ({
      id: outlet.id,
      name: outlet.name,
      address: `${outlet.address ? `${outlet.address}, ` : ""}${outlet.region}`,
      totalEnergy: outlet.usage,
      lat: outlet.lat ?? -7.25,
      lng: outlet.lng ?? 110.0,
      online: outlet.devicesOnline > 0,
      devices: outlet.devices,
    }));
  }, [overviewData]);

  const regionData = overviewData?.regionData ?? [];
  const comparisonData = useMemo(
    () =>
      (overviewData?.outletLocations ?? []).map((outlet) => ({
        name: outlet.name,
        kWh: Number(outlet.usage.toFixed(2)),
      })),
    [overviewData?.outletLocations],
  );

  const peakOutletData = useMemo(
    () =>
      [...(overviewData?.outletLocations ?? [])]
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 10)
        .map((outlet) => ({
          name: outlet.name,
          region: outlet.region,
          kWh: Number(outlet.usage.toFixed(2)),
        })),
    [overviewData?.outletLocations],
  );

  const lowOutletData = useMemo(
    () =>
      [...(overviewData?.outletLocations ?? [])]
        .sort((a, b) => a.usage - b.usage)
        .slice(0, 10)
        .map((outlet) => ({
          name: outlet.name,
          region: outlet.region,
          kWh: Number(outlet.usage.toFixed(2)),
        })),
    [overviewData?.outletLocations],
  );

  const donutData = useMemo(
    () =>
      regionData
        .slice(0, 8)
        .map((item) => ({ name: item.region, kWh: item.kWh })),
    [regionData],
  );

  const errorMessage =
    overviewError instanceof Error ? overviewError.message : null;

  return (
    <PageTransition>
      <motion.div
        className="space-y-3 max-w-7xl mx-auto px-3"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {errorMessage && (
          <motion.div
            variants={itemVariants}
            className="rounded border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs text-destructive"
          >
            {errorMessage}
          </motion.div>
        )}

        {/* Global KPI Cards - Ultra Compact */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Card className="relative overflow-hidden border-0 shadow-md ring-2 ring-blue-300/35 bg-gradient-to-br from-blue-600 to-cyan-500 text-white">
            <CardContent className="px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 flex-shrink-0 rounded-md bg-white/20 flex items-center justify-center">
                  <Zap className="h-3 w-3 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white/85 leading-none">
                    Total Energy
                  </p>
                  <p className="text-2xl font-bold truncate leading-tight">
                    {(overviewData?.globalKpi.totalEnergy ?? 0).toLocaleString(
                      "id-ID",
                    )}{" "}
                    <span className="text-xs font-normal text-white/90">
                      kWh
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-md ring-2 ring-emerald-300/40 bg-gradient-to-br from-emerald-600 to-teal-500 text-white">
            <CardContent className="px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 flex-shrink-0 rounded-md bg-white/20 flex items-center justify-center">
                  <MapPinned className="h-3 w-3 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white/85 leading-none">
                    Active Outlets
                  </p>
                  <p className="text-2xl font-bold truncate leading-tight">
                    {overviewData?.globalKpi.activeOutlets ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-md ring-2 ring-orange-300/40 bg-gradient-to-br from-orange-600 to-amber-600 text-white">
            <CardContent className="px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 flex-shrink-0 rounded-md bg-white/20 flex items-center justify-center">
                  <Activity className="h-3 w-3 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white/85 leading-none">Online</p>
                  <p className="text-2xl font-bold truncate leading-tight">
                    {overviewData?.globalKpi.devicesOnline ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-md ring-2 ring-rose-300/40 bg-gradient-to-br from-rose-600 to-red-600 text-white">
            <CardContent className="px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 flex-shrink-0 rounded-md bg-white/20 flex items-center justify-center">
                  <AlertTriangle className="h-3 w-3 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white/85 leading-none">Offline</p>
                  <p className="text-2xl font-bold truncate leading-tight">
                    {overviewData?.globalKpi.devicesOffline ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content Grid - Left data, Right map + charts */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2.7fr_2.3fr] xl:grid-cols-[2.8fr_2.2fr] 2xl:grid-cols-[3fr_2fr]">
          {/* Left Column - Data Components */}
          <div className="space-y-3">
            {/* Energy by Region */}
            <motion.div variants={itemVariants}>
              <MonthlyEnergyChart
                data={regionData}
                dateRange={chartDateRange}
                onDateChange={() => undefined}
                loading={loading}
                showDateFilter={false}
              />
            </motion.div>

            {/* Outlet Comparison */}
            <motion.div variants={itemVariants}>
              <OutletComparisonChart
                data={comparisonData}
                dateRange={chartDateRange}
                onDateChange={() => undefined}
                loading={loading}
                showDateFilter={false}
              />
            </motion.div>

            {/* Top & Low Outlets side by side */}
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <motion.div variants={itemVariants}>
                <TopOutletsList
                  data={peakOutletData}
                  dateRange={chartDateRange}
                  onDateChange={() => undefined}
                  loading={loading}
                  showDateFilter={false}
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <LowOutletsList
                  data={lowOutletData}
                  dateRange={chartDateRange}
                  onDateChange={() => undefined}
                  loading={loading}
                  showDateFilter={false}
                />
              </motion.div>
            </div>

            {/* Energy Distribution Donut - hidden for now */}
            {/* <motion.div variants={itemVariants}>
              <EnergyDistributionDonut data={donutData} loading={loading} />
            </motion.div> */}

            {/* Energy 00:00 */}
            <motion.div variants={itemVariants}>
              <MidnightEnergyOverviewCard
                points={midnightPoints}
                loading={midnightLoading}
                titleSuffix={
                  effectiveScopeId
                    ? `${selectedScopeName}`
                    : `Semua outlet${effectiveTenantId ? ` (${selectedTenantName})` : ""}`
                }
              />
            </motion.div>
          </div>

          {/* Right Column - Map + Charts below */}
          <div className="space-y-3">
            {/* Outlet Status Map */}
            <motion.div variants={itemVariants}>
              <Card className="border border-border/70 shadow-sm py-2 gap-1">
                <CardHeader className="px-3 pt-2 pb-0.5">
                  <CardTitle className="text-xs font-semibold">
                    Outlet Status Map
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-2 pt-0.5">
                  <div className="h-[240px] rounded-md overflow-hidden bg-muted/30 ring-2 ring-border/50 lg:-ml-2 lg:w-[calc(100%+0.5rem)]">
                    <OpenLayersMap outlets={mapOutlets} className="h-full" />
                  </div>
                  <div className="mt-1.5 flex items-center justify-end gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      Normal
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      High
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      Alert
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Rata-rata Konsumsi per Jam */}
            <motion.div variants={itemVariants}>
              <AvgHourlyConsumptionChart
                data={overviewData?.hourlyEnergy ?? []}
                dataDays={overviewData?.hourlyEnergyDays ?? 1}
                dateRange={chartDateRange}
                onDateChange={() => undefined}
                loading={loading}
                showDateFilter={false}
              />
            </motion.div>

            {/* Total Energy Consumption */}
            <motion.div variants={itemVariants}>
              <HourlyEnergyConsumptionChart
                data={overviewData?.hourlyEnergy ?? []}
                dailyData={dailyConsumption}
                dateRange={chartDateRange}
                onDateChange={() => undefined}
                loading={loading || midnightLoading}
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
