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
  ArrowUp,
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
      <div className="h-[350px] bg-muted/30 rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading map...</p>
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
];

const monthlyTrendData = [
  {
    month: "Jan",
    consumption: 118500,
    estimatedCost: 177750000,
    actualCost: 175200000,
  },
  {
    month: "Feb",
    consumption: 112300,
    estimatedCost: 168450000,
    actualCost: 165800000,
  },
  {
    month: "Mar",
    consumption: 121200,
    estimatedCost: 181800000,
    actualCost: 179500000,
  },
  {
    month: "Apr",
    consumption: 115800,
    estimatedCost: 173700000,
    actualCost: 171200000,
  },
  {
    month: "Mei",
    consumption: 119500,
    estimatedCost: 179250000,
    actualCost: 176800000,
  },
  {
    month: "Jun",
    consumption: 123400,
    estimatedCost: 185100000,
    actualCost: 182500000,
  },
  {
    month: "Jul",
    consumption: 125847,
    estimatedCost: 188770500,
    actualCost: 186200000,
  },
];

const regionalAlerts = [
  {
    id: 1,
    outlet: "Recheese Mall ABCD",
    region: "Jakarta",
    type: "OVERLOAD",
    time: "14:32",
    impact: "Rp 125.000/jam",
  },
  {
    id: 2,
    outlet: "Recheese Paris Van Java",
    region: "Jawa Barat",
    type: "ABNORMAL",
    time: "13:15",
    impact: "Rp 85.000/jam",
  },
  {
    id: 3,
    outlet: "Recheese Paragon Mall",
    region: "Jawa Tengah",
    type: "DEVICE_OFFLINE",
    time: "12:45",
    impact: "-",
  },
  {
    id: 4,
    outlet: "Recheese Central Park",
    region: "Jakarta",
    type: "HIGH_USAGE",
    time: "11:20",
    impact: "Rp 95.000/jam",
  },
  {
    id: 5,
    outlet: "Recheese Tunjungan Plaza",
    region: "Jawa Timur",
    type: "OVERLOAD",
    time: "10:55",
    impact: "Rp 110.000/jam",
  },
];

const regionChartConfig = {
  kWh: {
    label: "Konsumsi (kWh)",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const trendChartConfig = {
  consumption: {
    label: "Konsumsi (kWh)",
    color: "hsl(var(--chart-1))",
  },
  estimatedCost: {
    label: "Estimasi Biaya",
    color: "hsl(var(--chart-2))",
  },
  actualCost: {
    label: "Biaya Aktual",
    color: "hsl(var(--chart-3))",
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
              Dashboard Regional
            </h1>
            <p className="text-muted-foreground">
              Monitoring listrik multi-outlet •{" "}
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="gap-1 bg-red-500/10 text-red-500 border-red-500/30"
            >
              <AlertTriangle className="h-3 w-3" />
              {globalKPI.alertOutlets} Outlet Alert
            </Badge>
          </div>
        </motion.div>

        {/* Global KPI Cards */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/80">
                    Total Konsumsi Bulan Ini
                  </p>
                  <p className="text-2xl font-bold truncate">
                    {formatNumber(globalKPI.totalEnergy)} kWh
                  </p>
                </div>
                <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Zap className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-sm">
                <ArrowUp className="h-4 w-4 text-white/80 mr-1" />
                <span className="text-white/90">5.3%</span>
                <span className="text-white/70 ml-1">vs bulan lalu</span>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/80">Estimasi Biaya Total</p>
                  <p className="text-2xl font-bold truncate">
                    {formatCurrency(globalKPI.totalCost)}
                  </p>
                </div>
                <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-sm">
                <ArrowUp className="h-4 w-4 text-white/80 mr-1" />
                <span className="text-white/90">4.8%</span>
                <span className="text-white/70 ml-1">vs bulan lalu</span>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-violet-500 to-purple-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/80">Outlet Aktif</p>
                  <p className="text-2xl font-bold truncate">
                    {globalKPI.activeOutlets}
                  </p>
                </div>
                <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Store className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-white/90">100%</span>
                <span className="text-white/70 ml-1">online</span>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-rose-500 to-red-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/80">Outlet dengan Alert</p>
                  <p className="text-2xl font-bold truncate">
                    {globalKPI.alertOutlets}
                  </p>
                </div>
                <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-white/90">
                  {(
                    (globalKPI.alertOutlets / globalKPI.activeOutlets) *
                    100
                  ).toFixed(1)}
                  %
                </span>
                <span className="text-white/70 ml-1">dari total outlet</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Region Comparison & Map */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Region Comparison Chart */}
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Perbandingan per Region
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={regionChartConfig}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={regionData}
                      layout="vertical"
                      margin={{ left: 10, right: 30 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={true}
                        vertical={false}
                      />
                      <XAxis
                        type="number"
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="region"
                        width={90}
                        tick={{ fontSize: 11 }}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                      />
                      <Bar
                        dataKey="kWh"
                        fill="hsl(var(--chart-1))"
                        radius={[0, 4, 4, 0]}
                        maxBarSize={35}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {regionData.map((region) => (
                    <div
                      key={region.region}
                      className="p-3 rounded-lg bg-muted/50 text-sm"
                    >
                      <p className="font-medium">{region.region}</p>
                      <p className="text-muted-foreground">
                        {formatCurrency(region.cost)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {region.outlets} outlet
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Outlet Status Map - Leaflet */}
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Peta Outlet Indonesia
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Leaflet Map */}
                <div className="h-[350px] rounded-lg overflow-hidden">
                  <LeafletMap outlets={outletLocations} className="h-full" />
                </div>

                {/* Legend */}
                <div className="mt-4 p-3 rounded-lg bg-muted/30 border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Status Outlet:
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="font-medium">Normal</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                        <span className="font-medium">High Usage</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="font-medium">Alert</span>
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Top & Low Usage Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Usage Outlets */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-red-500" />
                  Top Outlet (Penggunaan Tertinggi)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Region</TableHead>
                      <TableHead>Outlet</TableHead>
                      <TableHead className="text-right">kWh</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topOutlets.map((outlet, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {outlet.region}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {outlet.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(outlet.usage)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>

          {/* Low Usage Outlets */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-green-500" />
                  Outlet Hemat (Penggunaan Terendah)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Region</TableHead>
                      <TableHead>Outlet</TableHead>
                      <TableHead className="text-right">kWh</TableHead>
                      <TableHead className="text-right">Biaya</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowOutlets.map((outlet, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {outlet.region}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {outlet.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(outlet.usage)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(outlet.cost)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Monthly Trend & Regional Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Energy Trend */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Tren Penggunaan Bulanan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={trendChartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={monthlyTrendData}
                      margin={{ left: 0, right: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                        width={40}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`}
                        width={40}
                        tickLine={false}
                        axisLine={false}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="consumption"
                        name="Konsumsi (kWh)"
                        stroke="hsl(var(--chart-1))"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="estimatedCost"
                        name="Estimasi Biaya"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ r: 4 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="actualCost"
                        name="Biaya Aktual"
                        stroke="hsl(var(--chart-3))"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Regional Alerts Log */}
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Log Alert Regional
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-3">
                    {regionalAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              getAlertBadgeColor(alert.type),
                            )}
                          >
                            {alert.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {alert.time}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{alert.outlet}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">
                            {alert.region}
                          </span>
                          <span className="text-xs font-medium text-red-500">
                            {alert.impact}
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
