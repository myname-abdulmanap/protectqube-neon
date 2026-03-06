"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  Bell,
  Building2,
  Gauge,
  MapPin,
  Package,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/ui/page-transition";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { energyDashboardApi, type EnergyOutletDetail } from "@/lib/api";
import {
  buildEnergyFilters,
  createEnergyPeriod,
  formatCompactNumber,
  formatCurrency,
  formatDateTime,
  normalizeEnergyPeriod,
  type EnergyPeriodState,
  type EnergyPreset,
} from "@/lib/energy-monitoring";
import { exportToExcel, exportToPdf } from "@/lib/report-export";
import { EnergyExportActions } from "@/components/dashboard/EnergyExportActions";
import { EnergyPeriodFilter } from "@/components/dashboard/EnergyPeriodFilter";

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

const getPresetFromSearchParams = (
  from: string | null,
  to: string | null,
): EnergyPeriodState => {
  if (!from || !to) {
    return createEnergyPeriod("today");
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return createEnergyPeriod("today");
  }

  const pad = (value: number) => value.toString().padStart(2, "0");
  const toInputValue = (value: Date) =>
    `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;

  return {
    preset: "custom",
    from: toInputValue(fromDate),
    to: toInputValue(toDate),
  };
};

export default function ElectricityOutletDetailPage() {
  const params = useParams<{ scopeId: string }>();
  const searchParams = useSearchParams();
  const [period, setPeriod] = useState<EnergyPeriodState>(() =>
    getPresetFromSearchParams(searchParams.get("from"), searchParams.get("to")),
  );
  const [appliedPeriod, setAppliedPeriod] = useState<EnergyPeriodState>(() =>
    getPresetFromSearchParams(searchParams.get("from"), searchParams.get("to")),
  );
  const [detail, setDetail] = useState<EnergyOutletDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(
    () => buildEnergyFilters(appliedPeriod),
    [appliedPeriod],
  );
  const scopeId = params.scopeId;

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await energyDashboardApi.getOutletDetail(
          scopeId,
          filters,
        );
        if (!active) {
          return;
        }

        if (!response.success || !response.data) {
          setDetail(null);
          setError(response.error || "Failed to load outlet detail");
          return;
        }

        setDetail(response.data);
      } catch {
        if (active) {
          setDetail(null);
          setError("Failed to load outlet detail");
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
  }, [filters, scopeId]);

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

  const currentPower = useMemo(
    () =>
      (detail?.devices || []).reduce(
        (sum, device) => sum + device.latestPowerKw,
        0,
      ),
    [detail],
  );

  const handleExportExcel = async () => {
    if (!detail) return;

    await exportToExcel(`outlet-detail-${detail.id}.xlsx`, [
      {
        name: "Summary",
        rows: [
          {
            outlet: detail.name,
            region: detail.region,
            city: detail.city,
            address: detail.address,
            from: detail.period.from,
            to: detail.period.to,
            totalUsageKwh: detail.kpiData.totalUsage,
            totalCost: detail.kpiData.totalCost,
            averageDailyUsage: detail.kpiData.averageDailyUsage,
            peakPowerKw: detail.peakPower,
            activeDevices: detail.kpiData.activeDevices,
            totalAlerts: detail.kpiData.totalAlerts,
          },
        ],
      },
      {
        name: "PowerSeries",
        rows: detail.powerSeries.map((item) => ({
          timestamp: formatDateTime(item.timestamp),
          device: item.deviceName,
          powerKw: item.powerKw,
        })),
      },
      {
        name: "Devices",
        rows: detail.devices.map((device) => ({
          device: device.name,
          serialNo: device.serialNo,
          locationName: device.locationName,
          locationType: device.locationType,
          status: device.status,
          latestPowerKw: device.latestPowerKw,
          metricCount: device.metricCount,
          alertCount: device.alertCount,
          lastSeenAt: device.lastSeenAt
            ? formatDateTime(device.lastSeenAt)
            : "-",
        })),
      },
      {
        name: "Alerts",
        rows: detail.alertHistory.map((alert) => ({
          timestamp: formatDateTime(alert.timestamp),
          device: alert.deviceName,
          location: alert.locationName,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
        })),
      },
    ]);
  };

  const handleExportPdf = async () => {
    if (!detail) return;

    await exportToPdf({
      fileName: `outlet-detail-${detail.id}.pdf`,
      title: `Outlet Detail Report - ${detail.name}`,
      subtitle: `Periode: ${detail.period.label}`,
      summary: [
        `Energi total: ${formatCompactNumber(detail.kpiData.totalUsage)} kWh`,
        `Biaya total: ${formatCurrency(detail.kpiData.totalCost)}`,
        `Power saat ini: ${formatCompactNumber(currentPower)} kW, peak power: ${formatCompactNumber(detail.peakPower)} kW`,
      ],
      tables: [
        {
          title: "Ringkasan Perangkat",
          columns: ["Perangkat", "Lokasi", "Status", "Power", "Alert"],
          rows: detail.devices.map((device) => [
            device.name,
            device.locationName || device.locationType || "-",
            device.status,
            device.latestPowerKw,
            device.alertCount,
          ]),
        },
        {
          title: "Alert History",
          columns: ["Waktu", "Perangkat", "Severity", "Type", "Pesan"],
          rows: detail.alertHistory
            .slice(0, 25)
            .map((alert) => [
              formatDateTime(alert.timestamp),
              alert.deviceName,
              alert.severity,
              alert.type,
              alert.message,
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
          className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between"
        >
          <div>
            <Button
              asChild
              variant="ghost"
              className="mb-2 px-0 text-sm text-muted-foreground"
            >
              <Link href="/dashboard/electricity">
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Power Outlets
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">
              {detail?.name || "Outlet Detail"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Data lengkap outlet, perangkat, dan histori alert sesuai periode
              aktif.
            </p>
          </div>
          <EnergyExportActions
            onExportPdf={handleExportPdf}
            onExportExcel={handleExportExcel}
            disabled={!detail || loading}
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
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"
        >
          <Card className="border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Energi Total
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {formatCompactNumber(detail?.kpiData.totalUsage || 0)} kWh
                  </p>
                </div>
                <Zap className="h-7 w-7 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Biaya Total
                  </p>
                  <p className="mt-2 text-xl font-semibold">
                    {formatCurrency(detail?.kpiData.totalCost || 0)}
                  </p>
                </div>
                <TrendingUp className="h-7 w-7 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Power Saat Ini
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {formatCompactNumber(currentPower)} kW
                  </p>
                </div>
                <Gauge className="h-7 w-7 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Perangkat Aktif
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {detail?.kpiData.activeDevices || 0}
                  </p>
                </div>
                <Package className="h-7 w-7 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Total Alert
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {detail?.kpiData.totalAlerts || 0}
                  </p>
                </div>
                <Bell className="h-7 w-7 text-primary" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle>Power Series</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={detail?.powerSeries || []}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-muted"
                      />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={(value) =>
                          formatDateTime(value).slice(0, 17)
                        }
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                      />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} />
                      <Tooltip
                        formatter={(value: number) => [
                          `${formatCompactNumber(value)} kW`,
                          "Power",
                        ]}
                        labelFormatter={(label) => formatDateTime(label)}
                      />
                      <Line
                        type="monotone"
                        dataKey="powerKw"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle>Profil Outlet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-5 text-sm">
                <div className="flex items-start gap-3 rounded-lg border p-3">
                  <Building2 className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium">Outlet</p>
                    <p className="text-muted-foreground">
                      {detail?.name || "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium">Lokasi</p>
                    <p className="text-muted-foreground">
                      {detail?.address || detail?.city || detail?.region || "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-3">
                  <Activity className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium">Perbandingan Periode</p>
                    <p className="text-muted-foreground">
                      {formatCompactNumber(
                        detail?.comparisonData.currentPeriod.current || 0,
                      )}{" "}
                      kWh saat ini, perubahan{" "}
                      {formatCompactNumber(
                        detail?.comparisonData.currentPeriod.change || 0,
                      )}
                      %
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    Peak {formatCompactNumber(detail?.peakPower || 0)} kW
                  </Badge>
                  <Badge variant="outline">
                    Avg{" "}
                    {formatCompactNumber(
                      detail?.kpiData.averageDailyUsage || 0,
                    )}{" "}
                    kWh/hari
                  </Badge>
                  <Badge variant="outline">{detail?.period.label || "-"}</Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20">
                <div>
                  <CardTitle>Daftar Perangkat</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Setiap perangkat dengan power terakhir, status, dan jumlah
                    alert
                  </p>
                </div>
                <Badge variant="outline">{detail?.devices.length || 0}</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Perangkat</TableHead>
                      <TableHead>Lokasi</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Power</TableHead>
                      <TableHead className="text-right">Last Seen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(detail?.devices || []).map((device) => (
                      <TableRow key={device.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{device.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {device.serialNo}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {device.locationName || device.locationType || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{device.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCompactNumber(device.latestPowerKw)} kW
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {device.lastSeenAt
                            ? formatDateTime(device.lastSeenAt)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
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
                    Histori lengkap event perangkat pada outlet ini
                  </p>
                </div>
                <Badge variant="outline">
                  {detail?.alertHistory.length || 0}
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[460px]">
                  <div className="divide-y">
                    {(detail?.alertHistory || []).map((alert) => (
                      <div key={alert.id} className="space-y-2 px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{alert.deviceName}</p>
                            <p className="text-xs text-muted-foreground">
                              {alert.locationName || "No location"} •{" "}
                              {formatDateTime(alert.timestamp)}
                            </p>
                          </div>
                          <Badge variant="outline">{alert.severity}</Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{alert.type}</p>
                          <p className="text-sm text-muted-foreground">
                            {alert.message}
                          </p>
                        </div>
                      </div>
                    ))}
                    {!detail?.alertHistory.length && !loading && (
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
