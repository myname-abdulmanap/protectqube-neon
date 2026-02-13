"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Droplets, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  oilDeviceSummary,
  oilAlerts,
  oilOverviewData,
  outlets,
} from "@/lib/ai-alerts";

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const qualityChartConfig: ChartConfig = {
  fresh: { label: "Fresh", color: "hsl(142, 71%, 45%)" },
  dirty: { label: "Dirty", color: "hsl(271, 91%, 65%)" },
  emptyFryer: { label: "Empty Fryer", color: "hsl(0, 84%, 60%)" },
};

const changesChartConfig: ChartConfig = {
  scheduled: { label: "Terjadwal", color: "hsl(217, 91%, 60%)" },
  unscheduled: { label: "Tidak Terjadwal", color: "hsl(45, 93%, 47%)" },
};

const tempChartConfig: ChartConfig = {
  fryer1: { label: "Fryer 1", color: "hsl(217, 91%, 60%)" },
  fryer2: { label: "Fryer 2", color: "hsl(25, 95%, 53%)" },
  fryer3: { label: "Fryer 3", color: "hsl(0, 84%, 60%)" },
};

const outletChartConfig: ChartConfig = {
  alerts: { label: "Alerts", color: "hsl(0, 84%, 60%)" },
};

export function OilMonitoring() {
  const [selectedOutlet, setSelectedOutlet] = useState("all");
  const d = oilOverviewData;

  const outletData =
    selectedOutlet === "all"
      ? null
      : d.outletBreakdown.find((o) => o.outletId === selectedOutlet);

  const kpiCards = [
    {
      label: "Fresh Oil",
      value: outletData
        ? Math.max(0, Math.round(d.freshOilCount / 5))
        : d.freshOilCount,
      icon: CheckCircle2,
      color: "text-green-500",
      bg: "from-green-500/10 to-green-500/5",
    },
    {
      label: "Dirty Oil",
      value: outletData
        ? Math.max(0, Math.round(d.dirtyOilCount / 5))
        : d.dirtyOilCount,
      icon: Droplets,
      color: "text-purple-500",
      bg: "from-purple-500/10 to-purple-500/5",
    },
    {
      label: "Empty Fryer",
      value: outletData
        ? Math.max(0, Math.round(d.emptyFryerCount / 5))
        : d.emptyFryerCount,
      icon: AlertTriangle,
      color: "text-red-500",
      bg: "from-red-500/10 to-red-500/5",
    },
  ];

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
      <AISummaryCards summary={oilDeviceSummary} />

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
          src="/oil.mp4"
          outletName={outlets.find((o) => o.id === selectedOutlet)?.name || ""}
        />
      )}

      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-1">
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
        {/* Temperature History */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 pt-1.5 pb-0">
              <CardTitle className="text-[10px] font-semibold">
                Suhu Fryer (°C)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-1 pb-1 pt-1">
              <ChartContainer
                config={tempChartConfig}
                className="h-[130px] w-full"
              >
                <LineChart
                  data={d.tempHistory}
                  margin={{ top: 5, right: 5, bottom: 0, left: -15 }}
                >
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
                    domain={[160, 185]}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="fryer1"
                    stroke="hsl(217, 91%, 60%)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="fryer2"
                    stroke="hsl(25, 95%, 53%)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="fryer3"
                    stroke="hsl(0, 84%, 60%)"
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
        {/* Daily Quality */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 pt-1.5 pb-0">
              <CardTitle className="text-[10px] font-semibold">
                Kualitas Minyak 7 Hari
              </CardTitle>
            </CardHeader>
            <CardContent className="px-1 pb-1 pt-1">
              <ChartContainer
                config={qualityChartConfig}
                className="h-[130px] w-full"
              >
                <BarChart
                  data={d.dailyQuality}
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
                    dataKey="fresh"
                    stackId="q"
                    fill="hsl(142, 71%, 45%)"
                    radius={[0, 0, 0, 0]}
                    maxBarSize={20}
                  />
                  <Bar
                    dataKey="dirty"
                    stackId="q"
                    fill="hsl(271, 91%, 65%)"
                    radius={[0, 0, 0, 0]}
                    maxBarSize={20}
                  />
                  <Bar
                    dataKey="emptyFryer"
                    stackId="q"
                    fill="hsl(0, 84%, 60%)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={20}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Oil Changes */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 pt-1.5 pb-0">
              <CardTitle className="text-[10px] font-semibold">
                Penggantian Minyak
              </CardTitle>
            </CardHeader>
            <CardContent className="px-1 pb-1 pt-1">
              <ChartContainer
                config={changesChartConfig}
                className="h-[130px] w-full"
              >
                <BarChart
                  data={d.oilChanges}
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
                    dataKey="scheduled"
                    fill="hsl(217, 91%, 60%)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={16}
                  />
                  <Bar
                    dataKey="unscheduled"
                    fill="hsl(45, 93%, 47%)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={16}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 3 — Outlet Comparison */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm">
          <CardHeader className="px-2 pt-1.5 pb-0">
            <CardTitle className="text-[10px] font-semibold">
              Perbandingan Outlet — Alerts
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
                <defs>
                  <linearGradient id="fillAlerts" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="hsl(0, 84%, 60%)"
                      stopOpacity={0.9}
                    />
                    <stop
                      offset="100%"
                      stopColor="hsl(0, 84%, 60%)"
                      stopOpacity={0.3}
                    />
                  </linearGradient>
                </defs>
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
                  dataKey="alerts"
                  fill="url(#fillAlerts)"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </motion.div>
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
          alerts={oilAlerts}
          summary={oilDeviceSummary}
          title="Oil / Fryer Alerts"
        />
      </TabsContent>
      <TabsContent value="overview" className="flex-1 mt-0">
        {overviewContent}
      </TabsContent>
    </Tabs>
  );
}
