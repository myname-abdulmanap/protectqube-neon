"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Building2,
  Zap,
  DollarSign,
  Store,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  MapPin,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/ui/page-transition";

// Dynamic import for Leaflet map (no SSR)
const LeafletMap = dynamic(
  () => import("@/components/ui/leaflet-map").then((mod) => mod.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[180px] bg-muted/30 rounded flex items-center justify-center">
        <p className="text-muted-foreground text-xs">Loading map...</p>
      </div>
    ),
  },
);

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const,
    },
  },
};

// Dummy Data
const globalKPI = {
  totalEnergy: 125847,
  totalCost: 188770500,
  activeOutlets: 48,
  alertOutlets: 5,
};

const regionData = [
  { region: "Jakarta", kWh: 45200, cost: 67800000, outlets: 15 },
  { region: "Jawa Barat", kWh: 32500, cost: 48750000, outlets: 12 },
  { region: "Jawa Tengah", kWh: 28400, cost: 42600000, outlets: 11 },
  { region: "Jawa Timur", kWh: 19747, cost: 29620500, outlets: 10 },
];

// Outlet locations for Leaflet map
const outletLocations = [
  // Jakarta
  {
    id: "1",
    name: "Recheese Mall ABCD",
    region: "Jakarta",
    lat: -6.2088,
    lng: 106.8456,
    status: "alert" as const,
    usage: 5847,
    cost: 8770500,
  },
  {
    id: "2",
    name: "Recheese Central Park",
    region: "Jakarta",
    lat: -6.1751,
    lng: 106.7902,
    status: "high" as const,
    usage: 5523,
    cost: 8284500,
  },
  {
    id: "3",
    name: "Recheese Kemang",
    region: "Jakarta",
    lat: -6.2615,
    lng: 106.8133,
    status: "normal" as const,
    usage: 4321,
    cost: 6481500,
  },
  {
    id: "4",
    name: "Recheese Kelapa Gading",
    region: "Jakarta",
    lat: -6.1584,
    lng: 106.9087,
    status: "normal" as const,
    usage: 3890,
    cost: 5835000,
  },
  {
    id: "5",
    name: "Recheese PIK",
    region: "Jakarta",
    lat: -6.1089,
    lng: 106.7437,
    status: "high" as const,
    usage: 4120,
    cost: 6180000,
  },
  // Jawa Barat
  {
    id: "6",
    name: "Recheese Paris Van Java",
    region: "Jawa Barat",
    lat: -6.8879,
    lng: 107.6151,
    status: "normal" as const,
    usage: 4892,
    cost: 7338000,
  },
  {
    id: "7",
    name: "Recheese Sukabumi",
    region: "Jawa Barat",
    lat: -6.9277,
    lng: 106.93,
    status: "normal" as const,
    usage: 1678,
    cost: 2517000,
  },
  {
    id: "8",
    name: "Recheese Trans Studio Bandung",
    region: "Jawa Barat",
    lat: -6.9261,
    lng: 107.6348,
    status: "alert" as const,
    usage: 4250,
    cost: 6375000,
  },
  {
    id: "9",
    name: "Recheese Cirebon",
    region: "Jawa Barat",
    lat: -6.732,
    lng: 108.5523,
    status: "high" as const,
    usage: 3450,
    cost: 5175000,
  },
  // Jawa Tengah
  {
    id: "10",
    name: "Recheese Paragon Mall",
    region: "Jawa Tengah",
    lat: -6.9932,
    lng: 110.4203,
    status: "normal" as const,
    usage: 4567,
    cost: 6850500,
  },
  {
    id: "11",
    name: "Recheese Purwokerto",
    region: "Jawa Tengah",
    lat: -7.4213,
    lng: 109.2365,
    status: "normal" as const,
    usage: 1456,
    cost: 2184000,
  },
  {
    id: "12",
    name: "Recheese Tegal",
    region: "Jawa Tengah",
    lat: -6.8694,
    lng: 109.1402,
    status: "normal" as const,
    usage: 1945,
    cost: 2917500,
  },
  {
    id: "13",
    name: "Recheese Solo",
    region: "Jawa Tengah",
    lat: -7.5755,
    lng: 110.8243,
    status: "alert" as const,
    usage: 3890,
    cost: 5835000,
  },
  // Jawa Timur
  {
    id: "14",
    name: "Recheese Tunjungan Plaza",
    region: "Jawa Timur",
    lat: -7.262,
    lng: 112.738,
    status: "alert" as const,
    usage: 4150,
    cost: 6225000,
  },
  {
    id: "15",
    name: "Recheese Blitar",
    region: "Jawa Timur",
    lat: -8.0954,
    lng: 112.1609,
    status: "normal" as const,
    usage: 1245,
    cost: 1867500,
  },
  {
    id: "16",
    name: "Recheese Madiun",
    region: "Jawa Timur",
    lat: -7.6286,
    lng: 111.5239,
    status: "normal" as const,
    usage: 1823,
    cost: 2734500,
  },
  {
    id: "17",
    name: "Recheese Malang",
    region: "Jawa Timur",
    lat: -7.9785,
    lng: 112.6304,
    status: "high" as const,
    usage: 3560,
    cost: 5340000,
  },
];

const topOutlets = [
  { region: "Jakarta", name: "Recheese Mall ABCD", usage: 5847, cost: 8770500 },
  {
    region: "Jakarta",
    name: "Recheese Central Park",
    usage: 5523,
    cost: 8284500,
  },
  {
    region: "Jawa Barat",
    name: "Recheese Paris Van Java",
    usage: 4892,
    cost: 7338000,
  },
  {
    region: "Jawa Tengah",
    name: "Recheese Paragon Mall",
    usage: 4567,
    cost: 6850500,
  },
  { region: "Jakarta", name: "Recheese Kemang", usage: 4321, cost: 6481500 },
  {
    region: "Jawa Barat",
    name: "Recheese Trans Studio",
    usage: 4250,
    cost: 6375000,
  },
  {
    region: "Jawa Timur",
    name: "Recheese Tunjungan Plaza",
    usage: 4150,
    cost: 6225000,
  },
  { region: "Jakarta", name: "Recheese PIK", usage: 4120, cost: 6180000 },
  {
    region: "Jakarta",
    name: "Recheese Kelapa Gading",
    usage: 3890,
    cost: 5835000,
  },
  { region: "Jawa Timur", name: "Recheese Malang", usage: 3560, cost: 5340000 },
];

const lowOutlets = [
  { region: "Jawa Timur", name: "Recheese Blitar", usage: 1245, cost: 1867500 },
  {
    region: "Jawa Tengah",
    name: "Recheese Purwokerto",
    usage: 1456,
    cost: 2184000,
  },
  {
    region: "Jawa Barat",
    name: "Recheese Sukabumi",
    usage: 1678,
    cost: 2517000,
  },
  { region: "Jawa Timur", name: "Recheese Madiun", usage: 1823, cost: 2734500 },
  { region: "Jawa Tengah", name: "Recheese Tegal", usage: 1945, cost: 2917500 },
  {
    region: "Jawa Barat",
    name: "Recheese Tasikmalaya",
    usage: 2015,
    cost: 3022500,
  },
  { region: "Jawa Timur", name: "Recheese Kediri", usage: 2130, cost: 3195000 },
  {
    region: "Jawa Tengah",
    name: "Recheese Pekalongan",
    usage: 2245,
    cost: 3367500,
  },
  { region: "Jakarta", name: "Recheese Cibubur", usage: 2380, cost: 3570000 },
  {
    region: "Jawa Barat",
    name: "Recheese Karawang",
    usage: 2510,
    cost: 3765000,
  },
];

const monthlyTrendData = [
  {
    month: "Mar 2025",
    consumption: 121200,
    estimatedCost: 181800000,
    actualCost: 179500000,
  },
  {
    month: "Apr 2025",
    consumption: 115800,
    estimatedCost: 173700000,
    actualCost: 171200000,
  },
  {
    month: "May 2025",
    consumption: 119400,
    estimatedCost: 179100000,
    actualCost: 176800000,
  },
  {
    month: "Jun 2025",
    consumption: 123600,
    estimatedCost: 185400000,
    actualCost: 182900000,
  },
  {
    month: "Jul 2025",
    consumption: 117200,
    estimatedCost: 175800000,
    actualCost: 173500000,
  },
  {
    month: "Aug 2025",
    consumption: 120800,
    estimatedCost: 181200000,
    actualCost: 178600000,
  },
  {
    month: "Sep 2025",
    consumption: 116500,
    estimatedCost: 174750000,
    actualCost: 172100000,
  },
  {
    month: "Oct 2025",
    consumption: 122400,
    estimatedCost: 183600000,
    actualCost: 181000000,
  },
  {
    month: "Nov 2025",
    consumption: 118900,
    estimatedCost: 178350000,
    actualCost: 175900000,
  },
  {
    month: "Dec 2025",
    consumption: 127300,
    estimatedCost: 190950000,
    actualCost: 188200000,
  },
  {
    month: "Jan 2026",
    consumption: 124100,
    estimatedCost: 186150000,
    actualCost: 183700000,
  },
  {
    month: "Feb 2026",
    consumption: 125847,
    estimatedCost: 188770500,
    actualCost: 186200000,
  },
];

const regionalAlerts = [
  {
    id: 1,
    outlet: "Sabang",
    region: "Jakarta",
    type: "OVERLOAD",
    time: "1:25 PM",
    message: "Excessive load 66% higher than usual",
    impact: "+Rp155,000",
  },
  {
    id: 2,
    outlet: "Bandung Square",
    region: "West Java",
    type: "HIGH_USAGE",
    time: "1:03 PM",
    message: "Peak load 11.8 kW",
    impact: "+Rp165,000",
  },
  {
    id: 3,
    outlet: "Semarang Central",
    region: "Central Java",
    type: "DEVICE_OFFLINE",
    time: "11:40 AM",
    message: "Power Meter offline for 1hr 30min",
    impact: "Offline",
  },
  {
    id: 4,
    outlet: "Surabaya Plaza",
    region: "East Java",
    type: "OVERLOAD",
    time: "9:25 AM",
    message: "Excessive load 95% higher than usual",
    impact: "+Rp210,000",
  },
];

const regionChartConfig = {
  kWh: {
    label: "Consumption (kWh)",
    color: "#6366f1",
  },
} satisfies ChartConfig;

const trendChartConfig = {
  consumption: {
    label: "Consumption (kWh)",
    color: "#06b6d4",
  },
  estimatedCost: {
    label: "Estimated Cost",
    color: "#f59e0b",
  },
  actualCost: {
    label: "Actual Cost",
    color: "#10b981",
  },
} satisfies ChartConfig;

export default function RegionalPage() {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("id-ID").format(value);
  };

  const getAlertBadgeColor = (type: string) => {
    switch (type) {
      case "OVERLOAD":
        return "bg-red-500/20 text-red-500 border-red-500/30";
      case "HIGH_USAGE":
        return "bg-orange-500/20 text-orange-500 border-orange-500/30";
      case "ABNORMAL":
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
      case "DEVICE_OFFLINE":
        return "bg-gray-500/20 text-gray-500 border-gray-500/30";
      default:
        return "bg-blue-500/20 text-blue-500 border-blue-500/30";
    }
  };

  return (
    <PageTransition>
      <motion.div
        className="space-y-1 p-0"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Global KPI Cards - Ultra Compact */}
        <motion.div variants={itemVariants} className="grid grid-cols-4 gap-2">
          <Card className="relative overflow-hidden border-0 shadow-sm bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
            <CardContent className="p-2.5">
              <div className="flex items-start gap-2">
                <div className="h-6 w-6 flex-shrink-0 rounded bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Zap className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] text-white/80 leading-tight">
                    Total Energy
                  </p>
                  <p className="text-sm font-bold truncate">
                    {formatNumber(globalKPI.totalEnergy)}
                  </p>
                  <p className="text-[9px] text-white/90">kWh</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-sm bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
            <CardContent className="p-2.5">
              <div className="flex items-start gap-2">
                <div className="h-6 w-6 flex-shrink-0 rounded bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <DollarSign className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] text-white/80 leading-tight">
                    Est. Cost
                  </p>
                  <p className="text-sm font-bold truncate">
                    Rp {(globalKPI.totalCost / 1000000).toFixed(1)}
                  </p>
                  <p className="text-[9px] text-white/90">Million</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-sm bg-gradient-to-br from-orange-500 to-amber-600 text-white">
            <CardContent className="p-2.5">
              <div className="flex items-start gap-2">
                <div className="h-6 w-6 flex-shrink-0 rounded bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Store className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] text-white/80 leading-tight">
                    Active Outlets
                  </p>
                  <p className="text-xl font-bold truncate">
                    {globalKPI.activeOutlets}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-sm bg-gradient-to-br from-rose-500 to-red-600 text-white">
            <CardContent className="p-2.5">
              <div className="flex items-start gap-2">
                <div className="h-6 w-6 flex-shrink-0 rounded bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <AlertTriangle className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] text-white/80 leading-tight">
                    Alerts
                  </p>
                  <p className="text-xl font-bold truncate">
                    {globalKPI.alertOutlets}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-[2fr_3fr] gap-1">
          {/* Left Column - Region Comparison & Map */}
          <div className="space-y-1">
            {/* Region Comparison Chart */}
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-sm">
                <CardHeader className="px-1.5 pt-1 pb-0">
                  <CardTitle className="text-[10px] font-semibold">
                    Region Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-0 pt-0">
                  <ChartContainer
                    config={regionChartConfig}
                    className="h-[140px] w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={regionData}
                        margin={{ left: 0, right: 0, top: 5, bottom: 35 }}
                      >
                        <XAxis
                          dataKey="region"
                          tick={(props: any) => {
                            const { x, y, payload } = props;
                            const cost = regionData.find(
                              (r) => r.region === payload.value,
                            )?.cost;
                            return (
                              <g transform={`translate(${x},${y})`}>
                                <text
                                  x={0}
                                  y={0}
                                  dy={10}
                                  textAnchor="middle"
                                  fontSize={8}
                                  fill="currentColor"
                                >
                                  {payload.value}
                                </text>
                                <text
                                  x={0}
                                  y={0}
                                  dy={20}
                                  textAnchor="middle"
                                  fontSize={7}
                                  fill="currentColor"
                                  opacity={0.6}
                                >
                                  {cost
                                    ? `Rp ${(cost / 1000000).toFixed(1)}jt`
                                    : ""}
                                </text>
                              </g>
                            );
                          }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis hide />
                        <ChartTooltip
                          content={<ChartTooltipContent />}
                          cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }}
                        />
                        <defs>
                          <linearGradient
                            id="barGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop offset="0%" stopColor="#818cf8" />
                            <stop offset="100%" stopColor="#6366f1" />
                          </linearGradient>
                        </defs>
                        <Bar
                          dataKey="kWh"
                          fill="url(#barGradient)"
                          radius={[3, 3, 0, 0]}
                          label={{
                            position: "top",
                            fontSize: 8,
                            formatter: (v: number) =>
                              `${(v / 1000).toFixed(1)}k`,
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Top & Low Outlets Tables */}
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-sm">
                <CardHeader className="px-1 pt-0.5 pb-0">
                  <CardTitle className="text-[9px] font-semibold">
                    Top Usage Outlets
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-1 pb-0.5 pt-0">
                  <ScrollArea className="h-[120px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b">
                          <TableHead className="text-[7px] h-4 px-0.5 py-0">
                            Region
                          </TableHead>
                          <TableHead className="text-[7px] h-4 px-0.5 py-0">
                            Outlet
                          </TableHead>
                          <TableHead className="text-right text-[7px] h-4 px-0.5 py-0">
                            kWh
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topOutlets.map((outlet, idx) => (
                          <TableRow key={idx} className="border-b">
                            <TableCell className="py-px px-0.5 text-[7px]">
                              {idx + 1}. {outlet.region}
                            </TableCell>
                            <TableCell className="py-px px-0.5 text-[7px] font-medium">
                              {outlet.name}
                            </TableCell>
                            <TableCell className="text-right py-px px-0.5 text-[7px]">
                              {formatNumber(outlet.usage)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>

            {/* Low Usage Outlets */}
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-sm">
                <CardHeader className="px-1 pt-0.5 pb-0">
                  <CardTitle className="text-[9px] font-semibold">
                    Low Usage Outlets
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-1 pb-0.5 pt-0">
                  <ScrollArea className="h-[120px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b">
                          <TableHead className="text-[7px] h-4 px-0.5 py-0">
                            Region
                          </TableHead>
                          <TableHead className="text-[7px] h-4 px-0.5 py-0">
                            Outlet
                          </TableHead>
                          <TableHead className="text-right text-[7px] h-4 px-0.5 py-0">
                            kWh
                          </TableHead>
                          <TableHead className="text-right text-[7px] h-4 px-0.5 py-0">
                            Cost
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lowOutlets.map((outlet, idx) => (
                          <TableRow key={idx} className="border-b">
                            <TableCell className="py-px px-0.5 text-[7px]">
                              {idx + 1}. {outlet.region}
                            </TableCell>
                            <TableCell className="py-px px-0.5 text-[7px] font-medium">
                              {outlet.name}
                            </TableCell>
                            <TableCell className="text-right py-px px-0.5 text-[7px]">
                              {formatNumber(outlet.usage)}
                            </TableCell>
                            <TableCell className="text-right py-px px-0.5 text-[7px]">
                              {formatNumber(outlet.cost)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Column - Map & Trend & Alerts */}
          <div className="space-y-1">
            {/* Outlet Status Map */}
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-sm">
                <CardHeader className="px-1.5 pt-1 pb-0">
                  <CardTitle className="text-[10px] font-semibold">
                    Outlet Status Map
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-1.5 pb-1 pt-0.5">
                  <div className="h-[240px] rounded overflow-hidden bg-muted/30">
                    <LeafletMap outlets={outletLocations} className="h-full" />
                  </div>
                  {/* Legend */}
                  <div className="mt-1 flex items-center justify-end gap-2 text-[8px]">
                    <span className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Normal
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      High
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      Alert
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Monthly Trend & Alerts Side by Side */}
            <div className="grid grid-cols-2 gap-1">
              {/* Monthly Energy Usage */}
              <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-sm h-full">
                  <CardHeader className="px-1.5 pt-1 pb-0">
                    <CardTitle className="text-[10px] font-semibold">
                      Monthly Energy Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-1.5 pb-1 pt-0">
                    <ChartContainer
                      config={trendChartConfig}
                      className="h-[155px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={monthlyTrendData}
                          margin={{ left: 0, right: 0, top: 5, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="hsl(var(--border))"
                            opacity={0.3}
                          />
                          <XAxis
                            dataKey="month"
                            tick={{ fontSize: 7 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            yAxisId="left"
                            tick={{ fontSize: 7 }}
                            tickFormatter={(v) => `${(v / 1000).toFixed(0)}`}
                            width={20}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: 7 }}
                            tickFormatter={(v) => `${(v / 1000000).toFixed(0)}`}
                            width={20}
                            tickLine={false}
                            axisLine={false}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend wrapperStyle={{ fontSize: "7px" }} />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="consumption"
                            name="Consumption"
                            stroke="#06b6d4"
                            strokeWidth={2}
                            dot={{ r: 2, fill: "#06b6d4" }}
                            activeDot={{ r: 3, fill: "#06b6d4" }}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="estimatedCost"
                            name="Estimated"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            dot={{ r: 2, fill: "#f59e0b" }}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="actualCost"
                            name="Actual Cost"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={{ r: 2, fill: "#10b981" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Alerts */}
              <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-sm h-full">
                  <CardHeader className="px-1.5 pt-1 pb-0">
                    <CardTitle className="text-[10px] font-semibold">
                      Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-1.5 pb-1 pt-0">
                    <ScrollArea className="h-[155px]">
                      <div className="space-y-1">
                        {regionalAlerts.map((alert) => (
                          <div
                            key={alert.id}
                            className="p-1 rounded border bg-card text-[8px] leading-tight"
                          >
                            <div className="flex items-start justify-between gap-1 mb-0.5">
                              <div className="flex items-center gap-1">
                                <span className="font-medium text-[8px]">
                                  {alert.time}
                                </span>
                                <span className="text-muted-foreground text-[7px]">
                                  {alert.region}
                                </span>
                              </div>
                              <span className="text-red-500 font-medium text-[8px]">
                                {alert.impact}
                              </span>
                            </div>
                            <div className="font-medium mb-0.5 text-[8px]">
                              {alert.outlet}
                            </div>
                            <div className="text-muted-foreground text-[7px]">
                              {alert.message}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    </PageTransition>
  );
}
