"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Zap,
  TrendingUp,
  AlertTriangle,
  Activity,
  Clock,
  DollarSign,
  Gauge,
  Store,
  Bell,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/ui/page-transition";
import {
  alertEventsApi,
  deviceMetricsApi,
  energyDashboardApi,
  type EnergyOutletDetail,
} from "@/lib/api";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    },
  },
};

type OutletView = {
  id: string;
  name: string;
  region: string;
  kpiData: EnergyOutletDetail["kpiData"];
  hourlyData: EnergyOutletDetail["hourlyData"];
  sectionData: EnergyOutletDetail["sectionData"];
  comparisonData: EnergyOutletDetail["comparisonData"];
  peakPower: number;
  maxLoad: number | null;
};

type OutletAlert = {
  id: string;
  type: string;
  severity: string;
  message: string;
  time: string;
  section: string;
};

type RealtimeMetricState = {
  voltageL1: number | null;
  currentL1: number | null;
  energyL1: number | null;
  energyL2: number | null;
  energyL3: number | null;
  totalEnergy: number | null;
  powerKw: number | null;
  lastUpdated: string | null;
};

const hourlyChartConfig = {
  usage: {
    label: "Penggunaan (kWh)",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function ElectricityPage() {
  const [outlets, setOutlets] = useState<OutletView[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>("");
  const [currentPower, setCurrentPower] = useState(0);
  const [loadStatus, setLoadStatus] = useState<"NORMAL" | "OVERLOAD">("NORMAL");
  const [alerts, setAlerts] = useState<OutletAlert[]>([]);
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetricState>({
    voltageL1: null,
    currentL1: null,
    energyL1: null,
    energyL2: null,
    energyL3: null,
    totalEnergy: null,
    powerKw: null,
    lastUpdated: null,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOutlets = async () => {
      try {
        setError(null);
        const now = new Date();
        const startOfMonthUtc = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
        );
        const periodFilters = {
          from: startOfMonthUtc.toISOString(),
          to: now.toISOString(),
        };

        const listResponse = await energyDashboardApi.getOutlets(periodFilters);
        if (!listResponse.success || !listResponse.data) {
          setError(listResponse.error || "Failed to load outlet list");
          return;
        }

        const details = await Promise.all(
          listResponse.data.map(async (item) => {
            const detailResponse = await energyDashboardApi.getOutletDetail(
              item.scopeId,
              periodFilters,
            );
            return detailResponse.success ? detailResponse.data : null;
          }),
        );

        const mappedOutlets: OutletView[] = details
          .filter((detail): detail is EnergyOutletDetail => Boolean(detail))
          .map((detail) => ({
            id: detail.id,
            name: detail.name,
            region: detail.region || "Unknown",
            kpiData: detail.kpiData,
            hourlyData: detail.hourlyData,
            sectionData: detail.sectionData,
            comparisonData: detail.comparisonData,
            peakPower: detail.peakPower,
            maxLoad: detail.maxLoad,
          }));

        setOutlets(mappedOutlets);
        if (mappedOutlets[0]) {
          setSelectedOutlet(mappedOutlets[0].id);
        }
      } catch {
        setError("Failed to load outlet data");
      }
    };

    loadOutlets();
  }, []);
  const outlet = outlets.find((o) => o.id === selectedOutlet) || outlets[0];

  useEffect(() => {
    if (!outlet) return;

    const refreshRealtimeData = async () => {
      try {
        const safeNumber = (value: unknown) => {
          const parsed =
            typeof value === "number" ? value : Number(value ?? Number.NaN);
          return Number.isFinite(parsed) ? parsed : 0;
        };

        const toDisplayValue = (value: unknown) => {
          const parsed =
            typeof value === "number" ? value : Number(value ?? Number.NaN);
          return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
        };

        const toPowerKw = (value: number, unit?: string | null) => {
          if (unit === "W") {
            return Number((value / 1000).toFixed(2));
          }
          return Number(value.toFixed(2));
        };

        const toEnergyKwh = (value: number, unit?: string | null) => {
          if (unit === "Wh") {
            return Number((value / 1000).toFixed(2));
          }
          return Number(value.toFixed(2));
        };

        const [metricResponse, alertResponse] = await Promise.all([
          deviceMetricsApi.getAll({
            scopeId: outlet.id,
            moduleType: "power_meter",
            limit: 300,
          }),
          alertEventsApi.getAll({
            scopeId: outlet.id,
            limit: 20,
          }),
        ]);

        if (metricResponse.success && metricResponse.data) {
          const latestByKey = new Map<
            string,
            (typeof metricResponse.data)[0]
          >();
          for (const metric of metricResponse.data) {
            if (!latestByKey.has(metric.metricKey)) {
              latestByKey.set(metric.metricKey, metric);
            }
          }

          const powerMetric = latestByKey.get("power");
          const voltageL1Metric = latestByKey.get("voltage_l1");
          const currentL1Metric = latestByKey.get("current_l1");
          const energyL1Metric = latestByKey.get("energy_l1");
          const energyL2Metric = latestByKey.get("energy_l2");
          const energyL3Metric = latestByKey.get("energy_l3");

          const powerKw = powerMetric
            ? toPowerKw(safeNumber(powerMetric.metricValue), powerMetric.unit)
            : null;

          const energyL1 = energyL1Metric
            ? toEnergyKwh(
                safeNumber(energyL1Metric.metricValue),
                energyL1Metric.unit,
              )
            : null;
          const energyL2 = energyL2Metric
            ? toEnergyKwh(
                safeNumber(energyL2Metric.metricValue),
                energyL2Metric.unit,
              )
            : null;
          const energyL3 = energyL3Metric
            ? toEnergyKwh(
                safeNumber(energyL3Metric.metricValue),
                energyL3Metric.unit,
              )
            : null;

          const energyValues = [energyL1, energyL2, energyL3].filter(
            (value): value is number => value !== null,
          );
          const totalEnergy =
            energyValues.length > 0
              ? Number(
                  energyValues
                    .reduce((sum, value) => sum + value, 0)
                    .toFixed(2),
                )
              : null;

          const latestMetricTimestamp =
            metricResponse.data[0]?.timestamp || powerMetric?.timestamp || null;

          setRealtimeMetrics({
            voltageL1: toDisplayValue(voltageL1Metric?.metricValue),
            currentL1: toDisplayValue(currentL1Metric?.metricValue),
            energyL1,
            energyL2,
            energyL3,
            totalEnergy,
            powerKw,
            lastUpdated: latestMetricTimestamp,
          });

          const safePowerKw = powerKw ?? outlet.peakPower;

          setCurrentPower(safePowerKw);

          if (outlet.maxLoad && outlet.maxLoad > 0) {
            setLoadStatus(safePowerKw > outlet.maxLoad ? "OVERLOAD" : "NORMAL");
          } else {
            setLoadStatus("NORMAL");
          }
        } else {
          setCurrentPower(outlet.peakPower);
          setRealtimeMetrics({
            voltageL1: null,
            currentL1: null,
            energyL1: null,
            energyL2: null,
            energyL3: null,
            totalEnergy: null,
            powerKw: outlet.peakPower,
            lastUpdated: null,
          });
        }

        if (alertResponse.success && alertResponse.data) {
          setAlerts(
            alertResponse.data.map((alert) => {
              const eventDate = new Date(alert.timestamp);
              return {
                id: alert.id,
                type: alert.alertType,
                severity: alert.severity,
                message:
                  alert.description || alert.title || "Alert event detected",
                time: Number.isNaN(eventDate.getTime())
                  ? "-"
                  : eventDate.toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                section: alert.device?.locationName || "Outlet",
              };
            }),
          );
        }
      } catch {
        setCurrentPower(outlet.peakPower);
        setRealtimeMetrics({
          voltageL1: null,
          currentL1: null,
          energyL1: null,
          energyL2: null,
          energyL3: null,
          totalEnergy: null,
          powerKw: outlet.peakPower,
          lastUpdated: null,
        });
      }
    };

    void refreshRealtimeData();
    const interval = setInterval(() => {
      void refreshRealtimeData();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [outlet]);

  if (!outlet) {
    return (
      <PageTransition>
        <div className="p-4 text-sm text-muted-foreground">
          {error || "No outlet data available"}
        </div>
      </PageTransition>
    );
  }

  const toSafeNumber = (value: unknown) => {
    const parsed =
      typeof value === "number" ? value : Number(value ?? Number.NaN);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(toSafeNumber(value));
  };

  const formatKwh = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(toSafeNumber(value));
  };

  const todayUsage = toSafeNumber(outlet.kpiData.latestDailyUsage);
  const todayCost = toSafeNumber(outlet.kpiData.latestDailyCost);
  const monthUsage = toSafeNumber(outlet.kpiData.totalUsage);
  const monthCost = toSafeNumber(outlet.kpiData.totalCost);
  const dailyAverageChange = toSafeNumber(
    outlet.comparisonData.dailyAverage.change,
  );
  const dailyAverageCurrent = toSafeNumber(
    outlet.comparisonData.dailyAverage.current,
  );
  const dailyAveragePrevious = toSafeNumber(
    outlet.comparisonData.dailyAverage.previous,
  );
  const currentPeriodChange = toSafeNumber(
    outlet.comparisonData.currentPeriod.change,
  );
  const currentPeriodCurrent = toSafeNumber(
    outlet.comparisonData.currentPeriod.current,
  );
  const currentPeriodPrevious = toSafeNumber(
    outlet.comparisonData.currentPeriod.previous,
  );

  const getAlertBadgeColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-red-500/20 text-red-500 border-red-500/30";
      case "suspicious":
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
      case "health":
        return "bg-blue-500/20 text-blue-500 border-blue-500/30";
      default:
        return "bg-slate-500/20 text-slate-500 border-slate-500/30";
    }
  };

  const sectionDotColors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
  ];

  const getSectionDotColor = (index: number) => {
    return sectionDotColors[index % sectionDotColors.length];
  };

  const loadPercentage =
    outlet.maxLoad && outlet.maxLoad > 0
      ? Math.min(100, (currentPower / outlet.maxLoad) * 100)
      : 0;

  return (
    <PageTransition>
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {error && (
          <div className="rounded bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Monitoring Listrik Outlet
            </h1>
            <p className="text-muted-foreground">
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Pilih Outlet" />
              </SelectTrigger>
              <SelectContent>
                {outlets.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      <span>{o.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {o.region}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="gap-1">
              <Bell className="h-3 w-3" />
              {alerts.length} Alert
            </Badge>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/80">Penggunaan Hari Ini</p>
                  <p className="text-2xl font-bold truncate">
                    {formatKwh(todayUsage)} kWh
                  </p>
                </div>
                <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Zap className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/80">
                    Estimasi Biaya Hari Ini
                  </p>
                  <p className="text-2xl font-bold truncate">
                    {formatCurrency(todayCost)}
                  </p>
                </div>
                <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-violet-500 to-purple-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/80">Penggunaan Bulan Ini</p>
                  <p className="text-2xl font-bold truncate">
                    {formatKwh(monthUsage)} kWh
                  </p>
                </div>
                <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Activity className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/80">
                    Estimasi Biaya Bulanan
                  </p>
                  <p className="text-2xl font-bold truncate">
                    {formatCurrency(monthCost)}
                  </p>
                </div>
                <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Real-Time Power Monitoring */}
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5" />
                  Daya Real-Time
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="relative inline-flex items-center justify-center">
                    <svg className="w-40 h-40 transform -rotate-90">
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        className="text-muted/20"
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={440}
                        strokeDashoffset={440 - (440 * loadPercentage) / 100}
                        className={cn(
                          "transition-all duration-500",
                          loadStatus === "OVERLOAD"
                            ? "text-red-500"
                            : "text-green-500",
                        )}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold">{currentPower}</span>
                      <span className="text-sm text-muted-foreground">kW</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Status Beban
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        loadStatus === "OVERLOAD"
                          ? "bg-red-500/20 text-red-500 border-red-500/30"
                          : "bg-green-500/20 text-green-500 border-green-500/30",
                      )}
                    >
                      {loadStatus === "OVERLOAD" ? "OVERLOAD" : "NORMAL LOAD"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Beban Puncak Hari Ini
                    </span>
                    <span className="font-medium">{outlet.peakPower} kW</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Kapasitas Maksimal
                    </span>
                    <span className="font-medium">
                      {outlet.maxLoad !== null
                        ? `${outlet.maxLoad} kW`
                        : "Belum diset"}
                    </span>
                  </div>
                  <Progress
                    value={loadPercentage}
                    className={cn(
                      "h-2",
                      loadStatus === "OVERLOAD" && "[&>div]:bg-red-500",
                    )}
                  />
                  <p className="text-xs text-center text-muted-foreground">
                    {outlet.maxLoad !== null
                      ? `${loadPercentage.toFixed(1)}% dari kapasitas`
                      : "Atur maxLoadKw di Energy Config untuk batas daya"}
                  </p>

                  <Separator />

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-md border bg-muted/30 p-2">
                      <p className="text-xs text-muted-foreground">
                        Voltage L1
                      </p>
                      <p className="font-semibold">
                        {realtimeMetrics.voltageL1 !== null
                          ? `${formatKwh(realtimeMetrics.voltageL1)} V`
                          : "-"}
                      </p>
                    </div>
                    <div className="rounded-md border bg-muted/30 p-2">
                      <p className="text-xs text-muted-foreground">
                        Current L1
                      </p>
                      <p className="font-semibold">
                        {realtimeMetrics.currentL1 !== null
                          ? `${formatKwh(realtimeMetrics.currentL1)} A`
                          : "-"}
                      </p>
                    </div>
                    <div className="rounded-md border bg-muted/30 p-2">
                      <p className="text-xs text-muted-foreground">Energy L1</p>
                      <p className="font-semibold">
                        {realtimeMetrics.energyL1 !== null
                          ? `${formatKwh(realtimeMetrics.energyL1)} kWh`
                          : "-"}
                      </p>
                    </div>
                    <div className="rounded-md border bg-muted/30 p-2">
                      <p className="text-xs text-muted-foreground">Energy L2</p>
                      <p className="font-semibold">
                        {realtimeMetrics.energyL2 !== null
                          ? `${formatKwh(realtimeMetrics.energyL2)} kWh`
                          : "-"}
                      </p>
                    </div>
                    <div className="rounded-md border bg-muted/30 p-2">
                      <p className="text-xs text-muted-foreground">Energy L3</p>
                      <p className="font-semibold">
                        {realtimeMetrics.energyL3 !== null
                          ? `${formatKwh(realtimeMetrics.energyL3)} kWh`
                          : "-"}
                      </p>
                    </div>
                    <div className="rounded-md border bg-muted/30 p-2">
                      <p className="text-xs text-muted-foreground">
                        Total Energy 3-Phase
                      </p>
                      <p className="font-semibold">
                        {realtimeMetrics.totalEnergy !== null
                          ? `${formatKwh(realtimeMetrics.totalEnergy)} kWh`
                          : "-"}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-center text-muted-foreground">
                    Parser `generic_metrics` | Phase `three-phase` | Interval 60
                    detik
                    {realtimeMetrics.lastUpdated
                      ? ` | Update: ${new Date(
                          realtimeMetrics.lastUpdated,
                        ).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}`
                      : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Hourly Energy Usage Chart */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Penggunaan Listrik per Jam
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={hourlyChartConfig}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={outlet.hourlyData}
                      margin={{ left: 0, right: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="hour"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}`}
                        width={35}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                      />
                      <Bar
                        dataKey="usage"
                        fill="hsl(var(--chart-1))"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
                <div className="flex justify-center gap-6 mt-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    Lunch Rush (11:00-13:00)
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    Dinner Rush (18:00-20:00)
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Energy by Section */}
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Konsumsi per Bagian
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={outlet.sectionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {outlet.sectionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3 mt-4">
                  {outlet.sectionData.map((section, index) => (
                    <div
                      key={section.name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-3 h-3 rounded-full",
                            getSectionDotColor(index),
                          )}
                        />
                        <span className="text-sm">{section.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{section.value}%</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({section.kWh} kWh)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Usage Comparison */}
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Perbandingan Penggunaan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Today vs Yesterday */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Hari Ini vs Kemarin
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        dailyAverageChange > 0
                          ? "bg-red-500/20 text-red-500 border-red-500/30"
                          : "bg-green-500/20 text-green-500 border-green-500/30",
                      )}
                    >
                      {dailyAverageChange > 0 ? (
                        <ArrowUp className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowDown className="h-3 w-3 mr-1" />
                      )}
                      {Math.abs(dailyAverageChange)}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Hari Ini</p>
                      <p className="text-lg font-bold">
                        {formatKwh(dailyAverageCurrent)} kWh
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Kemarin</p>
                      <p className="text-lg font-bold">
                        {formatKwh(dailyAveragePrevious)} kWh
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* This Month vs Last Month */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Bulan Ini vs Bulan Lalu
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        currentPeriodChange > 0
                          ? "bg-red-500/20 text-red-500 border-red-500/30"
                          : "bg-green-500/20 text-green-500 border-green-500/30",
                      )}
                    >
                      {currentPeriodChange > 0 ? (
                        <ArrowUp className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowDown className="h-3 w-3 mr-1" />
                      )}
                      {Math.abs(currentPeriodChange)}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Bulan Ini</p>
                      <p className="text-lg font-bold">
                        {formatKwh(currentPeriodCurrent)} kWh
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">
                        Bulan Lalu
                      </p>
                      <p className="text-lg font-bold">
                        {formatKwh(currentPeriodPrevious)} kWh
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Alerts & Notifications */}
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Alert & Notifikasi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[280px] pr-4">
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  getAlertBadgeColor(alert.severity),
                                )}
                              >
                                {alert.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {alert.section}
                              </span>
                            </div>
                            <p className="text-sm">{alert.message}</p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {alert.time}
                          </span>
                        </div>
                      </div>
                    ))}
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
