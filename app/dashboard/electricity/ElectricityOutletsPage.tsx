"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";
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
import { EnergyPeriodFilter } from "@/components/dashboard/EnergyPeriodFilter";
import {
  deviceMetricsApi,
  energyConfigsApi,
  energyDashboardApi,
} from "@/lib/api";
import {
  buildEnergyFilters,
  createEnergyPeriod,
  formatCompactNumber,
  normalizeEnergyPeriod,
  type EnergyPeriodState,
  type EnergyPreset,
} from "@/lib/energy-monitoring";

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
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const getStatusView = (
  onlineCount: number,
  offlineCount: number,
  total: number,
) => {
  if (total === 0) return "warning" as const;
  if (offlineCount === total) return "offline" as const;
  if (offlineCount > onlineCount) return "warning" as const;
  return "online" as const;
};

const getLatestMetricsByKey = (metrics: MetricItem[]) => {
  const latestByKey = new Map<string, MetricItem>();

  for (const metric of metrics) {
    const current = latestByKey.get(metric.metricKey);
    if (!current) {
      latestByKey.set(metric.metricKey, metric);
      continue;
    }

    if (
      new Date(metric.timestamp).getTime() >
      new Date(current.timestamp).getTime()
    ) {
      latestByKey.set(metric.metricKey, metric);
    }
  }

  return latestByKey;
};

export default function ElectricityOutletsPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<EnergyPeriodState>(() =>
    createEnergyPeriod("today"),
  );
  const [appliedPeriod, setAppliedPeriod] = useState<EnergyPeriodState>(() =>
    createEnergyPeriod("today"),
  );
  const [search, setSearch] = useState("");
  const [outlets, setOutlets] = useState<OutletListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(
    () => buildEnergyFilters(appliedPeriod),
    [appliedPeriod],
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const summaryResponse = await energyDashboardApi.getOutlets(filters);
        if (!summaryResponse.success || !summaryResponse.data) {
          if (active) {
            setOutlets([]);
            setError(summaryResponse.error || "Gagal memuat daftar outlet");
          }
          return;
        }

        const merged = await Promise.all(
          summaryResponse.data.map(async (summary) => {
            const [detailResponse, metricResponse, configResponse] =
              await Promise.all([
                energyDashboardApi.getOutletDetail(summary.scopeId, filters),
                deviceMetricsApi.getAll({
                  scopeId: summary.scopeId,
                  moduleType: "power_meter",
                  limit: 500,
                }),
                energyConfigsApi.getAll(summary.scopeId),
              ]);

            const devices =
              detailResponse.success && detailResponse.data
                ? detailResponse.data.devices
                : [];

            const onlineCount = devices.filter(
              (device) => device.status.toLowerCase() === "online",
            ).length;
            const offlineCount = devices.filter(
              (device) => device.status.toLowerCase() === "offline",
            ).length;
            const statusLabel = getStatusView(
              onlineCount,
              offlineCount,
              devices.length,
            );

            const metricItems =
              metricResponse.success && metricResponse.data
                ? metricResponse.data.map((metric) => ({
                    metricKey: metric.metricKey,
                    metricValue: Number(metric.metricValue ?? 0),
                    timestamp: metric.timestamp,
                    unit: metric.unit,
                  }))
                : [];

            const latestByKey = getLatestMetricsByKey(metricItems);

            const toMetricValue = (key: string) =>
              Number(latestByKey.get(key)?.metricValue ?? 0);

            const energyTotalMetric = latestByKey.get("energy_total");
            const energyMonth = energyTotalMetric
              ? energyTotalMetric.unit === "Wh"
                ? energyTotalMetric.metricValue / 1000
                : energyTotalMetric.metricValue
              : 0;

            const latestConfig =
              configResponse.success &&
              configResponse.data &&
              configResponse.data.length > 0
                ? configResponse.data[0]
                : null;

            return {
              scopeId: summary.scopeId,
              name: summary.scope.name,
              region: summary.scope.region || "Unknown",
              statusLabel,
              capacityV: Number(latestConfig?.capacityVa ?? 0),
              voltageL1: Number(toMetricValue("voltage_l1").toFixed(2)),
              voltageL2: Number(toMetricValue("voltage_l2").toFixed(2)),
              voltageL3: Number(toMetricValue("voltage_l3").toFixed(2)),
              currentL1: Number(toMetricValue("current_l1").toFixed(2)),
              currentL2: Number(toMetricValue("current_l2").toFixed(2)),
              currentL3: Number(toMetricValue("current_l3").toFixed(2)),
              energyMonth: Number(energyMonth.toFixed(2)),
            } satisfies OutletListItem;
          }),
        );

        if (!active) return;
        setOutlets(merged.sort((a, b) => b.energyMonth - a.energyMonth));
      } catch {
        if (active) {
          setOutlets([]);
          setError("Gagal memuat daftar outlet");
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
  }, [filters]);

  const filteredOutlets = useMemo(() => {
    if (!search.trim()) return outlets;

    const keyword = search.toLowerCase();
    return outlets.filter(
      (outlet) =>
        outlet.name.toLowerCase().includes(keyword) ||
        outlet.region.toLowerCase().includes(keyword),
    );
  }, [outlets, search]);

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

  const buildDetailHref = (scopeId: string) => {
    const params = new URLSearchParams();
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    return `/dashboard/electricity/${scopeId}?${params.toString()}`;
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
          className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Power Outlets</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              List outlet berdasarkan status perangkat dan metrik realtime.
            </p>
          </div>
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

        <motion.div variants={itemVariants}>
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-col gap-3 border-b bg-muted/20 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  List Outlet
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Klik nama outlet untuk membuka detail.
                </p>
              </div>
              <div className="relative w-full sm:w-[260px]">
                <ListFilter className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari outlet atau region..."
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Outlet</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Capacity (V)</TableHead>
                    <TableHead className="text-right">Voltage L1</TableHead>
                    <TableHead className="text-right">Voltage L2</TableHead>
                    <TableHead className="text-right">Voltage L3</TableHead>
                    <TableHead className="text-right">Current L1</TableHead>
                    <TableHead className="text-right">Current L2</TableHead>
                    <TableHead className="text-right">Current L3</TableHead>
                    <TableHead className="text-right">Energy Month (Kwh)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell
                        colSpan={11}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        Memuat outlet...
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading && filteredOutlets.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={11}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        Tidak ada outlet pada periode ini.
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading &&
                    filteredOutlets.map((outlet) => (
                      <TableRow
                        key={outlet.scopeId}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => {
                          router.push(buildDetailHref(outlet.scopeId));
                        }}
                      >
                        <TableCell className="font-medium">
                          <Link
                            href={buildDetailHref(outlet.scopeId)}
                            className="hover:underline"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {outlet.name}
                          </Link>
                        </TableCell>
                        <TableCell>{outlet.region}</TableCell>
                        <TableCell>
                          <div className="inline-flex items-center gap-1.5">
                            <Circle
                              className={`h-2.5 w-2.5 fill-current ${
                                outlet.statusLabel === "online"
                                  ? "text-emerald-500"
                                  : outlet.statusLabel === "warning"
                                    ? "text-amber-500"
                                    : "text-red-500"
                              }`}
                            />
                            <span className="text-xs font-medium uppercase">
                              {outlet.statusLabel}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCompactNumber(outlet.capacityV)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCompactNumber(outlet.voltageL1)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCompactNumber(outlet.voltageL2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCompactNumber(outlet.voltageL3)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCompactNumber(outlet.currentL1)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCompactNumber(outlet.currentL2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCompactNumber(outlet.currentL3)}
                        </TableCell>
                        <TableCell className="text-right">
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
            className="text-sm text-destructive"
          >
            {error}
          </motion.p>
        )}
      </motion.div>
    </PageTransition>
  );
}
