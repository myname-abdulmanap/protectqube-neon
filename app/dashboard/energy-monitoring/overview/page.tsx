"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { MapPinned } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/ui/page-transition";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { SummaryCards } from "@/components/dashboard/SummaryCards";
import {
  EnergyDistributionDonut,
  HourlyEnergyConsumptionChart,
  MonthlyEnergyChart,
  MonthlyEnergyUsageChart,
  OutletComparisonChart,
  PeakHoursChart,
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
  const [globalRange, setGlobalRange] = useState<DateRange>(buildRange("30d"));
  const [midnightPoints, setMidnightPoints] = useState<OverviewMidnightPoint[]>(
    () => buildEmptyMidnightPoints(),
  );
  const [midnightLoading, setMidnightLoading] = useState(false);

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

  const fetchMidnightSeries = useCallback(async () => {
    const now = new Date();
    const from = new Date(now.getTime() - 8 * DAY_MS);
    const midnightDayKeys = buildLastDayKeys(now, 8);

    const scopeIds = effectiveScopeId
      ? [effectiveScopeId]
      : (scopes ?? []).map((scope) => scope.id);

    if (!scopeIds.length) {
      setMidnightPoints(buildEmptyMidnightPoints(now));
      return;
    }

    setMidnightLoading(true);
    try {
      const responses = await Promise.all(
        scopeIds.map((scopeId) =>
          deviceMetricsApi.getAggregated({
            scopeId,
            moduleType: "power_meter",
            from: from.toISOString(),
            to: now.toISOString(),
            interval: "hour",
          }),
        ),
      );

      const perDayReadings = new Map<
        string,
        { sum: number; scopeIds: Set<string> }
      >();

      responses.forEach((response, index) => {
        const currentScopeId = scopeIds[index];
        if (!response.success || !response.data || !currentScopeId) return;

        for (const item of response.data) {
          if (item.metricKey !== "energy_total") continue;

          const ts = new Date(item.timestamp);
          if (Number.isNaN(ts.getTime())) continue;

          const p = getJakartaDateTimeParts(ts);
          if (p.hour !== "00") continue;

          const dayKey = `${p.year}-${p.month}-${p.day}`;
          if (!midnightDayKeys.includes(dayKey)) continue;

          const aggregate = perDayReadings.get(dayKey) ?? {
            sum: 0,
            scopeIds: new Set<string>(),
          };
          aggregate.sum += Number((item.min ?? item.avg ?? 0).toFixed(2));
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

      setMidnightPoints(points);
    } catch {
      setMidnightPoints(buildEmptyMidnightPoints(now));
    } finally {
      setMidnightLoading(false);
    }
  }, [effectiveScopeId, scopes]);

  useEffect(() => {
    void fetchMidnightSeries();
  }, [fetchMidnightSeries]);

  useEffect(() => {
    if (!effectiveScopeId || !scopes) return;
    if (!scopes.some((scope) => scope.id === effectiveScopeId)) {
      setScopeFilter("all");
    }
  }, [effectiveScopeId, scopes]);

  const overviewFilters = useMemo(
    () => ({
      from: globalRange.from,
      to: globalRange.to,
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

  const chartDateRange = useMemo<ChartDateRange>(() => {
    const preset = globalRange.preset === "90d" ? "custom" : globalRange.preset;
    return {
      preset,
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
        className="space-y-4 max-w-7xl mx-auto px-4"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div
          variants={itemVariants}
          className="flex flex-col gap-3 rounded-lg border bg-card px-5 py-4 xl:flex-row xl:items-center xl:justify-between"
        >
          <div>
            <h2 className="text-lg font-semibold">Dashboard Overview</h2>
            <p className="text-sm text-muted-foreground">
              Overview keseluruhan outlet dan pemakaian energi.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedTenantName} • {selectedScopeName}
            </p>
            {overviewData?.startingPoint?.items?.[0] && (
              <p className="text-xs text-muted-foreground mt-1">
                Starting point:{" "}
                {new Date(
                  overviewData.startingPoint.items[0].startAt,
                ).toLocaleString("id-ID")}{" "}
                WIB, awal {overviewData.startingPoint.items[0].initialKwh} kWh
                {overviewData.startingPoint.appliedScopes > 1
                  ? ` (${overviewData.startingPoint.appliedScopes} outlet)`
                  : ""}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={forcedTenantId ?? tenantFilter}
              onValueChange={(value) => {
                if (forcedTenantId) return;
                setTenantFilter(value);
                setScopeFilter("all");
              }}
              disabled={Boolean(forcedTenantId)}
            >
              <SelectTrigger className="h-9 min-w-[180px] bg-background">
                <SelectValue placeholder="Select tenant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tenants</SelectItem>
                {(tenants ?? []).map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={scopeFilter} onValueChange={setScopeFilter}>
              <SelectTrigger className="h-9 min-w-[190px] bg-background">
                <SelectValue placeholder="Select outlet" />
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
            <DateFilter value={globalRange} onChange={setGlobalRange} />
          </div>
        </motion.div>

        {errorMessage && (
          <motion.div
            variants={itemVariants}
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {errorMessage}
          </motion.div>
        )}

        <motion.div variants={itemVariants}>
          <SummaryCards
            totalEnergy={overviewData?.globalKpi.totalEnergy ?? 0}
            totalOutlets={overviewData?.globalKpi.activeOutlets ?? 0}
            devicesOnline={overviewData?.globalKpi.devicesOnline ?? 0}
            devicesOffline={overviewData?.globalKpi.devicesOffline ?? 0}
            loading={loading}
          />
        </motion.div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
          <div className="min-w-0 space-y-4">
            <motion.div variants={itemVariants}>
              <MonthlyEnergyChart
                data={regionData}
                dateRange={chartDateRange}
                onDateChange={() => undefined}
                loading={loading}
                showDateFilter={false}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <OutletComparisonChart
                data={comparisonData}
                dateRange={chartDateRange}
                onDateChange={() => undefined}
                loading={loading}
                showDateFilter={false}
              />
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <TopOutletsList
                data={peakOutletData}
                dateRange={chartDateRange}
                onDateChange={() => undefined}
                loading={loading}
                showDateFilter={false}
              />
              <LowOutletsList
                data={lowOutletData}
                dateRange={chartDateRange}
                onDateChange={() => undefined}
                loading={loading}
                showDateFilter={false}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <PeakHoursChart
                data={overviewData?.peakHours ?? []}
                dateRange={chartDateRange}
                onDateChange={() => undefined}
                loading={loading}
                showDateFilter={false}
                totalDevices={
                  (overviewData?.globalKpi.devicesOnline ?? 0) +
                  (overviewData?.globalKpi.devicesOffline ?? 0)
                }
                devicesOnline={overviewData?.globalKpi.devicesOnline ?? 0}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <HourlyEnergyConsumptionChart
                data={overviewData?.hourlyEnergy ?? []}
                dateRange={chartDateRange}
                onDateChange={() => undefined}
                loading={loading}
                showDateFilter={false}
              />
            </motion.div>
          </div>

          <div className="min-w-0 space-y-4">
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="px-4 pt-4 pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <MapPinned className="h-4 w-4" />
                    Outlet Map
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Lokasi outlet yang terdaftar. Klik pin untuk detail.
                  </p>
                </CardHeader>
                <CardContent className="p-3 pt-2">
                  <OpenLayersMap outlets={mapOutlets} className="h-[320px]" />
                  <div className="mt-2 flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      <span className="text-green-600 font-medium">
                        {overviewData?.globalKpi.devicesOnline ?? 0} Online
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span className="text-red-500 font-medium">
                        {overviewData?.globalKpi.devicesOffline ?? 0} Offline
                      </span>
                    </span>
                    <span className="text-muted-foreground ml-auto">
                      {overviewData?.globalKpi.activeOutlets ?? 0} outlet total
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <EnergyDistributionDonut data={donutData} loading={loading} />
            </motion.div>

            {/* <motion.div variants={itemVariants}>
              <MonthlyEnergyUsageChart
                data={overviewData?.monthlyEnergyUse ?? []}
                dateRange={chartDateRange}
                onDateChange={() => undefined}
                loading={loading}
                showDateFilter={false}
              />
            </motion.div> */}

            <motion.div variants={itemVariants}>
              <MidnightEnergyOverviewCard
                points={midnightPoints}
                loading={midnightLoading}
                titleSuffix={
                  effectiveScopeId
                    ? `Outlet: ${selectedScopeName}`
                    : `Campuran seluruh outlet${effectiveTenantId ? ` tenant ${selectedTenantName}` : ""}`
                }
              />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </PageTransition>
  );
}

export default EnergyOverviewPage;
