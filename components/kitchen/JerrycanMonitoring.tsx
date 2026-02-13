"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Package,
  Shirt,
  ShieldAlert,
  AlertTriangle,
  Minus,
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
  jerrycanDeviceSummary,
  jerrycanAlerts,
  jerrycanOverviewData,
  outlets,
} from "@/lib/ai-alerts";

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const movementChartConfig: ChartConfig = {
  movements: { label: "Pergerakan", color: "hsl(239, 84%, 67%)" },
};

const trendChartConfig: ChartConfig = {
  movements: { label: "Pergerakan", color: "hsl(239, 84%, 67%)" },
  fraud: { label: "Fraud", color: "hsl(0, 84%, 60%)" },
  returned: { label: "Dikembalikan", color: "hsl(142, 71%, 45%)" },
};

const inventoryChartConfig: ChartConfig = {
  available: { label: "Tersedia", color: "hsl(239, 84%, 67%)" },
  removed: { label: "Diambil", color: "hsl(0, 84%, 60%)" },
};

const typeChartConfig: ChartConfig = {
  count: { label: "Jumlah", color: "hsl(258, 90%, 66%)" },
};

const outletChartConfig: ChartConfig = {
  total: { label: "Total", color: "hsl(239, 84%, 67%)" },
  removed: { label: "Removed", color: "hsl(45, 93%, 47%)" },
  fraud: { label: "Fraud", color: "hsl(0, 84%, 60%)" },
};

export function JerrycanMonitoring() {
  const [selectedOutlet, setSelectedOutlet] = useState("all");
  const d = jerrycanOverviewData;

  const outletData =
    selectedOutlet === "all"
      ? null
      : d.outletBreakdown.find((o) => o.outletId === selectedOutlet);

  const kpiCards = [
    {
      label: "Total Jerrycan",
      value: outletData ? outletData.total : d.totalJerrycan,
      icon: Package,
      color: "text-indigo-500",
      bg: "from-indigo-500/10 to-indigo-500/5",
    },
    {
      label: "Removed Count",
      value: outletData ? outletData.removed : d.removedCount,
      icon: Minus,
      color: "text-amber-500",
      bg: "from-amber-500/10 to-amber-500/5",
    },
    {
      label: "Fraud Events",
      value: outletData ? outletData.fraud : d.fraudEvents,
      icon: ShieldAlert,
      color: "text-red-500",
      bg: "from-red-500/10 to-red-500/5",
    },
    {
      label: "Person + Apron",
      value: outletData ? Math.round(d.personWithApron / 5) : d.personWithApron,
      icon: Shirt,
      color: "text-green-500",
      bg: "from-green-500/10 to-green-500/5",
    },
  ];

  const hourlyData = d.hourlyMovements.slice(6, 18).map((v, i) => ({
    hour: String(i + 6).padStart(2, "0"),
    movements: selectedOutlet === "all" ? v : Math.max(0, Math.round(v / 5)),
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
      <AISummaryCards summary={jerrycanDeviceSummary} />

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
          src="/jerrycan.mp4"
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

      {/* Charts Row 1 */}
      <div className="grid grid-cols-2 gap-1.5">
        {/* Hourly Movements */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 pt-1.5 pb-0">
              <CardTitle className="text-[10px] font-semibold">
                Pergerakan per Jam
              </CardTitle>
            </CardHeader>
            <CardContent className="px-1 pb-1 pt-1">
              <ChartContainer
                config={movementChartConfig}
                className="h-[130px] w-full"
              >
                <BarChart
                  data={hourlyData}
                  margin={{ top: 5, right: 5, bottom: 0, left: -15 }}
                >
                  <defs>
                    <linearGradient
                      id="fillMovements"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="hsl(239, 84%, 67%)"
                        stopOpacity={0.9}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(239, 84%, 67%)"
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
                    dataKey="movements"
                    fill="url(#fillMovements)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={20}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

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
                    dataKey="movements"
                    stroke="hsl(239, 84%, 67%)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="fraud"
                    stroke="hsl(0, 84%, 60%)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="returned"
                    stroke="hsl(142, 71%, 45%)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-2 gap-1.5">
        {/* Inventory History */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 pt-1.5 pb-0">
              <CardTitle className="text-[10px] font-semibold">
                Inventori Harian
              </CardTitle>
            </CardHeader>
            <CardContent className="px-1 pb-1 pt-1">
              <ChartContainer
                config={inventoryChartConfig}
                className="h-[130px] w-full"
              >
                <BarChart
                  data={d.inventoryHistory}
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
                    dataKey="available"
                    fill="hsl(239, 84%, 67%)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={16}
                  />
                  <Bar
                    dataKey="removed"
                    fill="hsl(0, 84%, 60%)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={16}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Movement by Type */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 pt-1.5 pb-0">
              <CardTitle className="text-[10px] font-semibold">
                Jenis Pergerakan
              </CardTitle>
            </CardHeader>
            <CardContent className="px-1 pb-1 pt-1">
              <ChartContainer
                config={typeChartConfig}
                className="h-[130px] w-full"
              >
                <BarChart
                  data={d.movementByType}
                  layout="vertical"
                  margin={{ top: 5, right: 10, bottom: 0, left: 55 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 8 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="type"
                    tick={{ fontSize: 7 }}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="count"
                    fill="hsl(258, 90%, 66%)"
                    radius={[0, 3, 3, 0]}
                    maxBarSize={14}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 3 — Outlet Comparison + Fraud Events */}
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
                className="h-[120px] w-full"
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
                    dataKey="total"
                    fill="hsl(239, 84%, 67%)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={18}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Fraud Events */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 pt-1.5 pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                  <CardTitle className="text-[10px] font-semibold">
                    Fraud Jerrycan
                  </CardTitle>
                </div>
                <Badge
                  variant="outline"
                  className="text-[7px] px-1 py-0 h-3.5 border-red-500/30 text-red-500"
                >
                  {d.fraudEvents} events
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-1.5 pt-1">
              <ScrollArea className="h-[100px]">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[8px] p-1 rounded border bg-red-500/5 border-red-500/20">
                    <ShieldAlert className="h-2.5 w-2.5 text-red-500 flex-shrink-0" />
                    <span className="text-muted-foreground w-8">10:30</span>
                    <span className="flex-1 truncate">
                      2 jerrycan hilang tanpa record
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[8px] p-1 rounded border bg-red-500/5 border-red-500/20">
                    <ShieldAlert className="h-2.5 w-2.5 text-red-500 flex-shrink-0" />
                    <span className="text-muted-foreground w-8">12:05</span>
                    <span className="flex-1 truncate">
                      Unauthorized person took jerrycan
                    </span>
                  </div>
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
          alerts={jerrycanAlerts}
          summary={jerrycanDeviceSummary}
          title="Jerrycan Alerts"
        />
      </TabsContent>
      <TabsContent value="overview" className="flex-1 mt-0">
        {overviewContent}
      </TabsContent>
    </Tabs>
  );
}
