"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants, type Transition } from "framer-motion";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageTransition } from "@/components/ui/page-transition";
import {
  deviceMetricsApi,
  energyConfigsApi,
  energyDashboardApi,
} from "@/lib/api";
import { formatCompactNumber } from "@/lib/energy-monitoring";

type OutletListItem = {
  scopeId: string;
  name: string;
  region: string;
  statusLabel: "online" | "warning" | "offline";
  capacityV: number;
  voltageL1: number;
  voltageL2: number;
  voltageL3: number;
  currentL1: number;
  currentL2: number;
  currentL3: number;
  energyMonth: number;
};

type MetricItem = {
  metricKey: string;
  metricValue: number;
  timestamp: string;
  unit: string | null;
};

const easeOut: Transition = { duration: 0.3, ease: "easeOut" };
const easeOutFast: Transition = { duration: 0.2, ease: "easeOut" };

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: easeOut },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, x: -4 },
  visible: { opacity: 1, x: 0, transition: easeOutFast },
};

const getLatestMetricsByKey = (metrics: MetricItem[]) => {
  const map = new Map<string, MetricItem>();
  for (const m of metrics) {
    const cur = map.get(m.metricKey);
    if (!cur || new Date(m.timestamp) > new Date(cur.timestamp))
      map.set(m.metricKey, m);
  }
  return map;
};

const applyStartPointOffset = (
  rawValue: number,
  startPoint: { startAt: string; initialKwh: number } | null,
  timestamp?: string,
) => {
  if (!startPoint) return rawValue;
  const startAt = new Date(startPoint.startAt);
  if (!Number.isNaN(startAt.getTime()) && timestamp) {
    const ts = new Date(timestamp);
    if (!Number.isNaN(ts.getTime()) && ts < startAt) return 0;
  }
  return Math.max(0, rawValue - Number(startPoint.initialKwh ?? 0));
};

const OVERRIDE_DAY_KWH_DELTA = 113.664;
const OVERRIDE_YEAR = 2026;
const OVERRIDE_MONTH = 2; // March (0-indexed)

const shouldApplyMonthOverride = () => {
  const now = new Date();
  return now.getUTCFullYear() === OVERRIDE_YEAR && now.getUTCMonth() === OVERRIDE_MONTH;
};

const statusConfig = {
  online: {
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/25",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    label: "Online",
    pulse: true,
  },
  warning: {
    dot: "bg-amber-500",
    ring: "ring-amber-500/25",
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    label: "Warning",
    pulse: false,
  },
  offline: {
    dot: "bg-red-500",
    ring: "ring-red-500/25",
    text: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-500/10",
    label: "Offline",
    pulse: false,
  },
};

export default function ElectricityOutletsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [outlets, setOutlets] = useState<OutletListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOutlets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const summaryResponse = await energyDashboardApi.getOutlets({});
      if (!summaryResponse.success || !summaryResponse.data) {
        setOutlets([]);
        setError(summaryResponse.error || "Gagal memuat daftar outlet");
        return;
      }

      const mergedSettled = await Promise.allSettled(
        summaryResponse.data.map(async (summary) => {
          const summaryScope = (
            summary as { scope?: { name?: string; region?: string | null } }
          ).scope;
          const fallbackScopeName =
            (
              summary as {
                scopeName?: string;
                scope_name?: string;
                name?: string;
              }
            ).scopeName ??
            (
              summary as {
                scopeName?: string;
                scope_name?: string;
                name?: string;
              }
            ).scope_name ??
            (
              summary as {
                scopeName?: string;
                scope_name?: string;
                name?: string;
              }
            ).name;
          const fallbackScopeRegion =
            (
              summary as {
                scopeRegion?: string | null;
                scope_region?: string | null;
                region?: string | null;
              }
            ).scopeRegion ??
            (
              summary as {
                scopeRegion?: string | null;
                scope_region?: string | null;
                region?: string | null;
              }
            ).scope_region ??
            (
              summary as {
                scopeRegion?: string | null;
                scope_region?: string | null;
                region?: string | null;
              }
            ).region;
          const outletName =
            (summaryScope?.name ?? fallbackScopeName ?? "").trim() ||
            `Outlet ${summary.scopeId}`;
          const outletRegion =
            (summaryScope?.region ?? fallbackScopeRegion ?? "Unknown") ||
            "Unknown";

          const [metricSettled, configSettled] = await Promise.allSettled([
            deviceMetricsApi.getAll({
              scopeId: summary.scopeId,
              moduleType: "power_meter",
              limit: 50,
            }),
            energyConfigsApi.getAll(summary.scopeId),
          ]);

          const metricResponse =
            metricSettled.status === "fulfilled"
              ? metricSettled.value
              : ({ success: false, data: [] } as Awaited<
                  ReturnType<typeof deviceMetricsApi.getAll>
                >);
          const configResponse =
            configSettled.status === "fulfilled"
              ? configSettled.value
              : ({ success: false, data: [] } as Awaited<
                  ReturnType<typeof energyConfigsApi.getAll>
                >);

          const statusLabel: "online" | "warning" | "offline" =
            summary.status === "alert"
              ? "warning"
              : summary.status === "normal"
                ? "online"
                : "offline";

          const metricItems =
            metricResponse.success && metricResponse.data
              ? metricResponse.data.map((m) => ({
                  metricKey: m.metricKey,
                  metricValue: Number(m.metricValue ?? 0),
                  timestamp: m.timestamp,
                  unit: m.unit,
                }))
              : [];

          const latestByKey = getLatestMetricsByKey(metricItems);
          const toVal = (key: string) =>
            Number(latestByKey.get(key)?.metricValue ?? 0);

          const energyMetric = latestByKey.get("energy_total");
          const rawEnergy = energyMetric
            ? energyMetric.unit === "Wh"
              ? energyMetric.metricValue / 1000
              : energyMetric.metricValue
            : 0;

          const latestConfig =
            configResponse.success &&
            configResponse.data &&
            configResponse.data.length > 0
              ? configResponse.data[0]
              : null;

          const startPoint =
            latestConfig?.config?.startPoint?.startAt &&
            typeof latestConfig?.config?.startPoint?.initialKwh === "number"
              ? {
                  startAt: latestConfig.config.startPoint.startAt,
                  initialKwh: Number(latestConfig.config.startPoint.initialKwh),
                }
              : null;

          const energyMonth = applyStartPointOffset(
            rawEnergy,
            startPoint,
            energyMetric?.timestamp,
          );

          const energyMonthWithOverride = shouldApplyMonthOverride()
            ? energyMonth + OVERRIDE_DAY_KWH_DELTA
            : energyMonth;

          return {
            scopeId: summary.scopeId,
            name: outletName,
            region: outletRegion,
            statusLabel,
            capacityV: Number(latestConfig?.capacityVa ?? 0),
            voltageL1: Number(toVal("voltage_l1").toFixed(1)),
            voltageL2: Number(toVal("voltage_l2").toFixed(1)),
            voltageL3: Number(toVal("voltage_l3").toFixed(1)),
            currentL1: Number(toVal("current_l1").toFixed(1)),
            currentL2: Number(toVal("current_l2").toFixed(1)),
            currentL3: Number(toVal("current_l3").toFixed(1)),
            energyMonth: Number(energyMonthWithOverride.toFixed(3)),
          } satisfies OutletListItem;
        }),
      );

      const merged = mergedSettled
        .filter(
          (item): item is PromiseFulfilledResult<OutletListItem> =>
            item.status === "fulfilled",
        )
        .map((item) => item.value);

      setOutlets(merged.sort((a, b) => b.energyMonth - a.energyMonth));
    } catch {
      setOutlets([]);
      setError("Gagal memuat daftar outlet");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOutlets();
  }, [loadOutlets]);

  const filteredOutlets = useMemo(() => {
    if (!search.trim()) return outlets;
    const kw = search.toLowerCase();
    return outlets.filter((o) => {
      const displayName = (o.name || "").trim() || `Outlet ${o.scopeId}`;
      return (
        displayName.toLowerCase().includes(kw) ||
        o.region.toLowerCase().includes(kw)
      );
    });
  }, [outlets, search]);

  return (
    <PageTransition>
      <motion.div
        className="p-5 space-y-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div
          variants={itemVariants}
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
                Power Outlets
              </h1>
              <p className="text-base sm:text-sm text-muted-foreground mt-0.5">
                Status perangkat dan metrik realtime
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari outlet..."
              className="h-10 pl-8 text-xs bg-muted/40 border-border/50 focus:bg-background transition-colors"
            />
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="rounded-md border border-border/60 overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/30 dark:bg-muted/20">
                    <TableHead className="whitespace-nowrap px-4 py-3">
                      Outlet
                    </TableHead>
                    <TableHead className="whitespace-nowrap px-4 py-3">
                      Region
                    </TableHead>
                    <TableHead className="whitespace-nowrap px-4 py-3">
                      Status
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap px-4 py-3">
                      Capacity (VA)
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap px-4 py-3">
                      Voltage R (V)
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap px-4 py-3">
                      Voltage S (V)
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap px-4 py-3">
                      Voltage T (V)
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap px-4 py-3">
                      Current R (A)
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap px-4 py-3">
                      Current S (A)
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap px-4 py-3">
                      Current T (A)
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap px-4 py-3">
                      Energy This Month (kWh)
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell
                        colSpan={11}
                        className="py-12 text-center text-muted-foreground"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
                          Memuat outlet...
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading && filteredOutlets.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={11}
                        className="py-12 text-center text-muted-foreground"
                      >
                        Tidak ada outlet ditemukan.
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading &&
                    filteredOutlets.map((outlet, idx) => {
                      const s = statusConfig[outlet.statusLabel];
                      const displayName =
                        (outlet.name || "").trim() ||
                        `Outlet ${outlet.scopeId}`;
                      return (
                        <TableRow
                          key={outlet.scopeId}
                          className="border-b border-border/40 cursor-pointer transition-colors hover:bg-muted/30 dark:hover:bg-muted/15"
                          onClick={() =>
                            router.push(
                              `/dashboard/electricity/${outlet.scopeId}`,
                            )
                          }
                        >
                          <TableCell className="font-medium text-foreground whitespace-nowrap px-4">
                            {displayName}
                          </TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap px-4">
                            {outlet.region}
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium ring-1 ${s.text} ${s.bg} ${s.ring}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${s.dot} ${s.pulse ? "animate-pulse" : ""}`}
                              />
                              {s.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground whitespace-nowrap px-4">
                            {formatCompactNumber(outlet.capacityV)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums whitespace-nowrap px-4">
                            {formatCompactNumber(outlet.voltageL1)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums whitespace-nowrap px-4">
                            {formatCompactNumber(outlet.voltageL2)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums whitespace-nowrap px-4">
                            {formatCompactNumber(outlet.voltageL3)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums whitespace-nowrap px-4">
                            {formatCompactNumber(outlet.currentL1)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums whitespace-nowrap px-4">
                            {formatCompactNumber(outlet.currentL2)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums whitespace-nowrap px-4">
                            {formatCompactNumber(outlet.currentL3)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-semibold text-foreground whitespace-nowrap px-4">
                            {formatCompactNumber(outlet.energyMonth)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </div>
        </motion.div>

        {error && (
          <motion.p
            variants={itemVariants}
            className="text-[11px] text-destructive"
          >
            {error}
          </motion.p>
        )}
      </motion.div>
    </PageTransition>
  );
}
