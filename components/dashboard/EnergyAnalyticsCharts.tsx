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
          <span className="text-xs text-muted-foreground/70 italic">
            {yAxisLabel}
          </span>
        </div>
      )}
      {xAxisLabel && (
        <span className="absolute bottom-0 right-0 text-xs text-muted-foreground/70 italic z-10 pointer-events-none">
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
            className="text-xs text-primary hover:text-primary/80 bg-muted/50 hover:bg-muted px-1.5 py-0.5 rounded border border-border/50 flex-shrink-0 transition-colors"
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
    <Card className="border-0 shadow-sm py-1.5 gap-1">
      <CardHeader className="flex flex-row items-start justify-between pb-0 px-1.5 pt-1">
        <div>
          <CardTitle className="text-xs font-semibold">
            Energy by Region
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Akumulasi energi per region.
          </p>
        </div>
        {showDateFilter && (
          <ChartDateFilter value={dateRange} onChange={onDateChange} compact />
        )}
      </CardHeader>
      <CardContent className="px-1.5 pb-1 pt-0.5">
        {loading ? (
          <Placeholder />
        ) : (
          <ZoomPanChart data={data} yAxisLabel="kWh" xAxisLabel="Region">
            {(slicedData) => (
              <ChartContainer
                config={regionChartConfig}
                className="h-[120px] w-full"
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
    <Card className="border-0 shadow-sm py-1.5 gap-1">
      <CardHeader className="flex flex-row items-center justify-between pb-0 px-1.5 pt-1">
        <CardTitle className="text-xs font-semibold">Top Outlets</CardTitle>
        <ChartDateFilter value={dateRange} onChange={onDateChange} compact />
      </CardHeader>
      <CardContent className="px-1.5 pb-1 pt-0.5">
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
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10 }}
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
    <Card className="border-0 shadow-sm py-1.5 gap-1">
      <CardHeader className="flex flex-row items-center justify-between pb-0 px-1.5 pt-1">
        <CardTitle className="text-xs font-semibold">Low Outlets</CardTitle>
        <ChartDateFilter value={dateRange} onChange={onDateChange} compact />
      </CardHeader>
      <CardContent className="px-1.5 pb-1 pt-0.5">
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
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10 }}
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
    <Card className="border-0 shadow-sm py-1.5 gap-1">
      <CardHeader className="flex flex-row items-start justify-between pb-0 px-1.5 pt-1">
        <div>
          <CardTitle className="text-xs font-semibold">
            Monthly Energy Use
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Total pemakaian energi (kWh) per periode.
          </p>
        </div>
        {showDateFilter && (
          <ChartDateFilter value={dateRange} onChange={onDateChange} compact />
        )}
      </CardHeader>
      <CardContent className="px-1.5 pb-1 pt-0.5">
        {loading ? (
          <Placeholder />
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[130px] text-xs text-muted-foreground">
            No data
          </div>
        ) : (
          <>
            <ZoomPanChart data={data} yAxisLabel="kWh" xAxisLabel="Periode">
              {(slicedData) => (
                <ChartContainer
                  config={monthlyEnergyUsageConfig}
                  className="h-[130px] w-full"
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

            <div className="grid grid-cols-2 gap-1 pt-1 px-1">
              <div className="rounded border bg-muted/20 p-1.5">
                <p className="text-xs text-muted-foreground">Total kWh</p>
                <p className="text-xs font-semibold text-orange-600">
                  {totalKwh.toFixed(2)} kWh
                </p>
              </div>
              <div className="rounded border bg-muted/20 p-1.5">
                <p className="text-xs text-muted-foreground">Peak period</p>
                <p className="text-xs font-semibold text-foreground">
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
    <Card className="border-0 shadow-sm py-1.5 gap-1">
      <CardHeader className="flex flex-row items-start justify-between pb-0 px-1.5 pt-1">
        <div>
          <div className="flex items-center gap-1">
            <CardTitle className="text-xs font-semibold">Trend</CardTitle>
            <Select
              value={metric}
              onValueChange={(v) => setMetric(v as OverviewMetric)}
            >
              <SelectTrigger className="h-5 w-20 text-xs border-0 bg-muted/50 px-1.5">
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
          <p className="text-xs text-muted-foreground">
            Perubahan metrik sesuai waktu.
          </p>
        </div>
        {showDateFilter && (
          <ChartDateFilter value={dateRange} onChange={onDateChange} compact />
        )}
      </CardHeader>
      <CardContent className="px-1.5 pb-1 pt-0.5">
        {loading ? (
          <Placeholder />
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[130px] text-xs text-muted-foreground">
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
                className="h-[130px] w-full"
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
// 4b. Peak Hours Chart (legacy - used by /dashboard/peak-hours)
// ──────────────────────────────────────────────

const peakHoursConfigKw: ChartConfig = {
  powerKw: { label: "Peak Power (kW)", color: "hsl(199, 89%, 48%)" },
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

  return (
    <Card className="border-0 shadow-sm py-1.5 gap-1">
      <CardHeader className="flex flex-row items-start justify-between pb-0 px-1.5 pt-1">
        <div>
          <CardTitle className="text-xs font-semibold">
            Peak Hourly Power
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            MAX kW pada setiap jam.
          </p>
        </div>
        {showDateFilter && (
          <ChartDateFilter value={dateRange} onChange={onDateChange} compact />
        )}
      </CardHeader>
      <CardContent className="px-1.5 pb-1 pt-0.5">
        {loading ? (
          <Placeholder />
        ) : (
          <>
            <ZoomPanChart data={data} yAxisLabel="Daya (kW)" xAxisLabel="Jam">
              {(slicedData) => (
                <ChartContainer
                  config={peakHoursConfigKw}
                  className="h-[150px] w-full"
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
                      tick={{ fontSize: 10, fontWeight: 500 }}
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

            <div className="mt-1 pt-1 border-t border-border/50">
              <div
                className={`grid grid-cols-2 gap-1 text-xs ${showDeviceSummary ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}
              >
                <div>
                  <p className="text-muted-foreground">Peak Hour</p>
                  <p className="font-semibold text-xs text-blue-600">
                    {maxHourData.hour !== "-"
                      ? `${maxHourData.hour} - ${String((Number(maxHourData.hour.slice(0, 2)) + 1) % 24).padStart(2, "0")}:00`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg Peak</p>
                  <p className="font-semibold text-xs">
                    {avgKw.toLocaleString("id-ID", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    kW/jam
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Periode</p>
                  <p className="font-semibold text-xs">
                    {dateRange.preset === "custom" ? "Custom" : dateLabel}
                  </p>
                </div>
                {showDeviceSummary ? (
                  <div>
                    <p className="text-muted-foreground">Devices</p>
                    <p className="font-semibold text-xs">
                      {totalDevices} device
                    </p>
                    <div className="flex items-center gap-1">
                      <span className="flex items-center gap-0.5">
                        <span className="w-1 h-1 rounded-full bg-green-500" />
                        {devicesOnline}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <span className="w-1 h-1 rounded-full bg-red-500" />
                        {totalDevices - devicesOnline}
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

// ──────────────────────────────────────────────
// 5. Average Hourly Consumption (Bar - avg kWh per hour across all outlets)
// ──────────────────────────────────────────────

const avgHourlyConfig: ChartConfig = {
  kWh: { label: "Avg kWh", color: "hsl(199, 89%, 48%)" },
};

const hourlyEnergyConfig: ChartConfig = {
  kWh: { label: "Energy (kWh)", color: "hsl(24, 95%, 53%)" },
};

interface HourlyEnergyUsage {
  hour: string;
  kWh: number;
  samples: number;
}

interface AvgHourlyConsumptionProps {
  data: HourlyEnergyUsage[];
  dataDays?: number;
  dateRange: DateRange;
  onDateChange: (r: DateRange) => void;
  loading?: boolean;
  showDateFilter?: boolean;
}

interface HourlyEnergyConsumptionProps {
  data: HourlyEnergyUsage[];
  dailyData?: Array<{ label: string; kWh: number }>;
  dateRange: DateRange;
  onDateChange: (r: DateRange) => void;
  loading?: boolean;
  showDateFilter?: boolean;
}

export function AvgHourlyConsumptionChart({
  data,
  dataDays,
  dateRange,
  onDateChange,
  loading,
  showDateFilter = true,
}: AvgHourlyConsumptionProps) {
  const days = useMemo(() => {
    if (dataDays && dataDays >= 1) return dataDays;
    if (!dateRange.from || !dateRange.to) return 1;
    const diff =
      new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime();
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
  }, [dataDays, dateRange.from, dateRange.to]);

  const plotData = useMemo(() => {
    if (!data.length) return [];
    return data.map((point) => ({
      hour: point.hour,
      kWh: Number((point.kWh / days).toFixed(2)),
      isMax: false,
    }));
  }, [data, days]);

  const dataWithMax = useMemo(() => {
    if (!plotData.length) return plotData;
    const maxVal = Math.max(...plotData.map((d) => d.kWh));
    return plotData.map((d) => ({
      ...d,
      isMax: d.kWh === maxVal && maxVal > 0,
    }));
  }, [plotData]);

  const peakInfo = useMemo(() => {
    if (!dataWithMax.length) return { hour: "-", kWh: 0 };
    const top = dataWithMax.reduce((best, p) => (p.kWh > best.kWh ? p : best));
    return { hour: top.hour, kWh: top.kWh };
  }, [dataWithMax]);

  const avgKwh = useMemo(() => {
    if (!dataWithMax.length) return 0;
    const total = dataWithMax.reduce((s, p) => s + p.kWh, 0);
    return Number((total / dataWithMax.length).toFixed(2));
  }, [dataWithMax]);

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
    <Card className="border-0 shadow-sm py-1.5 gap-1">
      <CardHeader className="flex flex-row items-start justify-between pb-0 px-1.5 pt-1">
        <div>
          <CardTitle className="text-xs font-semibold">
            Rata-rata Konsumsi per Jam
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Avg kWh per jam dari semua outlet.
          </p>
        </div>
        {showDateFilter && (
          <ChartDateFilter value={dateRange} onChange={onDateChange} compact />
        )}
      </CardHeader>
      <CardContent className="px-1.5 pb-1 pt-0.5">
        {loading ? (
          <Placeholder />
        ) : (
          <>
            <ZoomPanChart
              data={dataWithMax}
              yAxisLabel="Avg kWh"
              xAxisLabel="Jam"
            >
              {(slicedData) => (
                <ChartContainer
                  config={avgHourlyConfig}
                  className="h-[150px] w-full"
                >
                  <BarChart
                    data={slicedData}
                    margin={{ top: 5, right: 10, bottom: 8, left: -8 }}
                    barCategoryGap="26%"
                  >
                    <defs>
                      <linearGradient
                        id="fillAvgHourly"
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
                      <linearGradient
                        id="fillAvgHourlyPeak"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="hsl(0, 84%, 60%)"
                          stopOpacity={0.95}
                        />
                        <stop
                          offset="100%"
                          stopColor="hsl(0, 84%, 60%)"
                          stopOpacity={0.4}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="hour"
                      tick={{ fontSize: 10, fontWeight: 500 }}
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
                            `${Number(value).toLocaleString("id-ID", { maximumFractionDigits: 2 })} kWh`,
                            "Avg Consumption",
                          ]}
                        />
                      }
                    />
                    <Bar dataKey="kWh" radius={[3, 3, 0, 0]} maxBarSize={18}>
                      {slicedData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.isMax
                              ? "url(#fillAvgHourlyPeak)"
                              : "url(#fillAvgHourly)"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </ZoomPanChart>

            <div className="mt-1 pt-1 border-t border-border/50">
              <div className="grid grid-cols-3 gap-1 text-xs">
                <div>
                  <p className="text-muted-foreground">Peak Hour</p>
                  <p className="font-semibold text-xs text-red-600">
                    {peakInfo.hour !== "-"
                      ? `${peakInfo.hour} - ${String((Number(peakInfo.hour.slice(0, 2)) + 1) % 24).padStart(2, "0")}:00`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg</p>
                  <p className="font-semibold text-xs">
                    {avgKwh.toLocaleString("id-ID", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    kWh/jam
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Periode</p>
                  <p className="font-semibold text-xs">
                    {dateRange.preset === "custom" ? "Custom" : dateLabel}
                  </p>
                </div>
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
  dailyData,
  dateRange,
  onDateChange,
  loading,
  showDateFilter = true,
}: HourlyEnergyConsumptionProps) {
  // Auto-detect: today/yesterday (1 day) → hourly, otherwise → daily
  const isHourly = useMemo(() => {
    if (dateRange.preset === "today" || dateRange.preset === "yesterday")
      return true;
    if (!dateRange.from || !dateRange.to) return false;
    const diff =
      new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime();
    const days = Math.round(diff / (1000 * 60 * 60 * 24));
    return days <= 1;
  }, [dateRange]);

  // ── hourly view data ──
  const formatHourInterval = useCallback((hour: string) => {
    const startHour = Number(hour.slice(0, 2));
    if (!Number.isFinite(startHour)) return hour;
    const endHour = (startHour + 1) % 24;
    return `${String(startHour).padStart(2, "0")}:00 - ${String(endHour).padStart(2, "0")}:00`;
  }, []);

  const hourlyPlotData = useMemo(
    () =>
      data.map((point) => ({
        ...point,
        hourRange: formatHourInterval(point.hour),
      })),
    [data, formatHourInterval],
  );

  const hourlyTotal = useMemo(() => {
    if (!data.length) return 0;
    return Number(data.reduce((s, p) => s + p.kWh, 0).toFixed(2));
  }, [data]);

  const hourlyPeak = useMemo(() => {
    if (!data.length) return { hour: "-", kWh: 0 };
    const top = data.reduce((best, p) => (p.kWh > best.kWh ? p : best));
    return { hour: top.hour, kWh: top.kWh };
  }, [data]);

  // ── daily view data ──
  const dailyPlotData = useMemo(() => {
    if (!dailyData?.length) return [];
    return dailyData.map((d) => ({
      label: d.label,
      kWh: d.kWh,
    }));
  }, [dailyData]);

  const dailyTotal = useMemo(() => {
    if (!dailyPlotData.length) return 0;
    return Number(dailyPlotData.reduce((s, d) => s + d.kWh, 0).toFixed(2));
  }, [dailyPlotData]);

  const dailyAvg = useMemo(() => {
    if (!dailyPlotData.length) return 0;
    return Number((dailyTotal / dailyPlotData.length).toFixed(2));
  }, [dailyPlotData, dailyTotal]);

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
    <Card className="border-0 shadow-sm py-1.5 gap-1">
      <CardHeader className="flex flex-row items-start justify-between pb-0 px-1.5 pt-1">
        <div>
          <CardTitle className="text-xs font-semibold">
            Total Energy Consumption
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {isHourly
              ? "Total konsumsi energi (kWh) per jam."
              : "Total konsumsi energi (kWh) per hari."}
          </p>
        </div>
        {showDateFilter && (
          <ChartDateFilter value={dateRange} onChange={onDateChange} compact />
        )}
      </CardHeader>
      <CardContent className="px-1.5 pb-1 pt-0.5">
        {loading ? (
          <Placeholder />
        ) : isHourly ? (
          <>
            <ZoomPanChart
              data={hourlyPlotData}
              yAxisLabel="Energi (kWh)"
              xAxisLabel="Jam"
            >
              {(slicedData) => (
                <ChartContainer
                  config={hourlyEnergyConfig}
                  className="h-[150px] w-full"
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
                      tick={{ fontSize: 10, fontWeight: 500 }}
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

            <div className="mt-1 pt-1 border-t border-border/50">
              <div className="grid grid-cols-3 gap-1 text-xs">
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-semibold text-xs text-orange-600">
                    {hourlyTotal.toLocaleString("id-ID", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    kWh
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Peak Hour</p>
                  <p className="font-semibold text-xs">
                    {hourlyPeak.hour !== "-"
                      ? formatHourInterval(hourlyPeak.hour)
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Periode</p>
                  <p className="font-semibold text-xs">
                    {dateRange.preset === "custom" ? "Custom" : dateLabel}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <ZoomPanChart
              data={dailyPlotData}
              yAxisLabel="Energi (kWh)"
              xAxisLabel="Tanggal"
            >
              {(slicedData) => (
                <ChartContainer
                  config={hourlyEnergyConfig}
                  className="h-[150px] w-full"
                >
                  <BarChart
                    data={slicedData}
                    margin={{ top: 5, right: 10, bottom: 8, left: -8 }}
                    barCategoryGap="26%"
                  >
                    <defs>
                      <linearGradient
                        id="fillDailyEnergy"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="hsl(142, 71%, 45%)"
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="100%"
                          stopColor="hsl(142, 71%, 45%)"
                          stopOpacity={0.3}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fontWeight: 500 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      minTickGap={14}
                      tickMargin={4}
                      height={28}
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
                            "Daily Energy",
                          ]}
                        />
                      }
                    />
                    <Bar
                      dataKey="kWh"
                      fill="url(#fillDailyEnergy)"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={18}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </ZoomPanChart>

            <div className="mt-1 pt-1 border-t border-border/50">
              <div className="grid grid-cols-3 gap-1 text-xs">
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-semibold text-xs text-green-600">
                    {dailyTotal.toLocaleString("id-ID", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    kWh
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg/hari</p>
                  <p className="font-semibold text-xs">
                    {dailyAvg.toLocaleString("id-ID", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    kWh
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Periode</p>
                  <p className="font-semibold text-xs">
                    {dateRange.preset === "custom" ? "Custom" : dateLabel}
                  </p>
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
    <Card className="border-0 shadow-sm py-1.5 gap-1">
      <CardHeader className="flex flex-row items-center justify-between pb-0 px-1.5 pt-1">
        <div className="flex items-center gap-2">
          <Select
            value={selectedMetric}
            onValueChange={(v) => setSelectedMetric(v as MetricType)}
          >
            <SelectTrigger className="h-6 text-xs w-[130px] border-0 bg-muted/50 px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="power" className="text-xs">
                Total Power (kW)
              </SelectItem>
              <SelectItem value="voltage" className="text-xs">
                Total Voltage (V)
              </SelectItem>
              <SelectItem value="current" className="text-xs">
                Total Current (A)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        {showDateFilter && (
          <ChartDateFilter value={dateRange} onChange={onDateChange} compact />
        )}
      </CardHeader>
      <CardContent className="px-1.5 pb-1 pt-0.5">
        {loading ? (
          <Placeholder />
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[130px] text-xs text-muted-foreground">
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
    <Card className="border-0 shadow-sm py-1.5 gap-1">
      <CardHeader className="flex flex-row items-start justify-between pb-0 px-1.5 pt-1">
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
      <CardContent className="px-1.5 pb-1 pt-0.5">
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
    <Card className="border-0 shadow-sm py-1.5 gap-1">
      <CardHeader className="pb-0 px-1.5 pt-1">
        <CardTitle className="text-xs font-semibold">
          Energy Distribution
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Proporsi energi per region (top 8).
        </p>
      </CardHeader>
      <CardContent className="px-1.5 pb-1 pt-0.5">
        {loading ? (
          <Placeholder />
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[120px] text-xs text-muted-foreground">
            No data
          </div>
        ) : (
          <div className="flex flex-col">
            <ChartContainer config={donutConfig} className="h-[120px] w-full">
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
                              className="fill-muted-foreground text-xs"
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
                  <div key={item.name} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{
                        backgroundColor:
                          DONUT_COLORS[index % DONUT_COLORS.length],
                      }}
                    />
                    <span className="text-xs text-muted-foreground truncate flex-1">
                      {item.name}
                    </span>
                    <span className="text-xs font-semibold text-foreground">
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
    <div className="flex items-center justify-center h-[120px] text-xs text-muted-foreground">
      Loading...
    </div>
  );
}
git 