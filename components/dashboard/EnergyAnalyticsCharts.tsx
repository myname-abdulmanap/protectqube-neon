"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  Pie,
  PieChart,
  Cell,
  Label,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  ChartDateFilter,
  type DateRange,
} from "@/components/dashboard/ChartDateFilter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ──────────────────────────────────────────────
// 1. Energy by Region (Bar chart with gradient)
// ──────────────────────────────────────────────

const regionChartConfig: ChartConfig = {
  kWh: { label: "Energy (kWh)", color: "hsl(239, 84%, 67%)" },
};

interface RegionEnergy {
  region: string;
  kWh: number;
}

interface MonthlyEnergyProps {
  data: RegionEnergy[];
  dateRange: DateRange;
  onDateChange: (r: DateRange) => void;
  loading?: boolean;
}

export function MonthlyEnergyChart({
  data,
  dateRange,
  onDateChange,
  loading,
}: MonthlyEnergyProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-0 px-2 pt-1.5">
        <CardTitle className="text-[10px] font-semibold">
          Energy by Region
        </CardTitle>
        <ChartDateFilter value={dateRange} onChange={onDateChange} compact />
      </CardHeader>
      <CardContent className="px-1 pb-1 pt-1">
        {loading ? (
          <Placeholder />
        ) : (
          <ChartContainer
            config={regionChartConfig}
            className="h-[130px] w-full"
          >
            <BarChart
              data={data}
              margin={{ top: 5, right: 5, bottom: 0, left: -15 }}
            >
              <defs>
                <linearGradient id="fillRegion" x1="0" y1="0" x2="0" y2="1">
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
                dataKey="region"
                tick={{ fontSize: 8 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis tick={{ fontSize: 8 }} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="kWh"
                fill="url(#fillRegion)"
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// 2. Top Outlets (Horizontal bar)
// ──────────────────────────────────────────────

const topOutletConfig: ChartConfig = {
  kWh: { label: "Energy (kWh)", color: "hsl(258, 90%, 66%)" },
};

interface OutletPeak {
  name: string;
  kWh: number;
}

interface PeakEnergyProps {
  data: OutletPeak[];
  dateRange: DateRange;
  onDateChange: (r: DateRange) => void;
  loading?: boolean;
}

export function PeakEnergyChart({
  data,
  dateRange,
  onDateChange,
  loading,
}: PeakEnergyProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-0 px-2 pt-1.5">
        <CardTitle className="text-[10px] font-semibold">Top Outlets</CardTitle>
        <ChartDateFilter value={dateRange} onChange={onDateChange} compact />
      </CardHeader>
      <CardContent className="px-1 pb-1 pt-1">
        {loading ? (
          <Placeholder />
        ) : (
          <ChartContainer config={topOutletConfig} className="h-[130px] w-full">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 10, bottom: 0, left: 55 }}
            >
              <defs>
                <linearGradient id="fillTop" x1="0" y1="0" x2="1" y2="0">
                  <stop
                    offset="0%"
                    stopColor="hsl(258, 90%, 66%)"
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="100%"
                    stopColor="hsl(258, 90%, 66%)"
                    stopOpacity={0.9}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 8 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 7 }}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="kWh"
                fill="url(#fillTop)"
                radius={[0, 3, 3, 0]}
                maxBarSize={14}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// 3. Low Outlets (Horizontal bar)
// ──────────────────────────────────────────────

const lowOutletConfig: ChartConfig = {
  kWh: { label: "Energy (kWh)", color: "hsl(142, 71%, 45%)" },
};

export function LowOutletChart({
  data,
  dateRange,
  onDateChange,
  loading,
}: PeakEnergyProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-0 px-2 pt-1.5">
        <CardTitle className="text-[10px] font-semibold">Low Outlets</CardTitle>
        <ChartDateFilter value={dateRange} onChange={onDateChange} compact />
      </CardHeader>
      <CardContent className="px-1 pb-1 pt-1">
        {loading ? (
          <Placeholder />
        ) : (
          <ChartContainer config={lowOutletConfig} className="h-[130px] w-full">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 10, bottom: 0, left: 55 }}
            >
              <defs>
                <linearGradient id="fillLow" x1="0" y1="0" x2="1" y2="0">
                  <stop
                    offset="0%"
                    stopColor="hsl(142, 71%, 45%)"
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="100%"
                    stopColor="hsl(142, 71%, 45%)"
                    stopOpacity={0.9}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 8 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 7 }}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="kWh"
                fill="url(#fillLow)"
                radius={[0, 3, 3, 0]}
                maxBarSize={14}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// 4. Energy Trend (Area chart)
// ──────────────────────────────────────────────

const trendConfig: ChartConfig = {
  kWh: { label: "Energy (kWh)", color: "hsl(199, 89%, 48%)" },
};

interface TrendPoint {
  label: string;
  kWh: number;
}

interface EnergyTrendProps {
  data: TrendPoint[];
  dateRange: DateRange;
  onDateChange: (r: DateRange) => void;
  loading?: boolean;
}

export function EnergyTrendChart({
  data,
  dateRange,
  onDateChange,
  loading,
}: EnergyTrendProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-0 px-2 pt-1.5">
        <CardTitle className="text-[10px] font-semibold">
          Energy Trend
        </CardTitle>
        <ChartDateFilter value={dateRange} onChange={onDateChange} compact />
      </CardHeader>
      <CardContent className="px-1 pb-1 pt-1">
        {loading ? (
          <Placeholder />
        ) : (
          <ChartContainer config={trendConfig} className="h-[130px] w-full">
            <AreaChart
              data={data}
              margin={{ top: 5, right: 5, bottom: 0, left: -15 }}
            >
              <defs>
                <linearGradient id="fillTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="hsl(199, 89%, 48%)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor="hsl(199, 89%, 48%)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 7 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis tick={{ fontSize: 8 }} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="kWh"
                stroke="hsl(199, 89%, 48%)"
                strokeWidth={2}
                fill="url(#fillTrend)"
                dot={{ r: 1.5 }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// 5. Peak Hours (Bar - hourly consumption)
// ──────────────────────────────────────────────

const peakHoursConfig: ChartConfig = {
  kWh: { label: "Energy (kWh)", color: "hsl(199, 89%, 48%)" },
};

interface HourlyUsage {
  hour: string;
  kWh: number;
}

interface PeakHoursProps {
  data: HourlyUsage[];
  dateRange: DateRange;
  onDateChange: (r: DateRange) => void;
  loading?: boolean;
}

export function PeakHoursChart({
  data,
  dateRange,
  onDateChange,
  loading,
}: PeakHoursProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-0 px-2 pt-1.5">
        <CardTitle className="text-[10px] font-semibold">Peak Hours</CardTitle>
        <ChartDateFilter value={dateRange} onChange={onDateChange} compact />
      </CardHeader>
      <CardContent className="px-1 pb-1 pt-1">
        {loading ? (
          <Placeholder />
        ) : (
          <ChartContainer config={peakHoursConfig} className="h-[280px] w-full">
            <BarChart
              data={data}
              margin={{ top: 5, right: 5, bottom: 0, left: -15 }}
            >
              <defs>
                <linearGradient id="fillPeakHours" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="hsl(199, 89%, 48%)"
                    stopOpacity={0.9}
                  />
                  <stop
                    offset="100%"
                    stopColor="hsl(199, 89%, 48%)"
                    stopOpacity={0.3}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 7 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis tick={{ fontSize: 8 }} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="kWh"
                fill="url(#fillPeakHours)"
                radius={[3, 3, 0, 0]}
                maxBarSize={16}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// 6. Total Metrics Chart (Power/Voltage/Current combined)
// ──────────────────────────────────────────────

type MetricType = "power" | "voltage" | "current";

const metricConfigs: Record<
  MetricType,
  { config: ChartConfig; color: string; unit: string; label: string }
> = {
  power: {
    config: { value: { label: "Power (kW)", color: "hsl(280, 70%, 55%)" } },
    color: "hsl(280, 70%, 55%)",
    unit: "kW",
    label: "Total Power (kW)",
  },
  voltage: {
    config: { value: { label: "Voltage (V)", color: "hsl(45, 93%, 47%)" } },
    color: "hsl(45, 93%, 47%)",
    unit: "V",
    label: "Total Voltage (V)",
  },
  current: {
    config: { value: { label: "Current (A)", color: "hsl(0, 84%, 60%)" } },
    color: "hsl(0, 84%, 60%)",
    unit: "A",
    label: "Total Current (A)",
  },
};

interface TimeSeriesPoint {
  label: string;
  value: number;
}

interface TotalMetricsChartProps {
  powerData: TimeSeriesPoint[];
  voltageData: TimeSeriesPoint[];
  currentData: TimeSeriesPoint[];
  dateRange: DateRange;
  onDateChange: (r: DateRange) => void;
  loading?: boolean;
}

export function TotalMetricsChart({
  powerData,
  voltageData,
  currentData,
  dateRange,
  onDateChange,
  loading,
}: TotalMetricsChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("power");

  const dataMap: Record<MetricType, TimeSeriesPoint[]> = {
    power: powerData,
    voltage: voltageData,
    current: currentData,
  };

  const data = dataMap[selectedMetric];
  const { config, color, label } = metricConfigs[selectedMetric];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-0 px-2 pt-1.5">
        <div className="flex items-center gap-2">
          <Select
            value={selectedMetric}
            onValueChange={(v) => setSelectedMetric(v as MetricType)}
          >
            <SelectTrigger className="h-6 text-[10px] w-[130px] border-0 bg-muted/50 px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="power" className="text-[10px]">
                Total Power (kW)
              </SelectItem>
              <SelectItem value="voltage" className="text-[10px]">
                Total Voltage (V)
              </SelectItem>
              <SelectItem value="current" className="text-[10px]">
                Total Current (A)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ChartDateFilter value={dateRange} onChange={onDateChange} compact />
      </CardHeader>
      <CardContent className="px-1 pb-1 pt-1">
        {loading ? (
          <Placeholder />
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[130px] text-[10px] text-muted-foreground">
            No data
          </div>
        ) : (
          <ChartContainer config={config} className="h-[130px] w-full">
            <AreaChart
              data={data}
              margin={{ top: 5, right: 5, bottom: 0, left: -15 }}
            >
              <defs>
                <linearGradient
                  id={`fillMetric-${selectedMetric}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 7 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis tick={{ fontSize: 8 }} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="value"
                name={label}
                stroke={color}
                strokeWidth={2}
                fill={`url(#fillMetric-${selectedMetric})`}
                dot={{ r: 1.5 }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

// Keep legacy exports for backward compatibility
interface VoltageChartProps {
  data: TimeSeriesPoint[];
  dateRange: DateRange;
  onDateChange: (r: DateRange) => void;
  loading?: boolean;
}

export function VoltageChart({
  data,
  dateRange,
  onDateChange,
  loading,
}: VoltageChartProps) {
  return (
    <TotalMetricsChart
      powerData={[]}
      voltageData={data}
      currentData={[]}
      dateRange={dateRange}
      onDateChange={onDateChange}
      loading={loading}
    />
  );
}

export function CurrentChart({
  data,
  dateRange,
  onDateChange,
  loading,
}: VoltageChartProps) {
  return (
    <TotalMetricsChart
      powerData={[]}
      voltageData={[]}
      currentData={data}
      dateRange={dateRange}
      onDateChange={onDateChange}
      loading={loading}
    />
  );
}

export function PowerChart({
  data,
  dateRange,
  onDateChange,
  loading,
}: VoltageChartProps) {
  return (
    <TotalMetricsChart
      powerData={data}
      voltageData={[]}
      currentData={[]}
      dateRange={dateRange}
      onDateChange={onDateChange}
      loading={loading}
    />
  );
}

// ──────────────────────────────────────────────
// 7. Outlet Comparison (Bar chart)
// ──────────────────────────────────────────────

const comparisonConfig: ChartConfig = {
  kWh: { label: "Energy (kWh)", color: "hsl(239, 84%, 67%)" },
};

interface OutletComparison {
  name: string;
  kWh: number;
}

interface OutletComparisonProps {
  data: OutletComparison[];
  dateRange: DateRange;
  onDateChange: (r: DateRange) => void;
  loading?: boolean;
}

export function OutletComparisonChart({
  data,
  dateRange,
  onDateChange,
  loading,
}: OutletComparisonProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-0 px-2 pt-1.5">
        <CardTitle className="text-[10px] font-semibold">
          Outlet Comparison
        </CardTitle>
        <ChartDateFilter value={dateRange} onChange={onDateChange} compact />
      </CardHeader>
      <CardContent className="px-1 pb-1 pt-1">
        {loading ? (
          <Placeholder />
        ) : (
          <ChartContainer
            config={comparisonConfig}
            className="h-[130px] w-full"
          >
            <BarChart
              data={data}
              margin={{ top: 5, right: 5, bottom: 0, left: -15 }}
            >
              <defs>
                <linearGradient id="fillComparison" x1="0" y1="0" x2="0" y2="1">
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
                dataKey="name"
                tick={{ fontSize: 7 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis tick={{ fontSize: 8 }} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="kWh"
                fill="url(#fillComparison)"
                radius={[3, 3, 0, 0]}
                maxBarSize={20}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// 8. Energy Distribution Donut with Legend
// ──────────────────────────────────────────────

const DONUT_COLORS = [
  "hsl(239, 84%, 67%)",
  "hsl(173, 58%, 39%)",
  "hsl(43, 96%, 56%)",
  "hsl(12, 76%, 61%)",
  "hsl(280, 70%, 55%)",
  "hsl(197, 71%, 52%)",
  "hsl(339, 80%, 56%)",
  "hsl(150, 60%, 45%)",
];

const donutConfig: ChartConfig = {
  kWh: { label: "Energy (kWh)" },
};

interface DonutDataItem {
  name: string;
  kWh: number;
}

interface EnergyDistributionDonutProps {
  data: DonutDataItem[];
  loading?: boolean;
}

export function EnergyDistributionDonut({
  data,
  loading,
}: EnergyDistributionDonutProps) {
  const total = data.reduce((s, d) => s + d.kWh, 0);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-0 px-2 pt-1.5">
        <CardTitle className="text-[10px] font-semibold">
          Energy Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-2 pt-1">
        {loading ? (
          <Placeholder />
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[170px] text-[10px] text-muted-foreground">
            No data
          </div>
        ) : (
          <div className="flex flex-col">
            <ChartContainer config={donutConfig} className="h-[130px] w-full">
              <PieChart>
                <ChartTooltip
                  content={<ChartTooltipContent nameKey="name" />}
                />
                <Pie
                  data={data}
                  dataKey="kWh"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={2}
                  strokeWidth={1}
                >
                  {data.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                    />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-xs font-bold"
                            >
                              {total.toFixed(0)}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 12}
                              className="fill-muted-foreground text-[7px]"
                            >
                              kWh
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
            {/* Legend with percentages */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1 max-h-[80px] overflow-y-auto">
              {data.map((item, index) => {
                const percent =
                  total > 0 ? ((item.kWh / total) * 100).toFixed(1) : "0";
                return (
                  <div key={item.name} className="flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-sm flex-shrink-0"
                      style={{
                        backgroundColor:
                          DONUT_COLORS[index % DONUT_COLORS.length],
                      }}
                    />
                    <span className="text-[8px] text-muted-foreground truncate flex-1">
                      {item.name}
                    </span>
                    <span className="text-[8px] font-semibold text-foreground">
                      {percent}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// Placeholder
// ──────────────────────────────────────────────

function Placeholder() {
  return (
    <div className="flex items-center justify-center h-[130px] text-[10px] text-muted-foreground">
      Loading...
    </div>
  );
}
