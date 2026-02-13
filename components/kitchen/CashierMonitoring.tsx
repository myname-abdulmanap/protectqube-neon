"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Bike,
  UserCheck,
  ShieldAlert,
  Banknote,
  TrendingUp,
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
import {
  cashierDeviceSummary,
  cashierAlerts,
  cashierOverviewData,
  outlets,
} from "@/lib/ai-alerts";

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

const upsellingChartConfig: ChartConfig = {
  detected: { label: "Detected", color: "hsl(142, 71%, 45%)" },
  missed: { label: "Missed", color: "hsl(0, 84%, 60%)" },
};

const revenueChartConfig: ChartConfig = {
  revenue: { label: "Revenue (Rp)", color: "hsl(217, 91%, 60%)" },
};

const outletChartConfig: ChartConfig = {
  customers: { label: "Customers", color: "hsl(258, 90%, 66%)" },
  fraud: { label: "Fraud", color: "hsl(0, 84%, 60%)" },
};

export function CashierMonitoring() {
  const [selectedOutlet, setSelectedOutlet] = useState("all");
  const d = cashierOverviewData;

  const outletData =
    selectedOutlet === "all"
      ? null
      : d.outletBreakdown.find((o) => o.outletId === selectedOutlet);

  const kpiCards = [
    {
      label: "Total Pelanggan",
      value: outletData ? outletData.customers : d.totalCustomers,
      icon: Users,
      color: "text-violet-500",
      bg: "from-violet-500/10 to-violet-500/5",
    },
    {
      label: "Driver OJOL",
      value: outletData ? Math.round(d.ojolDrivers / 5) : d.ojolDrivers,
      icon: Bike,
      color: "text-green-500",
      bg: "from-green-500/10 to-green-500/5",
    },
    {
      label: "Pelayan Aktif",
      value: outletData
        ? Math.max(1, Math.round(d.totalServers / 2))
        : d.totalServers,
      icon: UserCheck,
      color: "text-blue-500",
      bg: "from-blue-500/10 to-blue-500/5",
    },
    {
      label: "Suspected Fraud",
      value: outletData ? outletData.fraud : d.suspectedFraud,
      icon: ShieldAlert,
      color: "text-red-500",
      bg: "from-red-500/10 to-red-500/5",
    },
  ];

  const hourlyData = d.hourlyVisitors.slice(6, 22).map((v, i) => ({
    hour: String(i + 6).padStart(2, "0"),
    visitors: selectedOutlet === "all" ? v : Math.round(v / 5),
  }));

  const revenueData = d.hourlyRevenue.map((r) => ({
    ...r,
    revenue: selectedOutlet === "all" ? r.revenue : Math.round(r.revenue / 5),
  }));

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
      <AISummaryCards summary={cashierDeviceSummary} />

      {/* Outlet Selector */}
      <motion.div variants={itemVariants} className="flex items-center gap-2">
        <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
          <SelectTrigger className="w-[200px] h-7 text-[9px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {outlets.map((o) => (
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
          outletName={outlets.find((o) => o.id === selectedOutlet)?.name || ""}
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
                Pengunjung per Jam
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
                    dataKey="visitors"
                    fill="url(#fillVisitors)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={20}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Revenue per Jam */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 pt-1.5 pb-0">
              <CardTitle className="text-[10px] font-semibold">
                Revenue per Jam (Rp 000)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-1 pb-1 pt-1">
              <ChartContainer
                config={revenueChartConfig}
                className="h-[130px] w-full"
              >
                <BarChart
                  data={revenueData}
                  margin={{ top: 5, right: 5, bottom: 0, left: -15 }}
                >
                  <defs>
                    <linearGradient
                      id="fillRevenue"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="hsl(217, 91%, 60%)"
                        stopOpacity={0.9}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(217, 91%, 60%)"
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
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="revenue"
                    fill="url(#fillRevenue)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={20}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 2 — 2 columns */}
      <div className="grid grid-cols-2 gap-1.5">
        {/* Daily Trend */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 pt-1.5 pb-0">
              <CardTitle className="text-[10px] font-semibold">
                Tren Harian (7 Hari)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-1 pb-1 pt-1">
              <ChartContainer
                config={trendChartConfig}
                className="h-[130px] w-full"
              >
                <LineChart
                  data={d.dailyTrend}
                  margin={{ top: 5, right: 5, bottom: 0, left: -15 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="day"
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
                  <Line
                    type="monotone"
                    dataKey="visitors"
                    stroke="hsl(258, 90%, 66%)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ojol"
                    stroke="hsl(142, 71%, 45%)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Upselling Weekly */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 pt-1.5 pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[10px] font-semibold">
                  Upselling Mingguan
                </CardTitle>
                <Badge
                  variant="outline"
                  className="text-[7px] px-1 py-0 h-3.5 border-green-500/30 text-green-500"
                >
                  {Math.round(
                    (d.upsellingDetected /
                      (d.upsellingDetected + d.upsellingMissed)) *
                      100,
                  )}
                  % rate
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-1 pb-1 pt-1">
              <ChartContainer
                config={upsellingChartConfig}
                className="h-[130px] w-full"
              >
                <BarChart
                  data={d.weeklyUpselling}
                  margin={{ top: 5, right: 5, bottom: 0, left: -15 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="day"
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
                    dataKey="detected"
                    fill="hsl(142, 71%, 45%)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={16}
                  />
                  <Bar
                    dataKey="missed"
                    fill="hsl(0, 84%, 60%)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={16}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 3 — 2 columns */}
      <div className="grid grid-cols-2 gap-1.5">
        {/* Outlet Comparison */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 pt-1.5 pb-0">
              <CardTitle className="text-[10px] font-semibold">
                Perbandingan Outlet
              </CardTitle>
            </CardHeader>
            <CardContent className="px-1 pb-1 pt-1">
              <ChartContainer
                config={outletChartConfig}
                className="h-[130px] w-full"
              >
                <BarChart
                  data={d.outletBreakdown}
                  margin={{ top: 5, right: 5, bottom: 0, left: -15 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="outlet"
                    tick={{ fontSize: 7 }}
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
                    dataKey="customers"
                    fill="hsl(258, 90%, 66%)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={20}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

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
                  {d.fraudTimeline.length} events
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-1.5 pt-1">
              <ScrollArea className="h-[110px]">
                <div className="space-y-0.5">
                  {d.fraudTimeline.map((e, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 text-[8px] p-1 rounded border bg-red-500/5 border-red-500/20"
                    >
                      <ShieldAlert className="h-2.5 w-2.5 text-red-500 flex-shrink-0" />
                      <span className="text-muted-foreground w-8">
                        {e.time}
                      </span>
                      <span className="flex-1 truncate">{e.description}</span>
                      <Badge
                        variant="outline"
                        className={`text-[6px] px-0.5 py-0 h-3 ${e.severity === "Critical" ? "border-red-500/30 text-red-500" : e.severity === "Warning" ? "border-amber-500/30 text-amber-500" : "border-blue-500/30 text-blue-500"}`}
                      >
                        {e.severity}
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
          alerts={cashierAlerts}
          summary={cashierDeviceSummary}
          title="Cashier Alerts"
        />
      </TabsContent>
      <TabsContent value="overview" className="flex-1 mt-0">
        {overviewContent}
      </TabsContent>
    </Tabs>
  );
}
