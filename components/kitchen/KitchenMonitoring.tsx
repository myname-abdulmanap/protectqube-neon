"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Hand, Shirt, HardHat, Droplets, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  kitchenDeviceSummary,
  kitchenAlerts,
  kitchenOverviewData,
  outlets,
} from "@/lib/ai-alerts";

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const hourlyChartConfig: ChartConfig = {
  violations: { label: "Pelanggaran", color: "hsl(45, 93%, 47%)" },
};

const trendChartConfig: ChartConfig = {
  glove: { label: "Sarung Tangan", color: "hsl(45, 93%, 47%)" },
  apron: { label: "Apron", color: "hsl(25, 95%, 53%)" },
  headcover: { label: "Penutup Kepala", color: "hsl(0, 84%, 60%)" },
};

const complianceChartConfig: ChartConfig = {
  rate: { label: "Compliance %", color: "hsl(142, 71%, 45%)" },
};

const outletChartConfig: ChartConfig = {
  violations: { label: "Pelanggaran", color: "hsl(45, 93%, 47%)" },
  compliance: { label: "Compliance %", color: "hsl(142, 71%, 45%)" },
};

const typeChartConfig: ChartConfig = {
  count: { label: "Jumlah", color: "hsl(258, 90%, 66%)" },
};

export function KitchenMonitoring() {
  const [selectedOutlet, setSelectedOutlet] = useState("all");
  const d = kitchenOverviewData;

  const outletData =
    selectedOutlet === "all"
      ? null
      : d.outletBreakdown.find((o) => o.outletId === selectedOutlet);

  const kpiCards = [
    {
      label: "Pegawai Aktif",
      value: outletData
        ? Math.max(1, Math.round(d.activeWorkers / 5))
        : d.activeWorkers,
      icon: Users,
      color: "text-blue-500",
      bg: "from-blue-500/10 to-blue-500/5",
    },
    {
      label: "Tanpa Sarung Tangan",
      value: outletData ? Math.round(d.gloveViolations / 5) : d.gloveViolations,
      icon: Hand,
      color: "text-amber-500",
      bg: "from-amber-500/10 to-amber-500/5",
    },
    {
      label: "Tanpa Apron",
      value: outletData ? Math.round(d.apronViolations / 5) : d.apronViolations,
      icon: Shirt,
      color: "text-orange-500",
      bg: "from-orange-500/10 to-orange-500/5",
    },
    {
      label: "Tanpa Penutup Kepala",
      value: outletData
        ? Math.round(d.headcoverViolations / 5)
        : d.headcoverViolations,
      icon: HardHat,
      color: "text-red-500",
      bg: "from-red-500/10 to-red-500/5",
    },
    {
      label: "Dirty Oil Found",
      value: outletData
        ? Math.round(d.dirtyOilDetected / 5)
        : d.dirtyOilDetected,
      icon: Droplets,
      color: "text-purple-500",
      bg: "from-purple-500/10 to-purple-500/5",
    },
  ];

  const hourlyData = d.hourlyViolations.slice(6, 21).map((v, i) => ({
    hour: String(i + 6).padStart(2, "0"),
    violations: selectedOutlet === "all" ? v : Math.max(0, Math.round(v / 5)),
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
      <AISummaryCards summary={kitchenDeviceSummary} />

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
        <Badge
          variant="outline"
          className="text-[7px] px-1.5 py-0 h-4 border-amber-500/30 text-amber-500"
        >
          {outletData ? outletData.violations : d.totalAttributeViolations}{" "}
          pelanggaran total
        </Badge>
      </motion.div>

      {/* Live Video — only when specific outlet selected */}
      {selectedOutlet !== "all" && (
        <LiveVideoCard
          src="/kitchen.mp4"
          outletName={outlets.find((o) => o.id === selectedOutlet)?.name || ""}
        />
      )}

      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-5 gap-1">
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
        {/* Hourly Violations */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 pt-1.5 pb-0">
              <CardTitle className="text-[10px] font-semibold">
                Pelanggaran per Jam (06-20)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-1 pb-1 pt-1">
              <ChartContainer
                config={hourlyChartConfig}
                className="h-[130px] w-full"
              >
                <BarChart
                  data={hourlyData}
                  margin={{ top: 5, right: 5, bottom: 0, left: -15 }}
                >
                  <defs>
                    <linearGradient
                      id="fillViolations"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="hsl(45, 93%, 47%)"
                        stopOpacity={0.9}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(45, 93%, 47%)"
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
                    dataKey="violations"
                    fill="url(#fillViolations)"
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
                Tren Pelanggaran 7 Hari
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
                    dataKey="glove"
                    stroke="hsl(45, 93%, 47%)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="apron"
                    stroke="hsl(25, 95%, 53%)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="headcover"
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
        {/* Compliance Rate */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 pt-1.5 pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[10px] font-semibold">
                  Compliance Rate (%)
                </CardTitle>
                <Badge
                  variant="outline"
                  className="text-[7px] px-1 py-0 h-3.5 border-green-500/30 text-green-500"
                >
                  {outletData ? `${outletData.compliance}%` : "avg 84%"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-1 pb-1 pt-1">
              <ChartContainer
                config={complianceChartConfig}
                className="h-[130px] w-full"
              >
                <LineChart
                  data={d.complianceRate}
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
                    domain={[60, 100]}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="hsl(142, 71%, 45%)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Violations by Type */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 pt-1.5 pb-0">
              <CardTitle className="text-[10px] font-semibold">
                Pelanggaran per Jenis
              </CardTitle>
            </CardHeader>
            <CardContent className="px-1 pb-1 pt-1">
              <ChartContainer
                config={typeChartConfig}
                className="h-[130px] w-full"
              >
                <BarChart
                  data={d.violationsByType}
                  layout="vertical"
                  margin={{ top: 5, right: 10, bottom: 0, left: 50 }}
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
                  <Bar dataKey="count" radius={[0, 3, 3, 0]} maxBarSize={14}>
                    {d.violationsByType.map((entry, i) => (
                      <rect key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 3 — Outlet Comparison full width */}
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
                <defs>
                  <linearGradient
                    id="fillOutletViol"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="hsl(45, 93%, 47%)"
                      stopOpacity={0.9}
                    />
                    <stop
                      offset="100%"
                      stopColor="hsl(45, 93%, 47%)"
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
                  dataKey="violations"
                  fill="url(#fillOutletViol)"
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
          alerts={kitchenAlerts}
          summary={kitchenDeviceSummary}
          title="Kitchen Alerts"
        />
      </TabsContent>
      <TabsContent value="overview" className="flex-1 mt-0">
        {overviewContent}
      </TabsContent>
    </Tabs>
  );
}
