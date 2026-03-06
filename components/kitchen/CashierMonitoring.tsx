"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Bike,
  UserCheck,
  ShieldAlert,
  Banknote,
  CloudSun,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { AISummaryCards } from "./AISummaryCards";
import { LiveVideoCard } from "./LiveVideoCard";
import { AlertsView } from "./AlertsView";
import { alertEventsApi, energyDashboardApi, type AlertEvent } from "@/lib/api";
import { useRealtimeContext } from "@/components/providers/RealtimeProvider";

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const visitorChartConfig: ChartConfig = {
  visitors: { label: "Pengunjung", color: "hsl(258, 90%, 66%)" },
};

const trendChartConfig: ChartConfig = {
  visitors: { label: "Pengunjung", color: "hsl(258, 90%, 66%)" },
  ojol: { label: "OJOL", color: "hsl(142, 71%, 45%)" },
};

const weatherChartConfig: ChartConfig = {
  customers: { label: "Pelanggan", color: "hsl(217, 91%, 60%)" },
};

const outletChartConfig: ChartConfig = {
  customers: { label: "Customers", color: "hsl(258, 90%, 66%)" },
  fraud: { label: "Fraud", color: "hsl(0, 84%, 60%)" },
};

export function CashierMonitoring() {
  const realtime = useRealtimeContext();
  const [selectedOutlet, setSelectedOutlet] = useState("all");
  const [alertOutlets, setAlertOutlets] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  useEffect(() => {
    const loadOutlets = async () => {
      try {
        const res = await energyDashboardApi.getOutlets();
        if (res.success && res.data) {
          setAlertOutlets(
            res.data.map((o) => ({ id: o.scopeId, name: o.scope.name })),
          );
        }
      } catch {
        // ignore
      }
    };

    void loadOutlets();
  }, []);

  useEffect(() => {
    const loadAlerts = async () => {
      setAlertError(null);
      setLoadingAlerts(true);
      try {
        const res = await alertEventsApi.getAll({
          moduleType: "ai",
          limit: 100,
          ...(selectedOutlet !== "all" ? { scopeId: selectedOutlet } : {}),
        });
        if (res.success && res.data) {
          // Keep only AI-related modules (e.g., ai_camera, ai, etc)
          setAlerts(
            res.data.filter((a) =>
              String(a.moduleType).toLowerCase().includes("ai"),
            ),
          );
        } else {
          setAlerts([]);
          setAlertError(res.error || "Failed to load alerts");
        }
      } catch {
        setAlerts([]);
        setAlertError("Failed to load alerts");
      } finally {
        setLoadingAlerts(false);
      }
    };

    void loadAlerts();
  }, [selectedOutlet]);

  // Subscribe to real-time AI alerts
  useEffect(() => {
    const unsubscribe = realtime.subscribe("alert", (message) => {
      if (message.type === "alert") {
        const alertData = message.data as {
          id: string;
          deviceId: string;
          scopeId: string;
          moduleType: string;
          alertType: string;
          severity: string;
          title: string;
          description?: string;
          timestamp: string;
          device?: { name: string; scope?: { name: string; region?: string } };
        };

        // Only include AI-related alerts
        if (
          alertData.moduleType !== "ai" &&
          !String(alertData.moduleType).toLowerCase().includes("ai")
        ) {
          return;
        }

        // Filter by selected outlet if not "all"
        if (selectedOutlet !== "all" && alertData.scopeId !== selectedOutlet) {
          return;
        }

        // Map to AlertEvent format
        const newAlert: AlertEvent = {
          id: alertData.id,
          deviceId: alertData.deviceId,
          scopeId: alertData.scopeId,
          actionId: null,
          moduleType: alertData.moduleType,
          alertType: alertData.alertType,
          severity: alertData.severity,
          title: alertData.title,
          description: alertData.description ?? null,
          metadata: null,
          timestamp: alertData.timestamp,
          createdAt: new Date().toISOString(),
          device: undefined,
        };

        // Add new alert to the top of the list, keep only last 100
        setAlerts((prev) => [newAlert, ...prev.slice(0, 99)]);
      }
    });

    return unsubscribe;
  }, [realtime, selectedOutlet]);

  const aiAlerts = useMemo(() => {
    const outletName =
      selectedOutlet === "all"
        ? "All Outlets"
        : alertOutlets.find((o) => o.id === selectedOutlet)?.name || "";

    return alerts.map((a) => ({
      id: a.id,
      module: "Cashier",
      outlet: a.device?.scope?.name || outletName || "",
      deviceName: a.device?.name || a.deviceId,
      deviceId: a.deviceId,
      area: a.device?.locationName || "",
      alertType: a.alertType,
      severity: a.severity,
      timestamp: a.timestamp,
      description: a.description || a.title || "",
      aiInsight: [],
      timeline: [],
      images: [],
      location: {
        name: a.device?.locationName || outletName || "",
        lat: 0,
        lng: 0,
        area: a.device?.locationName || "",
      },
    }));
  }, [alerts, selectedOutlet, alertOutlets]);

  const summary = useMemo(() => {
    const today = new Date().toDateString();
    const filtered = aiAlerts;
    const totalDevices = new Set(filtered.map((a) => a.deviceId)).size;
    const totalAlertsToday = filtered.filter(
      (a) => new Date(a.timestamp).toDateString() === today,
    ).length;
    const criticalAlerts = filtered.filter(
      (a) => a.severity.toLowerCase() === "critical",
    ).length;
    const suspiciousAlerts = filtered.filter(
      (a) => a.severity.toLowerCase() === "suspicious",
    ).length;
    const healthAlerts = filtered.filter(
      (a) => a.severity.toLowerCase() === "health",
    ).length;

    return {
      totalDevices,
      activeDevices: totalDevices,
      totalAlertsToday,
      criticalAlerts,
      suspiciousAlerts,
      healthAlerts,
    };
  }, [aiAlerts]);

  const kpiCards = [
    {
      label: "Total Devices",
      value: summary.totalDevices,
      icon: Users,
      color: "text-violet-500",
      bg: "from-violet-500/10 to-violet-500/5",
    },
    {
      label: "Total Alerts",
      value: alerts.length,
      icon: ShieldAlert,
      color: "text-orange-500",
      bg: "from-orange-500/10 to-orange-500/5",
    },
    {
      label: "Critical",
      value: summary.criticalAlerts,
      icon: ShieldAlert,
      color: "text-red-500",
      bg: "from-red-500/10 to-red-500/5",
    },
    {
      label: "Suspicious",
      value: summary.suspiciousAlerts,
      icon: ShieldAlert,
      color: "text-yellow-500",
      bg: "from-yellow-500/10 to-yellow-500/5",
    },
  ];

  const hourlyData = useMemo(() => {
    // Generate hourly distribution from alert timestamps
    const hourCounts: Record<string, number> = {};
    for (let i = 0; i < 24; i++) {
      hourCounts[String(i).padStart(2, "0")] = 0;
    }

    // Filter alerts by selected outlet
    const filteredAlerts =
      selectedOutlet === "all"
        ? aiAlerts
        : aiAlerts.filter(
            (a) =>
              a.deviceId.includes(selectedOutlet) ||
              a.outlet.includes(
                alertOutlets.find((o) => o.id === selectedOutlet)?.name || "",
              ),
          );

    // Count alerts by hour
    filteredAlerts.forEach((alert) => {
      const hour = new Date(alert.timestamp).getHours();
      const hourStr = String(hour).padStart(2, "0");
      hourCounts[hourStr]++;
    });

    // Return only business hours (6-22)
    return Array.from({ length: 16 }, (_, i) => {
      const hour = i + 6;
      const hourStr = String(hour).padStart(2, "0");
      return {
        hour: hourStr,
        alerts: hourCounts[hourStr],
      };
    });
  }, [aiAlerts, selectedOutlet, alertOutlets]);

  const overviewContent = (
    <motion.div
      className="flex flex-col gap-1.5 h-full"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
      }}
      initial="hidden"
      animate="visible"
    >
      <AISummaryCards summary={summary} />

      {/* Outlet Selector */}
      <motion.div variants={itemVariants} className="flex items-center gap-2">
        <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
          <SelectTrigger className="w-[200px] h-7 text-[9px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[9px]">
              All Outlets
            </SelectItem>
            {alertOutlets.map((o) => (
              <SelectItem key={o.id} value={o.id} className="text-[9px]">
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Live Video — only when specific outlet selected */}
      {selectedOutlet !== "all" && (
        <LiveVideoCard
          src="/cashir.mp4"
          outletName={
            alertOutlets.find((o) => o.id === selectedOutlet)?.name || ""
          }
        />
      )}

      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-4 gap-1">
        {kpiCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card
              key={i}
              className={`border-0 shadow-sm bg-gradient-to-br ${stat.bg}`}
            >
              <CardContent className="p-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-6 w-6 rounded-md bg-background/80 flex items-center justify-center">
                    <Icon className={`h-3 w-3 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-[8px] text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="text-sm font-bold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Charts Row 1 — 2 columns */}
      <div className="grid grid-cols-2 gap-1.5">
        {/* Hourly Visitors */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 pt-1.5 pb-0">
              <CardTitle className="text-[10px] font-semibold">
                Alerts per Hour
              </CardTitle>
            </CardHeader>
            <CardContent className="px-1 pb-1 pt-1">
              <ChartContainer
                config={visitorChartConfig}
                className="h-[130px] w-full"
              >
                <BarChart
                  data={hourlyData}
                  margin={{ top: 5, right: 5, bottom: 0, left: -15 }}
                >
                  <defs>
                    <linearGradient
                      id="fillVisitors"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="hsl(258, 90%, 66%)"
                        stopOpacity={0.9}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(258, 90%, 66%)"
                        stopOpacity={0.3}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 8 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 8 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="alerts"
                    fill="url(#fillVisitors)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={20}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Fraud Timeline Section */}
      <div className="grid grid-cols-1 gap-1.5">
        {/* Fraud Timeline */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 pt-1.5 pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5 text-red-500" />
                  <CardTitle className="text-[10px] font-semibold">
                    Fraud Kasir Timeline
                  </CardTitle>
                </div>
                <Badge
                  variant="outline"
                  className="text-[7px] px-1 py-0 h-3.5 border-red-500/30 text-red-500"
                >
                  {aiAlerts.length} events
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-1.5 pt-1">
              <ScrollArea className="h-[110px]">
                <div className="space-y-0.5">
                  {aiAlerts.map((alert, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 text-[8px] p-1 rounded border bg-red-500/5 border-red-500/20"
                    >
                      <ShieldAlert className="h-2.5 w-2.5 text-red-500 flex-shrink-0" />
                      <span className="text-muted-foreground w-12">
                        {new Date(alert.timestamp).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="flex-1 truncate">{alert.alertType}</span>
                      <Badge
                        variant="outline"
                        className={`text-[6px] px-0.5 py-0 h-3 ${
                          alert.severity === "Critical"
                            ? "border-red-500/30 text-red-500"
                            : alert.severity === "Warning"
                              ? "border-amber-500/30 text-amber-500"
                              : "border-blue-500/30 text-blue-500"
                        }`}
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );

  return (
    <Tabs defaultValue="alerts" className="h-full flex flex-col">
      <TabsList className="w-fit h-7 mb-1">
        <TabsTrigger value="alerts" className="text-[9px] h-5 px-3">
          Alerts
        </TabsTrigger>
        <TabsTrigger value="overview" className="text-[9px] h-5 px-3">
          Overview
        </TabsTrigger>
      </TabsList>
      <TabsContent value="alerts" className="flex-1 mt-0">
        <AlertsView
          alerts={aiAlerts}
          summary={summary}
          title="Cashier Alerts"
        />
        {loadingAlerts && (
          <div className="p-4 text-xs text-muted-foreground">
            Loading alerts...
          </div>
        )}
        {alertError && (
          <div className="p-4 text-xs text-destructive">{alertError}</div>
        )}
      </TabsContent>
      <TabsContent value="overview" className="flex-1 mt-0">
        {overviewContent}
      </TabsContent>
    </Tabs>
  );
}
