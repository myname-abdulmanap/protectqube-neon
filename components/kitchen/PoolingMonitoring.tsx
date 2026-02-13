"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Droplets,
  ShieldAlert,
  CircleAlert,
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
  poolingDeviceSummary,
  poolingAlerts,
  poolingOverviewData,
  outlets,
} from "@/lib/ai-alerts";

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const volumeChartConfig: ChartConfig = {
  volume: { label: "Volume (L)", color: "hsl(271, 91%, 65%)" },
  activities: { label: "Aktivitas", color: "hsl(217, 91%, 60%)" },
};

const hourlyChartConfig: ChartConfig = {
  pooling: { label: "Pooling", color: "hsl(271, 91%, 65%)" },
  pickup: { label: "Pickup", color: "hsl(142, 71%, 45%)" },
};

const drumChartConfig: ChartConfig = {
  drum1: { label: "Drum #1", color: "hsl(45, 93%, 47%)" },
  drum2: { label: "Drum #2", color: "hsl(142, 71%, 45%)" },
  drum3: { label: "Drum #3", color: "hsl(25, 95%, 53%)" },
  drum4: { label: "Drum #4", color: "hsl(217, 91%, 60%)" },
};

const safetyChartConfig: ChartConfig = {
  gloves: { label: "Sarung Tangan", color: "hsl(142, 71%, 45%)" },
  apron: { label: "Apron", color: "hsl(217, 91%, 60%)" },
  filter: { label: "Pre-Filter", color: "hsl(45, 93%, 47%)" },
};

const outletChartConfig: ChartConfig = {
  volume: { label: "Volume (L)", color: "hsl(271, 91%, 65%)" },
};

export function PoolingMonitoring() {
  const [selectedOutlet, setSelectedOutlet] = useState("all");
  const d = poolingOverviewData;

  const outletData = selectedOutlet === "all"
    ? null
    : d.outletBreakdown.find((o) => o.outletId === selectedOutlet);

  const kpiCards = [
    {
      label: "Total Pooling",
      value: outletData ? Math.round(d.totalPoolingActivity / 5) : d.totalPoolingActivity,
      icon: Droplets,
      color: "text-violet-500",
      bg: "from-violet-500/10 to-violet-500/5",
    },
    {
      label: "Drum Penuh",
      value: outletData ? outletData.drums : d.drumFullCount,
      icon: CircleAlert,
      color: "text-amber-500",
      bg: "from-amber-500/10 to-amber-500/5",
    },
    {
      label: "Dirty Oil Pooling",
      value: outletData ? outletData.alerts : d.dirtyOilPooling,
      icon: ShieldAlert,
      color: "text-red-500",
      bg: "from-red-500/10 to-red-500/5",
    },
    {
      label: "Volume (L)",
      value: outletData ? outletData.volume : d.outletBreakdown.reduce((a, o) => a + o.volume, 0),
      icon: Droplets,
      color: "text-blue-500",
      bg: "from-blue-500/10 to-blue-500/5",
    },
  ];

  const overviewContent = (
    <motion.div
      className="flex flex-col gap-1.5 h-full"
      variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
      initial="hidden"
      animate="visible"
    >
      <AISummaryCards summary={poolingDeviceSummary} />

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
          src="/pooling.mp4"
          outletName={outlets.find(o => o.id === selectedOutlet)?.name || ""}
        />
      )}

      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-4 gap-1">
        {kpiCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className={`border-0 shadow-sm bg-gradient-to-br ${stat.bg}`}>
              <CardContent className="p-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-6 w-6 rounded-md bg-background/80 flex items-center justify-center">
                    <Icon className={`h-3 w-3 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-[8px] text-muted-foreground">{stat.label}</p>
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
        {/* Daily Volume */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 pt-1.5 pb-0">
              <CardTitle className="text-[10px] font-semibold">Volume Pooling Harian (L)</CardTitle>
            </CardHeader>
            <CardContent className="px-1 pb-1 pt-1">
              <ChartContainer config={volumeChartConfig} className="h-[130px] w-full">
                <BarChart data={d.dailyVolume} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
                  <defs>
                    <linearGradient id="fillVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(271, 91%, 65%)" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="hsl(271, 91%, 65%)" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 8 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 8 }} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="volume" fill="url(#fillVolume)" radius={[3, 3, 0, 0]} maxBarSize={20} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Hourly Activity */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 pt-1.5 pb-0">
              <CardTitle className="text-[10px] font-semibold">Aktivitas per Jam</CardTitle>
            </CardHeader>
            <CardContent className="px-1 pb-1 pt-1">
              <ChartContainer config={hourlyChartConfig} className="h-[130px] w-full">
                <BarChart data={d.hourlyActivity} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 8 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 8 }} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="pooling" fill="hsl(271, 91%, 65%)" radius={[3, 3, 0, 0]} maxBarSize={16} />
                  <Bar dataKey="pickup" fill="hsl(142, 71%, 45%)" radius={[3, 3, 0, 0]} maxBarSize={16} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-2 gap-1.5">
        {/* Drum Fill History */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 pt-1.5 pb-0">
              <CardTitle className="text-[10px] font-semibold">Drum Fill Level (%)</CardTitle>
            </CardHeader>
            <CardContent className="px-1 pb-1 pt-1">
              <ChartContainer config={drumChartConfig} className="h-[130px] w-full">
                <LineChart data={d.drumFillHistory} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 8 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 8 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="drum1" stroke="hsl(45, 93%, 47%)" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="drum2" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="drum3" stroke="hsl(25, 95%, 53%)" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="drum4" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Safety Compliance */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 pt-1.5 pb-0">
              <CardTitle className="text-[10px] font-semibold">Safety Compliance (%)</CardTitle>
            </CardHeader>
            <CardContent className="px-1 pb-1 pt-1">
              <ChartContainer config={safetyChartConfig} className="h-[130px] w-full">
                <LineChart data={d.safetyCompliance} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 8 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 8 }} tickLine={false} axisLine={false} domain={[50, 100]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="gloves" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="apron" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="filter" stroke="hsl(45, 93%, 47%)" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 3 — Outlet Comparison + Dirty Oil Events */}
      <div className="grid grid-cols-2 gap-1.5">
        {/* Outlet Comparison */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 pt-1.5 pb-0">
              <CardTitle className="text-[10px] font-semibold">Perbandingan Outlet</CardTitle>
            </CardHeader>
            <CardContent className="px-1 pb-1 pt-1">
              <ChartContainer config={outletChartConfig} className="h-[120px] w-full">
                <BarChart data={d.outletBreakdown} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
                  <defs>
                    <linearGradient id="fillPoolingOutlet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(271, 91%, 65%)" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="hsl(271, 91%, 65%)" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="outlet" tick={{ fontSize: 7 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 8 }} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="volume" fill="url(#fillPoolingOutlet)" radius={[3, 3, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Dirty Oil Events */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-2 pt-1.5 pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                  <CardTitle className="text-[10px] font-semibold">Dirty Oil Events</CardTitle>
                </div>
                <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 border-red-500/30 text-red-500">
                  {d.dirtyOilPooling} events
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-1.5 pt-1">
              <ScrollArea className="h-[100px]">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[8px] p-1 rounded border bg-red-500/5 border-red-500/20">
                    <Droplets className="h-2.5 w-2.5 text-red-500 flex-shrink-0" />
                    <span className="text-muted-foreground w-8">10:25</span>
                    <span className="flex-1 truncate">Minyak sangat kotor tanpa pre-filter</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[8px] p-1 rounded border bg-amber-500/5 border-amber-500/20">
                    <Droplets className="h-2.5 w-2.5 text-amber-500 flex-shrink-0" />
                    <span className="text-muted-foreground w-8">14:30</span>
                    <span className="flex-1 truncate">Drum #1 penuh, perlu dikosongkan</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[8px] p-1 rounded border bg-red-500/5 border-red-500/20">
                    <Droplets className="h-2.5 w-2.5 text-red-500 flex-shrink-0" />
                    <span className="text-muted-foreground w-8">13:15</span>
                    <span className="flex-1 truncate">Pooling di luar jam operasional</span>
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
          alerts={poolingAlerts}
          summary={poolingDeviceSummary}
          title="Pooling Alerts"
        />
      </TabsContent>
      <TabsContent value="overview" className="flex-1 mt-0">
        {overviewContent}
      </TabsContent>
    </Tabs>
  );
}
