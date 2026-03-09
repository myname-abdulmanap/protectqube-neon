"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  DollarSign,
  MapPinned,
  Store,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  alertEventsApi,
  energyDashboardApi,
  type EnergyOverviewData,
} from "@/lib/api";
import {
  buildEnergyFilters,
  createEnergyPeriod,
  formatCompactNumber,
  formatCurrency,
  formatDateTime,
  formatPeriodLabel,
  normalizeEnergyPeriod,
  type EnergyPeriodState,
  type EnergyPreset,
} from "@/lib/energy-monitoring";
import { exportToExcel, exportToPdf } from "@/lib/report-export";
import { EnergyPeriodFilter } from "@/components/dashboard/EnergyPeriodFilter";
import { EnergyExportActions } from "@/components/dashboard/EnergyExportActions";
import { useRealtimeContext } from "@/components/providers/RealtimeProvider";

const LeafletMap = dynamic(
  () => import("@/components/ui/leaflet-map").then((mod) => mod.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] items-center justify-center rounded-xl bg-muted/30 text-sm text-muted-foreground">
        Loading map...
      </div>
    ),
  },
);

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

type OverviewAlert = {
  id: string;
  outlet: string;
  region: string;
  type: string;
  severity: string;
  message: string;
  timestamp: string;
};

const getSeverityVariant = (
  severity: string,
): "default" | "secondary" | "destructive" | "outline" => {
  switch (severity.toLowerCase()) {
    case "critical":
      return "destructive";
    case "suspicious":
      return "secondary";
    default:
      return "outline";
  }
};

export default function EnergyOverviewPage() {
  const realtime = useRealtimeContext();
  const [period, setPeriod] = useState<EnergyPeriodState>(() =>
    createEnergyPeriod("today"),
  );
  const [appliedPeriod, setAppliedPeriod] = useState<EnergyPeriodState>(() =>
    createEnergyPeriod("today"),
  );
  const [overviewData, setOverviewData] = useState<EnergyOverviewData | null>(
    null,
  );
  const [alerts, setAlerts] = useState<OverviewAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(
    () => buildEnergyFilters(appliedPeriod),
    [appliedPeriod],
  );
  const periodLabel = useMemo(
    () => formatPeriodLabel(appliedPeriod),
    [appliedPeriod],
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [overviewResponse, alertResponse] = await Promise.all([
          energyDashboardApi.getOverview(filters),
          alertEventsApi.getAll({
            moduleType: "power_meter",
            from: filters.from,
            to: filters.to,
            limit: 100,
          }),
        ]);

        if (!active) {
          return;
        }

        if (!overviewResponse.success || !overviewResponse.data) {
          setError(overviewResponse.error || "Failed to load overview data");
          setOverviewData(null);
        } else {
          setOverviewData(overviewResponse.data);
        }

        if (alertResponse.success && alertResponse.data) {
          setAlerts(
            alertResponse.data.map((alert) => ({
              id: alert.id,
              outlet:
                alert.device?.scope?.name ||
                alert.device?.name ||
                "Unknown Outlet",
              region: alert.device?.scope?.region || "Unknown",
              type: alert.alertType,
              severity: alert.severity,
              message:
                alert.description || alert.title || "Alert event detected",
              timestamp: alert.timestamp,
            })),
          );
        } else {
          setAlerts([]);
        }
      } catch {
        if (active) {
          setError("Failed to load overview data");
          setOverviewData(null);
          setAlerts([]);
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

  useEffect(() => {
    const unsubscribe = realtime.subscribe("alert", (message) => {
      if (message.type !== "alert") {
        return;
      }

      const alertData = message.data as {
        id: string;
        moduleType: string;
        alertType: string;
        severity: string;
        title: string;
        description?: string;
        timestamp: string;
        device?: { name: string; scope?: { name: string; region?: string } };
      };

      if (alertData.moduleType !== "power_meter") {
        return;
      }

      const alertTime = new Date(alertData.timestamp).getTime();
      const fromTime = new Date(filters.from || "").getTime();
      const toTime = new Date(filters.to || "").getTime();

      if (
        !Number.isNaN(fromTime) &&
        !Number.isNaN(toTime) &&
        (alertTime < fromTime || alertTime > toTime)
      ) {
        return;
      }

      setAlerts((current) => [
        {
          id: alertData.id,
          outlet:
            alertData.device?.scope?.name ||
            alertData.device?.name ||
            "Unknown Outlet",
          region: alertData.device?.scope?.region || "Unknown",
          type: alertData.alertType,
          severity: alertData.severity,
          message:
            alertData.description || alertData.title || "Alert event detected",
          timestamp: alertData.timestamp,
        },
        ...current.filter((item) => item.id !== alertData.id).slice(0, 99),
      ]);
    });

    return unsubscribe;
  }, [filters.from, filters.to, realtime]);

  const topOutlets = useMemo(
    () => overviewData?.outletLocations.slice(0, 8) || [],
    [overviewData],
  );

  const mapOutlets = useMemo(
    () =>
      (overviewData?.outletLocations || [])
        .filter((item) => item.lat !== null && item.lng !== null)
        .map((item) => ({
          id: item.id,
          name: item.name,
          region: item.region,
          lat: item.lat as number,
          lng: item.lng as number,
          status: (item.status === "alert" || item.status === "high"
            ? item.status
            : "normal") as "normal" | "high" | "alert",
          usage: item.usage,
          cost: item.cost,
        })),
    [overviewData],
  );

  const buildDetailHref = (scopeId: string) => {
    const params = new URLSearchParams();
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    return `/dashboard/electricity/${scopeId}?${params.toString()}`;
  };

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

  const handleExportExcel = async () => {
    if (!overviewData) return;

    await exportToExcel(`energy-overview-${overviewData.date}.xlsx`, [
      {
        name: "Summary",
        rows: [
          {
            period: periodLabel,
            totalEnergyKwh: overviewData.globalKpi.totalEnergy,
            totalCost: overviewData.globalKpi.totalCost,
            activeOutlets: overviewData.globalKpi.activeOutlets,
            alertOutlets: overviewData.globalKpi.alertOutlets,
          },
        ],
      },
      {
        name: "Regions",
        rows: overviewData.regionData.map((item) => ({
          region: item.region,
          energyKwh: item.kWh,
          cost: item.cost,
          outlets: item.outlets,
        })),
      },
      {
        name: "Outlets",
        rows: overviewData.outletLocations.map((item) => ({
          outlet: item.name,
          region: item.region,
          city: item.city,
          status: item.status,
          energyKwh: item.usage,
          cost: item.cost,
        })),
      },
      {
        name: "Alerts",
        rows: alerts.map((item) => ({
          timestamp: formatDateTime(item.timestamp),
          outlet: item.outlet,
          region: item.region,
          type: item.type,
          severity: item.severity,
          message: item.message,
        })),
      },
    ]);
  };

  const handleExportPdf = async () => {
    if (!overviewData) return;

    await exportToPdf({
      fileName: `energy-overview-${overviewData.date}.pdf`,
      title: "Energy Monitoring Overview",
      scopeName: "All Outlets",
      period: periodLabel,
      generatedAt: new Date().toLocaleString("id-ID"),
      summary: [
        `Total energi: ${formatCompactNumber(overviewData.globalKpi.totalEnergy)} kWh`,
        `Estimasi biaya: ${formatCurrency(overviewData.globalKpi.totalCost)}`,
        `Outlet aktif: ${overviewData.globalKpi.activeOutlets}, outlet berstatus alert/high: ${overviewData.globalKpi.alertOutlets}`,
      ],
      tables: [
        {
          title: "Ringkasan Region",
          columns: ["Region", "Energi (kWh)", "Biaya", "Outlet"],
          rows: overviewData.regionData.map((item) => [
            item.region,
            item.kWh,
            formatCurrency(item.cost),
            item.outlets,
          ]),
        },
        {
          title: "Outlet Tertinggi",
          columns: ["Outlet", "Region", "Status", "Energi (kWh)", "Biaya"],
          rows: topOutlets.map((item) => [
            item.name,
            item.region,
            item.status,
            item.usage,
            formatCurrency(item.cost),
          ]),
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
          className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Energy Overview
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Ringkasan konsumsi energi outlet berdasarkan periode {periodLabel}
            </p>
          </div>
          <EnergyExportActions
            onExportPdf={handleExportPdf}
            onExportExcel={handleExportExcel}
            disabled={!overviewData || loading}
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
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <Card className="border-0 bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                    Energi Periode
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {formatCompactNumber(
                      overviewData?.globalKpi.totalEnergy || 0,
                    )}
                  </p>
                  <p className="text-sm text-white/80">kWh</p>
                </div>
                <Zap className="h-8 w-8 text-white/85" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                    Estimasi Biaya
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {formatCurrency(overviewData?.globalKpi.totalCost || 0)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-white/85" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                    Outlet Aktif
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {overviewData?.globalKpi.activeOutlets || 0}
                  </p>
                </div>
                <Store className="h-8 w-8 text-white/85" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                    Outlet Alert
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {overviewData?.globalKpi.alertOutlets || 0}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-white/85" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <motion.div variants={itemVariants}>
            <Card className="overflow-hidden border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/20">
                <div>
                  <CardTitle>Distribusi Energi per Region</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Akumulasi energi pada periode aktif
                  </p>
                </div>
                <Badge variant="outline">
                  {overviewData?.range.label || periodLabel}
                </Badge>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overviewData?.regionData || []}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-muted"
                      />
                      <XAxis
                        dataKey="region"
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                      />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} />
                      <Bar dataKey="kWh" fill="#0f766e" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="overflow-hidden border shadow-sm">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="flex items-center gap-2">
                  <MapPinned className="h-5 w-5" />
                  Peta Outlet
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <LeafletMap outlets={mapOutlets} className="h-[320px]" />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20">
                <div>
                  <CardTitle>Outlet dengan Konsumsi Tertinggi</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Gunakan detail untuk melihat perangkat dan histori secara
                    lengkap
                  </p>
                </div>
                <Badge variant="outline">{topOutlets.length} outlet</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Outlet</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Energi</TableHead>
                      <TableHead className="text-right">Biaya</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topOutlets.map((outlet) => (
                      <TableRow key={outlet.id}>
                        <TableCell className="font-medium">
                          {outlet.name}
                        </TableCell>
                        <TableCell>{outlet.region}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              outlet.status === "alert"
                                ? "destructive"
                                : outlet.status === "high"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {outlet.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCompactNumber(outlet.usage)} kWh
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(outlet.cost)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={buildDetailHref(outlet.id)}>
                              Detail
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!topOutlets.length && !loading && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          Tidak ada data outlet pada periode ini.
                        </TableCell>
                      </TableRow>
                    )}
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
                    Alert power meter pada periode yang sama
                  </p>
                </div>
                <Badge variant="outline">{alerts.length} event</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[420px]">
                  <div className="divide-y">
                    {alerts.map((alert) => (
                      <div key={alert.id} className="space-y-2 px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{alert.outlet}</p>
                            <p className="text-xs text-muted-foreground">
                              {alert.region} • {formatDateTime(alert.timestamp)}
                            </p>
                          </div>
                          <Badge variant={getSeverityVariant(alert.severity)}>
                            {alert.severity}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{alert.type}</p>
                          <p className="text-sm text-muted-foreground">
                            {alert.message}
                          </p>
                        </div>
                      </div>
                    ))}
                    {!alerts.length && !loading && (
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
