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
import type { OverviewMidnightPoint } from "@/components/dashboard/MidnightEnergyOverviewCard";

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
  // Per-scope midnight readings for filter-aware region consumption
  const [perScopeMidnight, setPerScopeMidnight] = useState<
    Map<string, Map<string, number>>
  >(() => new Map());
  const [latestPerScopeReadings, setLatestPerScopeReadings] = useState<
    Map<string, number>
  >(() => new Map());

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

      // Per-scope midnight readings for region consumption calculation
      const scopeMidnightMap = new Map<string, Map<string, number>>();

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

          const slotStartRaw = Number((item.min ?? item.avg ?? 0).toFixed(2));
          const slotLatestRaw = Number(
            (item.max ?? item.avg ?? item.min ?? 0).toFixed(2),
          );

          // Apply starting point offset. For cumulative energy counters:
          // - use slot start for midnight baseline
          // - use slot max/latest for current partial consumption
          let baselineValue = slotStartRaw;
          let latestValue = slotLatestRaw;
          if (sp) {
            if (ts < sp.startAt) {
              baselineValue = 0;
              latestValue = 0;
            } else {
              baselineValue = Math.max(
                0,
                Number((baselineValue - sp.initialKwh).toFixed(2)),
              );
              latestValue = Math.max(
                0,
                Number((latestValue - sp.initialKwh).toFixed(2)),
              );
            }
          }

          // Track latest reading per scope (for today's partial)
          const existing = latestPerScope.get(currentScopeId);
          if (!existing || ts > existing.timestamp) {
            latestPerScope.set(currentScopeId, {
              value: latestValue,
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
          aggregate.sum += baselineValue;
          aggregate.scopeIds.add(currentScopeId);
          perDayReadings.set(dayKey, aggregate);

          // Also track per-scope midnight readings
          let scopeDay = scopeMidnightMap.get(currentScopeId);
          if (!scopeDay) {
            scopeDay = new Map();
            scopeMidnightMap.set(currentScopeId, scopeDay);
          }
          scopeDay.set(dayKey, baselineValue);
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

      // Store per-scope data for filter-aware region consumption
      setPerScopeMidnight(scopeMidnightMap);
      const latestMap = new Map<string, number>();
      latestPerScope.forEach((entry, scopeId) =>
        latestMap.set(scopeId, entry.value),
      );
      setLatestPerScopeReadings(latestMap);
    } catch {
      setMidnightPoints(buildEmptyMidnightPoints(now));
      setTodayPartialKwh(null);
      setPerScopeMidnight(new Map());
      setLatestPerScopeReadings(new Map());
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

  const dailyBreakdownRows = useMemo(() => {
    const dateLabelFormatter = new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: DISPLAY_TIMEZONE,
    });
    const chartLabelFormatter = new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      timeZone: DISPLAY_TIMEZONE,
    });

    const rows: Array<{
      dayKey: string;
      label: string;
      chartLabel: string;
      kWh: number;
    }> = [];

    // Determine loop start based on globalRange.from so chart/table respect selected date filter
    let loopStart = 1;
    if (globalRange.from) {
      const fromParts = getJakartaDateTimeParts(new Date(globalRange.from));
      const fromKey = `${fromParts.year}-${fromParts.month}-${fromParts.day}`;
      const idx = midnightPoints.findIndex((pt) => pt.key >= fromKey);
      if (idx >= 0) loopStart = Math.max(1, idx + 1);
    }

    // Determine toKey cap based on globalRange.to
    let toKey: string | null = null;
    if (globalRange.to) {
      const toParts = getJakartaDateTimeParts(new Date(globalRange.to));
      toKey = `${toParts.year}-${toParts.month}-${toParts.day}`;
    }

    for (let i = loopStart; i < midnightPoints.length; i++) {
      const curr = midnightPoints[i];
      const prev = midnightPoints[i - 1];
      if (curr.energyKwh === null || prev.energyKwh === null) continue;

      // Skip days beyond the selected end date
      if (toKey && prev.key > toKey) break;

      const delta = Math.max(
        0,
        Number((curr.energyKwh - prev.energyKwh).toFixed(2)),
      );

      const prevDate = new Date(`${prev.key}T00:00:00+07:00`);
      rows.push({
        dayKey: prev.key,
        label: dateLabelFormatter.format(prevDate),
        chartLabel: chartLabelFormatter.format(prevDate),
        kWh: delta,
      });
    }

    // Show today's partial if today falls within the selected range.
    if (todayPartialKwh !== null && todayPartialKwh > 0) {
      const now = new Date();
      const todayParts = getJakartaDateTimeParts(now);
      const todayKey = `${todayParts.year}-${todayParts.month}-${todayParts.day}`;
      const toKey = globalRange.to
        ? (() => {
            const p = getJakartaDateTimeParts(new Date(globalRange.to));
            return `${p.year}-${p.month}-${p.day}`;
          })()
        : null;
      const isTodayInRange = !toKey || todayKey <= toKey;

      if (isTodayInRange) {
        rows.push({
          dayKey: todayKey,
          label: `${dateLabelFormatter.format(now)} (s.d. sekarang)`,
          chartLabel: chartLabelFormatter.format(now),
          kWh: Number(todayPartialKwh.toFixed(2)),
        });
      }
    }

    return rows;
  }, [
    midnightPoints,
    todayPartialKwh,
    globalRange.from,
    globalRange.to,
    globalRange.preset,
  ]);

  // Daily consumption for Total Energy Consumption chart
  const dailyConsumption = useMemo(
    () =>
      dailyBreakdownRows.map((row) => ({
        label: row.chartLabel,
        kWh: row.kWh,
      })),
    [dailyBreakdownRows],
  );

  // Filtered total energy from breakdown (consistent with chart/table)
  const filteredTotalEnergy = useMemo(
    () => Number(dailyBreakdownRows.reduce((s, r) => s + r.kWh, 0).toFixed(2)),
    [dailyBreakdownRows],
  );

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

  const filteredOutletEnergy = useMemo(() => {
    const outlets = overviewData?.outletLocations ?? [];
    if (!outlets.length) return new Map<string, number>();

    if (!perScopeMidnight.size) {
      return new Map(
        outlets.map((outlet) => [outlet.id, Number(outlet.usage.toFixed(2))]),
      );
    }

    let fromKey: string | null = null;
    let toKey: string | null = null;
    if (globalRange.from) {
      const fp = getJakartaDateTimeParts(new Date(globalRange.from));
      fromKey = `${fp.year}-${fp.month}-${fp.day}`;
    }
    if (globalRange.to) {
      const tp = getJakartaDateTimeParts(new Date(globalRange.to));
      toKey = `${tp.year}-${tp.month}-${tp.day}`;
    }

    const nowParts = getJakartaDateTimeParts(new Date());
    const todayKey = `${nowParts.year}-${nowParts.month}-${nowParts.day}`;
    // removed
    const includeTodayPartial = !toKey || todayKey <= toKey;

    const scopeConsumption = new Map<string, number>();
    for (const [scopeId, dayMap] of perScopeMidnight) {
      const sortedKeys = [...dayMap.keys()].sort();
      let total = 0;
      for (let i = 1; i < sortedKeys.length; i++) {
        const prevKey = sortedKeys[i - 1]!;
        const currKey = sortedKeys[i]!;
        if (fromKey && prevKey < fromKey) continue;
        if (toKey && prevKey > toKey) break;
        const prev = dayMap.get(prevKey) ?? 0;
        const curr = dayMap.get(currKey) ?? 0;
        total += Math.max(0, curr - prev);
      }
      if (includeTodayPartial) {
        const todayMidnight = dayMap.get(todayKey);
        const latestReading = latestPerScopeReadings.get(scopeId);
        if (todayMidnight !== undefined && latestReading !== undefined) {
          total += Math.max(0, latestReading - todayMidnight);
        }
      }
      scopeConsumption.set(scopeId, Number(total.toFixed(2)));
    }

    return scopeConsumption;
  }, [
    globalRange.from,
    globalRange.preset,
    globalRange.to,
    latestPerScopeReadings,
    overviewData?.outletLocations,
    perScopeMidnight,
  ]);

  const filteredOutletRankData = useMemo(
    () =>
      (overviewData?.outletLocations ?? []).map((outlet) => ({
        id: outlet.id,
        name: outlet.name,
        region: outlet.region,
        kWh:
          filteredOutletEnergy.get(outlet.id) ??
          Number(outlet.usage.toFixed(2)),
      })),
    [filteredOutletEnergy, overviewData?.outletLocations],
  );

  // Filter-aware region consumption from per-scope midnight deltas
  const filteredRegionData = useMemo(() => {
    const outlets = overviewData?.outletLocations ?? [];
    if (!outlets.length) return regionData;

    const regionMap = new Map<
      string,
      { region: string; kWh: number; cost: number; outlets: number }
    >();
    for (const outlet of outlets) {
      const consumption =
        filteredOutletEnergy.get(outlet.id) ?? Number(outlet.usage.toFixed(2));
      const existing = regionMap.get(outlet.region) ?? {
        region: outlet.region,
        kWh: 0,
        cost: 0,
        outlets: 0,
      };
      existing.kWh = Number((existing.kWh + consumption).toFixed(2));
      existing.outlets += 1;
      regionMap.set(outlet.region, existing);
    }

    return Array.from(regionMap.values()).sort((a, b) => b.kWh - a.kWh);
  }, [filteredOutletEnergy, overviewData?.outletLocations, regionData]);

  const peakOutletData = useMemo(
    () =>
      [...filteredOutletRankData]
        .sort((a, b) => b.kWh - a.kWh)
        .slice(0, 10)
        .map((outlet) => ({
          name: outlet.name,
          region: outlet.region,
          kWh: Number(outlet.kWh.toFixed(2)),
        })),
    [filteredOutletRankData],
  );

  const lowOutletData = useMemo(
    () =>
      [...filteredOutletRankData]
        .sort((a, b) => a.kWh - b.kWh)
        .slice(0, 10)
        .map((outlet) => ({
          name: outlet.name,
          region: outlet.region,
          kWh: Number(outlet.kWh.toFixed(2)),
        })),
    [filteredOutletRankData],
  );

  const donutData = useMemo(
    () =>
      filteredRegionData
        .slice(0, 8)
        .map((item) => ({ name: item.region, kWh: item.kWh })),
    [filteredRegionData],
  );

  const errorMessage =
    overviewError instanceof Error ? overviewError.message : null;

  return (
    <PageTransition>
      <motion.div
        className="space-y-3 w-full max-w-[1700px] mx-auto px-3 overflow-x-hidden"
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
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
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
                    {filteredTotalEnergy.toLocaleString("id-ID")}{" "}
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[2.6fr_2fr] lg:grid-cols-[2.7fr_2.3fr] xl:grid-cols-[2.8fr_2.2fr] 2xl:grid-cols-[3fr_2fr]">
          {/* Left Column - Energy Comparison, then Total Energy */}
          <div className="min-w-0 space-y-3">
            {/* Energy Comparison */}
            <motion.div variants={itemVariants}>
              <MonthlyEnergyChart
                data={filteredRegionData}
                dateRange={chartDateRange}
                onDateChange={() => undefined}
                loading={loading}
                showDateFilter={false}
                compact
              />
            </motion.div>

            {/* Top & Low Outlets */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <motion.div variants={itemVariants}>
                <TopOutletsList
                  data={peakOutletData}
                  dateRange={chartDateRange}
                  onDateChange={() => undefined}
                  loading={loading || midnightLoading}
                  showDateFilter={false}
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <LowOutletsList
                  data={lowOutletData}
                  dateRange={chartDateRange}
                  onDateChange={() => undefined}
                  loading={loading || midnightLoading}
                  showDateFilter={false}
                />
              </motion.div>
            </div>

            {/* Total Energy Consumption */}
            <motion.div variants={itemVariants}>
              <HourlyEnergyConsumptionChart
                data={overviewData?.hourlyEnergy ?? []}
                dailyData={dailyConsumption}
                breakdownRows={dailyBreakdownRows}
                dateRange={chartDateRange}
                onDateChange={() => undefined}
                loading={loading || midnightLoading}
                showDateFilter={false}
              />
            </motion.div>
          </div>

          {/* Right Column - Map + Avg Hourly */}
          <div className="min-w-0 space-y-3">
            {/* Outlet Status Map */}
            <motion.div variants={itemVariants}>
              <Card className="border border-border/70 shadow-sm py-2 gap-1">
                <CardHeader className="px-3 pt-2 pb-0.5">
                  <CardTitle className="text-xs font-semibold">
                    Outlet Status Map
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-2 pt-0.5">
                  <div className="h-[240px] rounded-md overflow-hidden bg-muted/30 ring-2 ring-border/50">
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
          </div>
        </div>
      </motion.div>
    </PageTransition>
  );
}

export default EnergyOverviewPage;
