"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Building2, Circle, ListFilter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageTransition } from "@/components/ui/page-transition";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

const getLatestMetricsByKey = (metrics: MetricItem[]) => {
  const latestByKey = new Map<string, MetricItem>();
  for (const metric of metrics) {
    const current = latestByKey.get(metric.metricKey);
    if (
      !current ||
      new Date(metric.timestamp).getTime() >
        new Date(current.timestamp).getTime()
    ) {
      latestByKey.set(metric.metricKey, metric);
    }
  }
  return latestByKey;
};

const applyStartPointOffset = (
  rawValue: number,
  startPoint: { startAt: string; initialKwh: number } | null,
  timestamp?: string,
) => {
  if (!startPoint) return rawValue;
  const startAt = new Date(startPoint.startAt);
  if (!Number.isNaN(startAt.getTime()) && timestamp) {
    const metricTs = new Date(timestamp);
    if (!Number.isNaN(metricTs.getTime()) && metricTs < startAt) {
      return 0;
    }
  }
  return Math.max(0, rawValue - Number(startPoint.initialKwh ?? 0));
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

      // Only fetch metrics and configs per outlet (skip expensive getOutletDetail)
      const merged = await Promise.all(
        summaryResponse.data.map(async (summary) => {
          const [metricResponse, configResponse] = await Promise.all([
            deviceMetricsApi.getAll({
              scopeId: summary.scopeId,
              moduleType: "power_meter",
              limit: 100,
            }),
            energyConfigsApi.getAll(summary.scopeId),
          ]);

          // Derive status from summary data instead of loading full detail
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

          return {
            scopeId: summary.scopeId,
            name: summary.scope.name,
            region: summary.scope.region || "Unknown",
            statusLabel,
            capacityV: Number(latestConfig?.capacityVa ?? 0),
            voltageL1: Number(toVal("voltage_l1").toFixed(1)),
            voltageL2: Number(toVal("voltage_l2").toFixed(1)),
            voltageL3: Number(toVal("voltage_l3").toFixed(1)),
            currentL1: Number(toVal("current_l1").toFixed(1)),
            currentL2: Number(toVal("current_l2").toFixed(1)),
            currentL3: Number(toVal("current_l3").toFixed(1)),
            energyMonth: Number(energyMonth.toFixed(1)),
          } satisfies OutletListItem;
        }),
      );

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
    const keyword = search.toLowerCase();
    return outlets.filter(
      (o) =>
        o.name.toLowerCase().includes(keyword) ||
        o.region.toLowerCase().includes(keyword),
    );
  }, [outlets, search]);

  return (
    <PageTransition>
      <motion.div
        className="space-y-1.5 max-w-5xl mx-auto px-4"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-lg font-bold tracking-tight">Power Outlets</h1>
            <p className="text-[10px] text-muted-foreground">
              Status perangkat dan metrik realtime
            </p>
          </div>
          <div className="relative w-full sm:w-[200px]">
            <ListFilter className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari outlet..."
              className="h-7 pl-7 text-[10px]"
            />
          </div>
        </motion.div>

        {/* Table */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 py-1.5 border-b bg-muted/30">
              <CardTitle className="text-[11px] font-semibold flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                List Outlet
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="text-[10px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-7 px-2 font-semibold">
                      Outlet
                    </TableHead>
                    <TableHead className="h-7 px-2 font-semibold">
                      Region
                    </TableHead>
                    <TableHead className="h-7 px-2 font-semibold">
                      Status
                    </TableHead>
                    <TableHead className="h-7 px-2 text-right font-semibold">
                      Cap
                    </TableHead>
                    <TableHead className="h-7 px-2 text-right font-semibold">
                      V1
                    </TableHead>
                    <TableHead className="h-7 px-2 text-right font-semibold">
                      V2
                    </TableHead>
                    <TableHead className="h-7 px-2 text-right font-semibold">
                      V3
                    </TableHead>
                    <TableHead className="h-7 px-2 text-right font-semibold">
                      A1
                    </TableHead>
                    <TableHead className="h-7 px-2 text-right font-semibold">
                      A2
                    </TableHead>
                    <TableHead className="h-7 px-2 text-right font-semibold">
                      A3
                    </TableHead>
                    <TableHead className="h-7 px-2 text-right font-semibold">
                      kWh
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell
                        colSpan={11}
                        className="py-6 text-center text-[10px] text-muted-foreground"
                      >
                        Memuat outlet...
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading && filteredOutlets.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={11}
                        className="py-6 text-center text-[10px] text-muted-foreground"
                      >
                        Tidak ada outlet.
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading &&
                    filteredOutlets.map((outlet) => (
                      <TableRow
                        key={outlet.scopeId}
                        className="cursor-pointer hover:bg-muted/40 h-8"
                        onClick={() =>
                          router.push(
                            `/dashboard/electricity/${outlet.scopeId}`,
                          )
                        }
                      >
                        <TableCell className="px-2 py-1 font-medium">
                          <Link
                            href={`/dashboard/electricity/${outlet.scopeId}`}
                            className="hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {outlet.name}
                          </Link>
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          {outlet.region}
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          <div className="inline-flex items-center gap-1">
                            <Circle
                              className={`h-2 w-2 fill-current ${
                                outlet.statusLabel === "online"
                                  ? "text-emerald-500"
                                  : outlet.statusLabel === "warning"
                                    ? "text-amber-500"
                                    : "text-red-500"
                              }`}
                            />
                            <span className="text-[9px] font-medium uppercase">
                              {outlet.statusLabel}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-1 text-right">
                          {formatCompactNumber(outlet.capacityV)}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-right">
                          {formatCompactNumber(outlet.voltageL1)}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-right">
                          {formatCompactNumber(outlet.voltageL2)}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-right">
                          {formatCompactNumber(outlet.voltageL3)}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-right">
                          {formatCompactNumber(outlet.currentL1)}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-right">
                          {formatCompactNumber(outlet.currentL2)}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-right">
                          {formatCompactNumber(outlet.currentL3)}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-right font-medium">
                          {formatCompactNumber(outlet.energyMonth)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>

        {error && (
          <motion.p
            variants={itemVariants}
            className="text-[10px] text-destructive"
          >
            {error}
          </motion.p>
        )}
      </motion.div>
    </PageTransition>
  );
}
