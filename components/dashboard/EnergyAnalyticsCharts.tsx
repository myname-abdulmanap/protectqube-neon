"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
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

/* ── Zoom / Pan chart wrapper ───────────────────────────────── */

function ZoomPanChart({
  data,
  children,
  minWindow = 4,
  yAxisLabel,
  xAxisLabel,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: (slicedData: any[]) => ReactNode;
  minWindow?: number;
  yAxisLabel?: string;
  xAxisLabel?: string;
}) {
  const total = data.length;
  const containerRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState({ start: 0, end: total });
  const dragState = useRef({
    active: false,
    startX: 0,
    startRange: { start: 0, end: 0 },
  });
  const pinchState = useRef<{
    dist0: number;
    range0: { start: number; end: number };
  } | null>(null);
  const rangeRef = useRef(range);

  // Keep rangeRef in sync for event handlers
  useEffect(() => {
    rangeRef.current = range;
  }, [range]);

  // Reset when data length changes (render-time adjustment)
  const [prevTotal, setPrevTotal] = useState(total);
  if (prevTotal !== total) {
    setPrevTotal(total);
    setRange({ start: 0, end: total });
  }

  // Wheel zoom — passive:false so we can preventDefault
  useEffect(() => {
    const el = containerRef.current;
    if (!el || total <= minWindow) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setRange((prev) => {
        const ws = prev.end - prev.start;
        const c = (prev.start + prev.end) / 2;
        const step = Math.max(1, Math.round(ws * 0.12));
        const ns =
          e.deltaY < 0
            ? Math.max(minWindow, ws - step)
            : Math.min(total, ws + step);
        let s = Math.max(0, Math.round(c - ns / 2));
        let en = s + ns;
        if (en > total) {
          en = total;
          s = Math.max(0, en - ns);
        }
        return { start: s, end: en };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [total, minWindow]);

  // ── Pointer (mouse / stylus) drag‑to‑pan ──
  const onPtrDown = useCallback(
    (e: React.PointerEvent) => {
      if (total <= minWindow) return;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      dragState.current = {
        active: true,
        startX: e.clientX,
        startRange: { ...rangeRef.current },
      };
    },
    [total, minWindow],
  );

  const onPtrMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragState.current;
      if (!d.active || !containerRef.current) return;
      const dx = e.clientX - d.startX;
      const w = containerRef.current.clientWidth;
      const ws = d.startRange.end - d.startRange.start;
      const shift = Math.round((-dx / w) * ws * 0.8);
      let s = Math.max(0, d.startRange.start + shift);
      let en = s + ws;
      if (en > total) {
        en = total;
        s = Math.max(0, en - ws);
      }
      setRange({ start: s, end: en });
    },
    [total],
  );

  const onPtrUp = useCallback(() => {
    dragState.current.active = false;
  }, []);

  // ── Touch pinch‑to‑zoom ──
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      pinchState.current = { dist0: dist, range0: { ...rangeRef.current } };
    }
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 2 || !pinchState.current) return;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const scale = dist / pinchState.current.dist0;
      const { range0 } = pinchState.current;
      const iw = range0.end - range0.start;
      const ns = Math.min(total, Math.max(minWindow, Math.round(iw / scale)));
      const c = (range0.start + range0.end) / 2;
      let s = Math.max(0, Math.round(c - ns / 2));
      let en = s + ns;
      if (en > total) {
        en = total;
        s = Math.max(0, en - ns);
      }
      setRange({ start: s, end: en });
    },
    [total, minWindow],
  );

  const onTouchEnd = useCallback(() => {
    pinchState.current = null;
  }, []);

  const isZoomed = range.start > 0 || range.end < total;
  const sliced = data.slice(range.start, range.end);

  return (
    <div className="relative">
      {yAxisLabel && (
        <div className="pl-1 mb-0.5">
          <span className="text-[8px] text-muted-foreground/70 italic">
            {yAxisLabel}
          </span>
        </div>
      )}
      {xAxisLabel && (
        <span className="absolute bottom-0 right-0 text-[8px] text-muted-foreground/70 italic z-10 pointer-events-none">
          {xAxisLabel}
        </span>
      )}
      <div
        ref={containerRef}
        onPointerDown={onPtrDown}
        onPointerMove={onPtrMove}
        onPointerUp={onPtrUp}
        onPointerLeave={onPtrUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={
          total > minWindow
            ? "cursor-grab active:cursor-grabbing select-none touch-none"
            : ""
        }
      >
        {children(sliced)}
      </div>
      {isZoomed && (
        <div className="flex items-center gap-2 mt-1 px-1">
          <div className="h-1 flex-1 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/40 rounded-full transition-all duration-150"
              style={{
                width: `${((range.end - range.start) / total) * 100}%`,
                marginLeft: `${(range.start / total) * 100}%`,
              }}
            />
          </div>
          <button
            onClick={() => setRange({ start: 0, end: total })}
            className="text-[9px] text-primary hover:text-primary/80 bg-muted/50 hover:bg-muted px-1.5 py-0.5 rounded border border-border/50 flex-shrink-0 transition-colors"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}

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
  showDateFilter?: boolean;
}

export function MonthlyEnergyChart({
  data,
  dateRange,
  onDateChange,
  loading,
  showDateFilter = true,
}: MonthlyEnergyProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between pb-1 px-4 pt-3">
        <div>
          <CardTitle className="text-sm font-semibold">
            Energy by Region
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Akumulasi energi per region pada rentang filter global.
          </p>
        </div>
        {showDateFilter && (
          <ChartDateFilter value={dateRange} onChange={onDateChange} compact />
        )}
      </CardHeader>
      <CardContent className="px-2 pb-2 pt-2">
        {loading ? (
          <Placeholder />
        ) : (
          <ZoomPanChart data={data} yAxisLabel="kWh" xAxisLabel="Region">
            {(slicedData) => (
              <ChartContainer
                config={regionChartConfig}
                className="h-[180px] w-full"
              >
                <BarChart
                  data={slicedData}
                  margin={{ top: 10, right: 5, bottom: 0, left: -15 }}
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
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
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
          </ZoomPanChart>
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
// 4. Energy Trend (Area chart) — legacy wrapper
// ──────────────────────────────────────────────

interface TrendPoint {
  label: string;
  kWh: number;
}

interface MonthlyEnergyUsePoint extends TrendPoint {
  timestamp: string;
}

interface EnergyTrendProps {
  data: TrendPoint[];
  dateRange: DateRange;
  onDateChange: (r: DateRange) => void;
  loading?: boolean;
  showDateFilter?: boolean;
}

export function EnergyTrendChart({
  data,
  dateRange,
  onDateChange,
  loading,
  showDateFilter = true,
}: EnergyTrendProps) {
  return (
    <OverviewTrendChart
      energyData={data}
      voltageData={[]}
      currentData={[]}
      powerData={[]}
      dateRange={dateRange}
      onDateChange={onDateChange}
      loading={loading}
      showDateFilter={showDateFilter}
    />
  );
}

const monthlyEnergyUsageConfig: ChartConfig = {
  kWh: { label: "Energy Use (kWh)", color: "hsl(24, 95%, 53%)" },
};

interface MonthlyEnergyUsageChartProps {
  data: MonthlyEnergyUsePoint[];
  dateRange: DateRange;
  onDateChange: (r: DateRange) => void;
  loading?: boolean;
  showDateFilter?: boolean;
}

export function MonthlyEnergyUsageChart({
  data,
  dateRange,
  onDateChange,
  loading,
  showDateFilter = true,
}: MonthlyEnergyUsageChartProps) {
  const peakBucket = useMemo(() => {
    if (!data.length) return null;
    return data.reduce((peak, point) => (point.kWh > peak.kWh ? point : peak));
  }, [data]);

  const totalKwh = useMemo(
    () => data.reduce((sum, point) => sum + point.kWh, 0),
    [data],
  );

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between pb-1 px-4 pt-3">
        <div>
          <CardTitle className="text-sm font-semibold">
            Monthly Energy Use
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total pemakaian energi (kWh) per periode, dihitung dari SUM gap
            energy_total.
          </p>
        </div>
        {showDateFilter && (
          <ChartDateFilter value={dateRange} onChange={onDateChange} compact />
        )}
      </CardHeader>
      <CardContent className="px-2 pb-2 pt-2">
        {loading ? (
          <Placeholder />
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-xs text-muted-foreground">
            No data
          </div>
        ) : (
          <>
            <ZoomPanChart data={data} yAxisLabel="kWh" xAxisLabel="Periode">
              {(slicedData) => (
                <ChartContainer
                  config={monthlyEnergyUsageConfig}
                  className="h-[200px] w-full"
                >
                  <BarChart
                    data={slicedData}
                    margin={{ top: 10, right: 10, bottom: 0, left: -10 }}
                  >
                    <defs>
                      <linearGradient
                        id="fillMonthlyEnergyUsage"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="hsl(24, 95%, 53%)"
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="100%"
                          stopColor="hsl(24, 95%, 53%)"
                          stopOpacity={0.25}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={45}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="kWh"
                      fill="url(#fillMonthlyEnergyUsage)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </ZoomPanChart>

            <div className="grid grid-cols-2 gap-3 pt-3 px-2">
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Total kWh</p>
                <p className="text-lg font-semibold text-orange-600">
                  {totalKwh.toFixed(2)} kWh
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Peak period</p>
                <p className="text-sm font-semibold text-foreground">
                  {peakBucket ? peakBucket.label : "-"}
                </p>
                <p className="text-xs text-orange-600">
                  {peakBucket ? `${peakBucket.kWh.toFixed(2)} kWh` : "No data"}
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// 4b. Overview Trend Chart (unified – like electricity detail)
// ──────────────────────────────────────────────

type OverviewMetric = "energy" | "power" | "voltage" | "current";

const overviewMetricConfigs: Record<
  OverviewMetric,
  { dataKey: string; color: string; unit: string; name: string }
> = {
  energy: {
    dataKey: "kWh",
    color: "hsl(38, 92%, 50%)",
    unit: "kWh",
    name: "Energy",
  },
  power: {
    dataKey: "value",
    color: "hsl(217, 91%, 60%)",
    unit: "kW",
    name: "Power",
  },
  voltage: {
    dataKey: "value",
    color: "hsl(142, 71%, 45%)",
    unit: "V",
    name: "Voltage",
  },
  current: {
    dataKey: "value",
    color: "hsl(280, 70%, 55%)",
    unit: "A",
    name: "Current",
  },
};

interface TimeSeriesPoint {
  label: string;
  value: number;
}

interface OverviewTrendChartProps {
  energyData: TrendPoint[];
  voltageData: TimeSeriesPoint[];
  currentData: TimeSeriesPoint[];
  powerData: TimeSeriesPoint[];
  dateRange: DateRange;
  onDateChange: (r: DateRange) => void;
  loading?: boolean;
  showDateFilter?: boolean;
}

export function OverviewTrendChart({
  energyData,
  voltageData,
  currentData,
  powerData,
  dateRange,
  onDateChange,
  loading,
  showDateFilter = true,
}: OverviewTrendChartProps) {
  const [metric, setMetric] = useState<OverviewMetric>("energy");
  const cfg = overviewMetricConfigs[metric];

  const chartData = useMemo(() => {
    switch (metric) {
      case "energy":
        return energyData;
      case "power":
        return powerData;
      case "voltage":
        return voltageData;
      case "current":
        return currentData;
    }
  }, [metric, energyData, powerData, voltageData, currentData]);

  const gradientId = `fillOverviewTrend-${metric}`;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between pb-1 px-4 pt-3">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold">Trend</CardTitle>
            <Select
              value={metric}
              onValueChange={(v) => setMetric(v as OverviewMetric)}
            >
              <SelectTrigger className="h-6 w-24 text-xs border-0 bg-muted/50 px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="energy" className="text-xs">
                  kWh
                </SelectItem>
                <SelectItem value="power" className="text-xs">
                  Power
                </SelectItem>
                <SelectItem value="voltage" className="text-xs">
                  Voltage
                </SelectItem>
                <SelectItem value="current" className="text-xs">
                  Current
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Perubahan metrik sesuai waktu. Pilih metrik di dropdown.
          </p>
        </div>
        {showDateFilter && (
          <ChartDateFilter value={dateRange} onChange={onDateChange} compact />
        )}
      </CardHeader>
      <CardContent className="px-2 pb-2 pt-2">
        {loading ? (
          <Placeholder />
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-xs text-muted-foreground">
            No data
          </div>
        ) : (
          <ZoomPanChart
            data={chartData}
            yAxisLabel={cfg.unit}
            xAxisLabel="Waktu"
          >
            {(slicedData) => (
              <ChartContainer
                config={{
                  [cfg.dataKey]: { label: cfg.name, color: cfg.color },
                }}
                className="h-[200px] w-full"
              >
                <AreaChart
                  data={slicedData}
                  margin={{ top: 10, right: 10, bottom: 0, left: -10 }}
                >
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={cfg.color}
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="100%"
                        stopColor={cfg.color}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={45}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey={cfg.dataKey}
                    stroke={cfg.color}
                    strokeWidth={2}
                    fill={`url(#${gradientId})`}
                    dot={false}
                    connectNulls
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </ZoomPanChart>
        )}
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// 5. Peak Hours (Bar - hourly consumption)
// ──────────────────────────────────────────────

const peakHoursConfigKw: ChartConfig = {
  powerKw: { label: "Peak Power (kW)", color: "hsl(199, 89%, 48%)" },
};

const hourlyEnergyConfig: ChartConfig = {
  kWh: { label: "Energy (kWh)", color: "hsl(24, 95%, 53%)" },
};

interface HourlyUsage {
  hour: string;
  powerKw: number;
  samples: number;
}

interface PeakHoursProps {
  data: HourlyUsage[];
  dateRange: DateRange;
  onDateChange: (r: DateRange) => void;
  loading?: boolean;
  showDateFilter?: boolean;
  showDeviceSummary?: boolean;
  totalDevices?: number;
  devicesOnline?: number;
}

interface HourlyEnergyUsage {
  hour: string;
  kWh: number;
  samples: number;
}

interface HourlyEnergyConsumptionProps {
  data: HourlyEnergyUsage[];
  dateRange: DateRange;
  onDateChange: (r: DateRange) => void;
  loading?: boolean;
  showDateFilter?: boolean;
}

export function PeakHoursChart({
  data,
  dateRange,
  onDateChange,
  loading,
  showDateFilter = true,
  showDeviceSummary = true,
  totalDevices = 0,
  devicesOnline = 0,
}: PeakHoursProps) {
  const maxHourData = useMemo(() => {
    if (!data.length) return { hour: "-", kw: 0 };
    const top = data.reduce((best, point) =>
      point.powerKw > best.powerKw ? point : best,
    );
    return { hour: top.hour, kw: top.powerKw };
  }, [data]);

  const avgKw = useMemo(() => {
    if (!data.length) return 0;
    const total = data.reduce((sum, p) => sum + p.powerKw, 0);
    return Number((total / data.length).toFixed(2));
  }, [data]);

  const dateLabel = useMemo(() => {
    const presetLabels: Record<string, string> = {
      today: "Hari ini",
      yesterday: "Kemarin",
      "7d": "7 hari terakhir",
      "30d": "30 hari terakhir",
      all: "Semua data",
    };
    return presetLabels[dateRange.preset] || dateRange.preset;
  }, [dateRange.preset]);

  const customFilterLabel = useMemo(() => {
    if (dateRange.preset !== "custom" || !dateRange.from || !dateRange.to) {
      return null;
    }

    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return null;
    }

    const fmt = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return `${fmt.format(from)} - ${fmt.format(to)} WIB`;
  }, [dateRange.from, dateRange.preset, dateRange.to]);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between pb-1 px-4 pt-3">
        <div>
          <CardTitle className="text-base font-semibold">
            Peak Hourly Power
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Menampilkan nilai daya tertinggi (MAX kW) pada setiap jam.
          </p>
        </div>
        {showDateFilter && (
          <ChartDateFilter value={dateRange} onChange={onDateChange} compact />
        )}
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-2">
        {loading ? (
          <Placeholder />
        ) : (
          <>
            <ZoomPanChart data={data} yAxisLabel="Daya (kW)" xAxisLabel="Jam">
              {(slicedData) => (
                <ChartContainer
                  config={peakHoursConfigKw}
                  className="h-[300px] w-full"
                >
                  <BarChart
                    data={slicedData}
                    margin={{ top: 5, right: 10, bottom: 8, left: -8 }}
                    barCategoryGap="26%"
                  >
                    <defs>
                      <linearGradient
                        id="fillPeakHours"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
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
                      tick={{ fontSize: 9, fontWeight: 500 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      minTickGap={14}
                      tickMargin={4}
                      height={28}
                      tickFormatter={(value) =>
                        `${String(value).replace(":00", "").padStart(2, "0")}.00`
                      }
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={50}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => [
                            `${Number(value).toLocaleString("id-ID", { maximumFractionDigits: 2 })} kW`,
                            "Peak Power",
                          ]}
                        />
                      }
                    />
                    <Bar
                      dataKey="powerKw"
                      fill="url(#fillPeakHours)"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={18}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </ZoomPanChart>

            {/* Detailed Peak Hour Info */}
            <div className="mt-3 pt-3 border-t border-border/50">
              <div
                className={`grid grid-cols-2 gap-4 text-xs ${showDeviceSummary ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}
              >
                <div>
                  <p className="text-muted-foreground mb-1">Peak Hour</p>
                  <p className="font-semibold text-base text-blue-600">
                    {maxHourData.hour !== "-"
                      ? `${maxHourData.hour} - ${String(Number(maxHourData.hour.slice(0, 2)) + 1).padStart(2, "0")}:00`
                      : "-"}
                  </p>
                  <p className="text-muted-foreground">
                    (
                    {maxHourData.kw.toLocaleString("id-ID", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    kW)
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Avg Peak</p>
                  <p className="font-semibold text-base">
                    {avgKw.toLocaleString("id-ID", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    kW/jam
                  </p>
                  <p className="text-muted-foreground">Rata-rata per jam</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Periode</p>
                  <p className="font-semibold text-base">
                    {dateRange.preset === "custom" ? "Custom" : dateLabel}
                  </p>
                  <p className="text-muted-foreground">
                    {customFilterLabel ?? "Filter aktif"}
                  </p>
                </div>
                {showDeviceSummary ? (
                  <div>
                    <p className="text-muted-foreground mb-1">Devices</p>
                    <p className="font-semibold text-base">
                      {totalDevices} device
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        {devicesOnline} online
                      </span>
                      <span className="flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {totalDevices - devicesOnline} offline
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function HourlyEnergyConsumptionChart({
  data,
  dateRange,
  onDateChange,
  loading,
  showDateFilter = true,
}: HourlyEnergyConsumptionProps) {
  const peakHourData = useMemo(() => {
    if (!data.length) return { hour: "-", kWh: 0 };
    const top = data.reduce((best, point) =>
      point.kWh > best.kWh ? point : best,
    );
    return { hour: top.hour, kWh: top.kWh };
  }, [data]);

  const avgKwh = useMemo(() => {
    if (!data.length) return 0;
    const total = data.reduce((sum, p) => sum + p.kWh, 0);
    return Number((total / data.length).toFixed(2));
  }, [data]);

  const formatHourIntervalFromBucket = useCallback((hour: string) => {
    const endHour = Number(hour.slice(0, 2));
    if (!Number.isFinite(endHour)) return hour;
    const startHour = (endHour + 23) % 24;
    return `${String(startHour).padStart(2, "0")}:00 - ${String(endHour).padStart(2, "0")}:00`;
  }, []);

  const plotData = useMemo(
    () =>
      data.map((point) => ({
        ...point,
        hourRange: formatHourIntervalFromBucket(point.hour),
      })),
    [data, formatHourIntervalFromBucket],
  );

  const dateLabel = useMemo(() => {
    const presetLabels: Record<string, string> = {
      today: "Hari ini",
      yesterday: "Kemarin",
      "7d": "7 hari terakhir",
      "30d": "30 hari terakhir",
      all: "Semua data",
    };
    return presetLabels[dateRange.preset] || dateRange.preset;
  }, [dateRange.preset]);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between pb-1 px-4 pt-3">
        <div>
          <CardTitle className="text-base font-semibold">
            Hourly Energy Consumption
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Total konsumsi energi (kWh) pada setiap jam.
          </p>
        </div>
        {showDateFilter && (
          <ChartDateFilter value={dateRange} onChange={onDateChange} compact />
        )}
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-2">
        {loading ? (
          <Placeholder />
        ) : (
          <>
            <ZoomPanChart
              data={plotData}
              yAxisLabel="Energi (kWh)"
              xAxisLabel="Jam"
            >
              {(slicedData) => (
                <ChartContainer
                  config={hourlyEnergyConfig}
                  className="h-[300px] w-full"
                >
                  <BarChart
                    data={slicedData}
                    margin={{ top: 5, right: 10, bottom: 8, left: -8 }}
                    barCategoryGap="26%"
                  >
                    <defs>
                      <linearGradient
                        id="fillHourlyEnergy"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="hsl(24, 95%, 53%)"
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="100%"
                          stopColor="hsl(24, 95%, 53%)"
                          stopOpacity={0.3}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="hourRange"
                      tick={{ fontSize: 9, fontWeight: 500 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      minTickGap={14}
                      tickMargin={4}
                      height={28}
                      tickFormatter={(value) =>
                        String(value).replace(":00 - ", "-")
                      }
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={50}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => [
                            `${Number(value).toLocaleString("id-ID", { maximumFractionDigits: 2 })} kWh`,
                            "Energy Consumption",
                          ]}
                        />
                      }
                    />
                    <Bar
                      dataKey="kWh"
                      fill="url(#fillHourlyEnergy)"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={18}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </ZoomPanChart>

            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-muted-foreground mb-1">
                    Peak Consumption Hour
                  </p>
                  <p className="font-semibold text-base text-orange-600">
                    {peakHourData.hour !== "-"
                      ? formatHourIntervalFromBucket(peakHourData.hour)
                      : "-"}
                  </p>
                  <p className="text-muted-foreground">
                    (
                    {peakHourData.kWh.toLocaleString("id-ID", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    kWh)
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Avg Consumption</p>
                  <p className="font-semibold text-base">
                    {avgKwh.toLocaleString("id-ID", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    kWh/jam
                  </p>
                  <p className="text-muted-foreground">Rata-rata per jam</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Periode</p>
                  <p className="font-semibold text-base">
                    {dateRange.preset === "custom" ? "Custom" : dateLabel}
                  </p>
                  <p className="text-muted-foreground">Filter aktif</p>
                </div>
              </div>
            </div>
          </>
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

interface TotalMetricsChartProps {
  powerData: TimeSeriesPoint[];
  voltageData: TimeSeriesPoint[];
  currentData: TimeSeriesPoint[];
  dateRange: DateRange;
  onDateChange: (r: DateRange) => void;
  loading?: boolean;
  showDateFilter?: boolean;
}

export function TotalMetricsChart({
  powerData,
  voltageData,
  currentData,
  dateRange,
  onDateChange,
  loading,
  showDateFilter = true,
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
      <CardHeader className="flex flex-row items-center justify-between pb-0 px-3 pt-2">
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
        {showDateFilter && (
          <ChartDateFilter value={dateRange} onChange={onDateChange} compact />
        )}
      </CardHeader>
      <CardContent className="px-1 pb-1 pt-1">
        {loading ? (
          <Placeholder />
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[130px] text-[10px] text-muted-foreground">
            No data
          </div>
        ) : (
          <ZoomPanChart
            data={data}
            yAxisLabel={metricConfigs[selectedMetric].unit}
            xAxisLabel="Waktu"
          >
            {(slicedData) => (
              <ChartContainer config={config} className="h-[130px] w-full">
                <AreaChart
                  data={slicedData}
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
                  <YAxis
                    tick={{ fontSize: 8 }}
                    tickLine={false}
                    axisLine={false}
                  />
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
          </ZoomPanChart>
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
  showDateFilter?: boolean;
}

export function OutletComparisonChart({
  data,
  dateRange,
  onDateChange,
  loading,
  showDateFilter = true,
}: OutletComparisonProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between pb-1 px-4 pt-3">
        <div>
          <CardTitle className="text-sm font-semibold">
            Outlet Comparison
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Perbandingan total energi antar outlet.
          </p>
        </div>
        {showDateFilter && (
          <ChartDateFilter value={dateRange} onChange={onDateChange} compact />
        )}
      </CardHeader>
      <CardContent className="px-2 pb-2 pt-2">
        {loading ? (
          <Placeholder />
        ) : (
          <ZoomPanChart data={data} yAxisLabel="kWh" xAxisLabel="Outlet">
            {(slicedData) => (
              <ChartContainer
                config={comparisonConfig}
                className="h-[180px] w-full"
              >
                <BarChart
                  data={slicedData}
                  margin={{ top: 5, right: 5, bottom: 0, left: -15 }}
                >
                  <defs>
                    <linearGradient
                      id="fillComparison"
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
                    dataKey="name"
                    tick={{ fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="kWh"
                    fill="url(#fillComparison)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={24}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </ZoomPanChart>
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
      <CardHeader className="pb-1 px-4 pt-3">
        <CardTitle className="text-sm font-semibold">
          Energy Distribution
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Proporsi energi per region (top 8).
        </p>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-2">
        {loading ? (
          <Placeholder />
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-xs text-muted-foreground">
            No data
          </div>
        ) : (
          <div className="flex flex-col">
            <ChartContainer config={donutConfig} className="h-[160px] w-full">
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
                  innerRadius={40}
                  outerRadius={65}
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
                              className="fill-foreground text-sm font-bold"
                            >
                              {total.toFixed(0)}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 14}
                              className="fill-muted-foreground text-[9px]"
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
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 max-h-[100px] overflow-y-auto">
              {data.map((item, index) => {
                const percent =
                  total > 0 ? ((item.kWh / total) * 100).toFixed(1) : "0";
                return (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{
                        backgroundColor:
                          DONUT_COLORS[index % DONUT_COLORS.length],
                      }}
                    />
                    <span className="text-[10px] text-muted-foreground truncate flex-1">
                      {item.name}
                    </span>
                    <span className="text-[10px] font-semibold text-foreground">
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
    <div className="flex items-center justify-center h-[180px] text-xs text-muted-foreground">
      Loading...
    </div>
  );
}
