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

// Outlet data
const outlets = [
  {
    id: "mall-abcd",
    name: "Recheese Mall ABCD",
    region: "Jakarta",
    kpiData: {
      todayUsage: 245.8,
      todayCost: 368700,
      monthUsage: 5847.2,
      monthCost: 8770800,
    },
    hourlyData: [
      { hour: "06:00", usage: 8.2 },
      { hour: "07:00", usage: 12.5 },
      { hour: "08:00", usage: 15.8 },
      { hour: "09:00", usage: 18.2 },
      { hour: "10:00", usage: 20.5 },
      { hour: "11:00", usage: 28.4 },
      { hour: "12:00", usage: 35.2 },
      { hour: "13:00", usage: 32.8 },
      { hour: "14:00", usage: 22.5 },
      { hour: "15:00", usage: 18.8 },
      { hour: "16:00", usage: 16.2 },
      { hour: "17:00", usage: 20.5 },
      { hour: "18:00", usage: 32.8 },
      { hour: "19:00", usage: 38.5 },
      { hour: "20:00", usage: 35.2 },
      { hour: "21:00", usage: 25.8 },
      { hour: "22:00", usage: 15.5 },
    ],
    sectionData: [
      { name: "Dapur", value: 45, kWh: 110.6, color: "#f97316" },
      { name: "Area Makan", value: 35, kWh: 86.0, color: "#3b82f6" },
      { name: "Signage & Lampu", value: 20, kWh: 49.2, color: "#22c55e" },
    ],
    comparisonData: {
      todayVsYesterday: { current: 245.8, previous: 238.5, change: 3.06 },
      monthVsLastMonth: { current: 5847.2, previous: 5620.8, change: 4.03 },
    },
    peakPower: 42.5,
    maxLoad: 50,
  },
  {
    id: "central-park",
    name: "Recheese Central Park",
    region: "Jakarta",
    kpiData: {
      todayUsage: 312.4,
      todayCost: 468600,
      monthUsage: 7245.8,
      monthCost: 10868700,
    },
    hourlyData: [
      { hour: "06:00", usage: 10.2 },
      { hour: "07:00", usage: 14.5 },
      { hour: "08:00", usage: 18.8 },
      { hour: "09:00", usage: 22.2 },
      { hour: "10:00", usage: 25.5 },
      { hour: "11:00", usage: 35.4 },
      { hour: "12:00", usage: 42.2 },
      { hour: "13:00", usage: 38.8 },
      { hour: "14:00", usage: 28.5 },
      { hour: "15:00", usage: 22.8 },
      { hour: "16:00", usage: 20.2 },
      { hour: "17:00", usage: 25.5 },
      { hour: "18:00", usage: 40.8 },
      { hour: "19:00", usage: 45.5 },
      { hour: "20:00", usage: 42.2 },
      { hour: "21:00", usage: 32.8 },
      { hour: "22:00", usage: 18.5 },
    ],
    sectionData: [
      { name: "Dapur", value: 48, kWh: 150.0, color: "#f97316" },
      { name: "Area Makan", value: 32, kWh: 100.0, color: "#3b82f6" },
      { name: "Signage & Lampu", value: 20, kWh: 62.4, color: "#22c55e" },
    ],
    comparisonData: {
      todayVsYesterday: { current: 312.4, previous: 298.2, change: 4.76 },
      monthVsLastMonth: { current: 7245.8, previous: 6920.5, change: 4.7 },
    },
    peakPower: 48.2,
    maxLoad: 55,
  },
  {
    id: "bandung-paris",
    name: "Recheese Paris Van Java",
    region: "Jawa Barat",
    kpiData: {
      todayUsage: 198.5,
      todayCost: 297750,
      monthUsage: 4825.6,
      monthCost: 7238400,
    },
    hourlyData: [
      { hour: "06:00", usage: 6.2 },
      { hour: "07:00", usage: 10.5 },
      { hour: "08:00", usage: 12.8 },
      { hour: "09:00", usage: 15.2 },
      { hour: "10:00", usage: 18.5 },
      { hour: "11:00", usage: 24.4 },
      { hour: "12:00", usage: 28.2 },
      { hour: "13:00", usage: 26.8 },
      { hour: "14:00", usage: 18.5 },
      { hour: "15:00", usage: 15.8 },
      { hour: "16:00", usage: 14.2 },
      { hour: "17:00", usage: 18.5 },
      { hour: "18:00", usage: 26.8 },
      { hour: "19:00", usage: 32.5 },
      { hour: "20:00", usage: 28.2 },
      { hour: "21:00", usage: 20.8 },
      { hour: "22:00", usage: 12.5 },
    ],
    sectionData: [
      { name: "Dapur", value: 42, kWh: 83.4, color: "#f97316" },
      { name: "Area Makan", value: 38, kWh: 75.4, color: "#3b82f6" },
      { name: "Signage & Lampu", value: 20, kWh: 39.7, color: "#22c55e" },
    ],
    comparisonData: {
      todayVsYesterday: { current: 198.5, previous: 205.2, change: -3.27 },
      monthVsLastMonth: { current: 4825.6, previous: 4950.2, change: -2.52 },
    },
    peakPower: 35.8,
    maxLoad: 45,
  },
  {
    id: "surabaya-plaza",
    name: "Recheese Tunjungan Plaza",
    region: "Jawa Timur",
    kpiData: {
      todayUsage: 278.2,
      todayCost: 417300,
      monthUsage: 6458.4,
      monthCost: 9687600,
    },
    hourlyData: [
      { hour: "06:00", usage: 9.2 },
      { hour: "07:00", usage: 13.5 },
      { hour: "08:00", usage: 17.8 },
      { hour: "09:00", usage: 20.2 },
      { hour: "10:00", usage: 23.5 },
      { hour: "11:00", usage: 32.4 },
      { hour: "12:00", usage: 38.2 },
      { hour: "13:00", usage: 35.8 },
      { hour: "14:00", usage: 25.5 },
      { hour: "15:00", usage: 20.8 },
      { hour: "16:00", usage: 18.2 },
      { hour: "17:00", usage: 23.5 },
      { hour: "18:00", usage: 36.8 },
      { hour: "19:00", usage: 42.5 },
      { hour: "20:00", usage: 38.2 },
      { hour: "21:00", usage: 28.8 },
      { hour: "22:00", usage: 16.5 },
    ],
    sectionData: [
      { name: "Dapur", value: 46, kWh: 128.0, color: "#f97316" },
      { name: "Area Makan", value: 34, kWh: 94.6, color: "#3b82f6" },
      { name: "Signage & Lampu", value: 20, kWh: 55.6, color: "#22c55e" },
    ],
    comparisonData: {
      todayVsYesterday: { current: 278.2, previous: 265.8, change: 4.67 },
      monthVsLastMonth: { current: 6458.4, previous: 6180.2, change: 4.5 },
    },
    peakPower: 45.2,
    maxLoad: 52,
  },
  {
    id: "semarang-paragon",
    name: "Recheese Paragon Mall",
    region: "Jawa Tengah",
    kpiData: {
      todayUsage: 185.6,
      todayCost: 278400,
      monthUsage: 4328.5,
      monthCost: 6492750,
    },
    hourlyData: [
      { hour: "06:00", usage: 5.8 },
      { hour: "07:00", usage: 9.5 },
      { hour: "08:00", usage: 11.8 },
      { hour: "09:00", usage: 14.2 },
      { hour: "10:00", usage: 17.5 },
      { hour: "11:00", usage: 22.4 },
      { hour: "12:00", usage: 26.2 },
      { hour: "13:00", usage: 24.8 },
      { hour: "14:00", usage: 17.5 },
      { hour: "15:00", usage: 14.8 },
      { hour: "16:00", usage: 13.2 },
      { hour: "17:00", usage: 17.5 },
      { hour: "18:00", usage: 24.8 },
      { hour: "19:00", usage: 30.5 },
      { hour: "20:00", usage: 26.2 },
      { hour: "21:00", usage: 19.8 },
      { hour: "22:00", usage: 11.5 },
    ],
    sectionData: [
      { name: "Dapur", value: 44, kWh: 81.7, color: "#f97316" },
      { name: "Area Makan", value: 36, kWh: 66.8, color: "#3b82f6" },
      { name: "Signage & Lampu", value: 20, kWh: 37.1, color: "#22c55e" },
    ],
    comparisonData: {
      todayVsYesterday: { current: 185.6, previous: 190.2, change: -2.42 },
      monthVsLastMonth: { current: 4328.5, previous: 4520.8, change: -4.25 },
    },
    peakPower: 33.5,
    maxLoad: 42,
  },
];

const hourlyChartConfig = {
  usage: {
    label: "Penggunaan (kWh)",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function ElectricityPage() {
  const [selectedOutlet, setSelectedOutlet] = useState(outlets[0].id);
  const [currentPower, setCurrentPower] = useState(28.5);
  const [loadStatus, setLoadStatus] = useState<"NORMAL" | "OVERLOAD">("NORMAL");

  const outlet = outlets.find((o) => o.id === selectedOutlet) || outlets[0];

  // Initialize power based on outlet
  const initialPower = outlet.peakPower * 0.7;

  // Simulate real-time power fluctuation
  useEffect(() => {
    // Use a timeout to handle the initial state reset (avoiding direct setState in effect body)
    const resetTimer = setTimeout(() => {
      setCurrentPower(initialPower);
    }, 0);

    const interval = setInterval(() => {
      setCurrentPower((prev) => {
        const fluctuation = (Math.random() - 0.5) * 4;
        const newPower = Math.max(
          15,
          Math.min(outlet.maxLoad - 2, prev + fluctuation),
        );
        setLoadStatus(newPower > outlet.maxLoad * 0.8 ? "OVERLOAD" : "NORMAL");
        return Number(newPower.toFixed(1));
      });
    }, 2000);

    return () => {
      clearTimeout(resetTimer);
      clearInterval(interval);
    };
  }, [selectedOutlet, initialPower, outlet.maxLoad]);

  const alerts = [
    {
      id: 1,
      type: "OVERLOAD",
      severity: "high",
      message: `Beban puncak terdeteksi - ${outlet.peakPower} kW`,
      time: "14:32",
      section: "Dapur",
    },
    {
      id: 2,
      type: "OVERLOAD",
      severity: "high",
      message: "Pemakaian berlebih di area dapur",
      time: "12:15",
      section: "Dapur",
    },
    {
      id: 3,
      type: "ABNORMAL",
      severity: "medium",
      message: "Pola penggunaan tidak normal terdeteksi",
      time: "10:45",
      section: "Area Makan",
    },
    {
      id: 4,
      type: "DEVICE_OFFLINE",
      severity: "low",
      message: "Sensor lantai 2 offline",
      time: "09:20",
      section: "Umum",
    },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getAlertBadgeColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-500/20 text-red-500 border-red-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
      default:
        return "bg-blue-500/20 text-blue-500 border-blue-500/30";
    }
  };

  const loadPercentage = (currentPower / outlet.maxLoad) * 100;

  return (
    <PageTransition>
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
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
                    {outlet.kpiData.todayUsage} kWh
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
                    {formatCurrency(outlet.kpiData.todayCost)}
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
                    {outlet.kpiData.monthUsage} kWh
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
                    {formatCurrency(outlet.kpiData.monthCost)}
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
                    <span className="font-medium">{outlet.maxLoad} kW</span>
                  </div>
                  <Progress
                    value={loadPercentage}
                    className={cn(
                      "h-2",
                      loadStatus === "OVERLOAD" && "[&>div]:bg-red-500",
                    )}
                  />
                  <p className="text-xs text-center text-muted-foreground">
                    {loadPercentage.toFixed(1)}% dari kapasitas
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
                  {outlet.sectionData.map((section) => (
                    <div
                      key={section.name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: section.color }}
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
                        outlet.comparisonData.todayVsYesterday.change > 0
                          ? "bg-red-500/20 text-red-500 border-red-500/30"
                          : "bg-green-500/20 text-green-500 border-green-500/30",
                      )}
                    >
                      {outlet.comparisonData.todayVsYesterday.change > 0 ? (
                        <ArrowUp className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowDown className="h-3 w-3 mr-1" />
                      )}
                      {Math.abs(outlet.comparisonData.todayVsYesterday.change)}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Hari Ini</p>
                      <p className="text-lg font-bold">
                        {outlet.comparisonData.todayVsYesterday.current} kWh
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Kemarin</p>
                      <p className="text-lg font-bold">
                        {outlet.comparisonData.todayVsYesterday.previous} kWh
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
                        outlet.comparisonData.monthVsLastMonth.change > 0
                          ? "bg-red-500/20 text-red-500 border-red-500/30"
                          : "bg-green-500/20 text-green-500 border-green-500/30",
                      )}
                    >
                      {outlet.comparisonData.monthVsLastMonth.change > 0 ? (
                        <ArrowUp className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowDown className="h-3 w-3 mr-1" />
                      )}
                      {Math.abs(outlet.comparisonData.monthVsLastMonth.change)}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Bulan Ini</p>
                      <p className="text-lg font-bold">
                        {outlet.comparisonData.monthVsLastMonth.current} kWh
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">
                        Bulan Lalu
                      </p>
                      <p className="text-lg font-bold">
                        {outlet.comparisonData.monthVsLastMonth.previous} kWh
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
