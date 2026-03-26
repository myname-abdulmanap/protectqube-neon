"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  TrendingUp,
  BarChart2,
  CalendarDays,
  Zap,
  BarChart3,
} from "lucide-react";
import { energyDashboardApi } from "@/lib/api";
import type { HourlyDailyEnergyDay } from "@/lib/api";

interface HourlyEnergyCardProps {
  scopeId: string;
}

const DAYS_PER_PAGE = 6;
const DISPLAY_TIMEZONE = "Asia/Jakarta";
const CALIBRATION_OVERRIDE_SCOPE_ID = "cmmio2wjf0lyprk01sgkquky3";
const CALIBRATION_OVERRIDE_DAY_KEY = "2026-03-18";

function buildPageRange(pageOffset: number): {
  from: string;
  to: string;
  label: string;
} {
  const now = new Date();
  const todayWibStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: DISPLAY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const todayWib = new Date(`${todayWibStr}T00:00:00+07:00`);

  const toDay = new Date(
    todayWib.getTime() - pageOffset * DAYS_PER_PAGE * 24 * 60 * 60 * 1000,
  );
  const fromDay = new Date(
    toDay.getTime() - (DAYS_PER_PAGE - 1) * 24 * 60 * 60 * 1000,
  );

  const fmt = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    timeZone: DISPLAY_TIMEZONE,
  });
  const label = `${fmt.format(fromDay)} – ${fmt.format(toDay)}`;

  const toDayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: DISPLAY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(toDay);
  const fromDayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: DISPLAY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fromDay);

  const from = new Date(`${fromDayStr}T00:00:00+07:00`).toISOString();
  const to = new Date(`${toDayStr}T23:59:59+07:00`).toISOString();

  return { from, to, label };
}

function fmtY(v: number): string {
  if (v === 0) return "0";
  if (v >= 100) return String(Math.round(v));
  if (v >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

function niceYTicks(maxVal: number): { ticks: number[]; yMax: number } {
  if (maxVal <= 0) return { ticks: [0, 1, 2, 3, 4, 5], yMax: 5 };
  const targetTicks = 6;
  const rawStep = maxVal / targetTicks;
  const niceSteps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
  let step = niceSteps.find((s) => s >= rawStep);
  if (!step) step = niceSteps[niceSteps.length - 1];
  const yMax = Math.ceil(maxVal / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= yMax + step / 2; v += step) {
    ticks.push(Number(v.toFixed(3)));
  }
  return { ticks, yMax };
}

function HourBarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: { hasData: boolean; isCalibrationData?: boolean };
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const val = Number(payload[0].value);
  const hasData = payload[0].payload.hasData;
  const isCalibrationData = payload[0].payload.isCalibrationData === true;
  return (
    <div className="rounded-md border border-border/50 bg-background shadow-xl overflow-hidden min-w-36">
      <div
        className={`${isCalibrationData ? "bg-red-500" : "bg-violet-500"} px-3 py-1.5`}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-100">
          {label}
        </p>
      </div>
      <div className="px-3 py-2.5">
        {!hasData ? (
          <p className="text-xs text-muted-foreground">Tidak ada data</p>
        ) : (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tabular-nums text-foreground">
                {val.toLocaleString("id-ID", { maximumFractionDigits: 3 })}
              </span>
              <span className="text-sm font-semibold text-muted-foreground">
                kWh
              </span>
            </div>
            {isCalibrationData && (
              <p className="mt-1 text-[10px] font-semibold text-red-500">
                Kalibrasi Data (PLN)
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const KWH_LABEL_W = 6;

function DayChart({
  day,
  scopeId,
}: {
  day: HourlyDailyEnergyDay;
  scopeId: string;
}) {
  const isCalibrationDay =
    scopeId === CALIBRATION_OVERRIDE_SCOPE_ID &&
    day.date === CALIBRATION_OVERRIDE_DAY_KEY;
  const chartData = day.hours.map((h) => ({
    label: h.label,
    value: h.energyKwh,
    hasData: h.hasData,
    isPeak: h.hour === day.peakHour,
    isCalibrationData: isCalibrationDay,
  }));

  const maxVal = Math.max(...day.hours.map((h) => h.energyKwh), 0.001);
  const { ticks, yMax } = niceYTicks(maxVal);
  const widestTick = ticks
    .map(fmtY)
    .reduce((a, b) => (a.length >= b.length ? a : b), "");
  const tickW = Math.max(20, widestTick.length * 4 + 2);
  const leftMargin = KWH_LABEL_W + tickW;

  return (
    <Card className="border border-border/50 bg-card/60 gap-0 py-0">
      <CardHeader className="px-4 pt-4 pb-1 gap-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold leading-tight">{day.weekday}</p>
            <p className="text-xs text-muted-foreground">{day.label}</p>
            {isCalibrationDay && (
              <p className="text-[10px] font-semibold text-red-500">
                Kalibrasi Data (PLN)
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm font-bold tabular-nums text-violet-600 dark:text-violet-400">
              {day.totalKwh.toLocaleString("id-ID", {
                maximumFractionDigits: 3,
              })}{" "}
              kWh
            </p>
            {day.peakHour !== null && (
              <p className="text-[10px] text-muted-foreground">
                Peak {String(day.peakHour).padStart(2, "0")}:00
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-2 pb-3 pt-1">
        <ResponsiveContainer width="100%" height={115}>
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 4, bottom: 0, left: leftMargin }}
            barSize={5}
          >
            <CartesianGrid
              strokeDasharray="2 2"
              vertical={false}
              opacity={0.15}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              interval={1}
              tickMargin={3}
              tickFormatter={(v: string) => {
                const h = parseInt(v.split(":")[0] ?? "0", 10);
                return h % 2 === 0 ? String(h).padStart(2, "0") : "";
              }}
            />
            <YAxis
              domain={[0, yMax]}
              ticks={ticks}
              width={tickW}
              tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickMargin={2}
              tickFormatter={fmtY}
              label={{
                value: "kWh",
                angle: -90,
                position: "insideLeft",
                dx: -(tickW + KWH_LABEL_W / 2),
                style: {
                  fontSize: 8,
                  fontWeight: 700,
                  fill: "hsl(var(--muted-foreground))",
                  textAnchor: "middle",
                },
              }}
            />
            <Tooltip content={<HourBarTooltip />} />
            <Bar dataKey="value" radius={[3, 3, 0, 0]}>
              {chartData.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={
                    entry.isCalibrationData
                      ? entry.isPeak
                        ? "#dc2626"
                        : entry.hasData
                          ? entry.value >= maxVal * 0.7
                            ? "#ef4444"
                            : "#fca5a5"
                          : "hsl(var(--muted))"
                      : entry.isPeak
                        ? "#7c3aed"
                        : entry.hasData
                          ? entry.value >= maxVal * 0.7
                            ? "#a78bfa"
                            : "#c4b5fd"
                          : "hsl(var(--muted))"
                  }
                  opacity={entry.hasData ? 1 : 0.3}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface PeriodStats {
  peakHourLabel: string | null;
  avgDailyKwh: number;
  totalKwh: number;
  busiestDay: HourlyDailyEnergyDay | null;
  quietestDay: HourlyDailyEnergyDay | null;
}

function derivePeriodStats(
  days: HourlyDailyEnergyDay[],
  metaPeakHourLabel: string | null,
  metaAvgDailyKwh: number,
): PeriodStats {
  const daysWithData = days.filter((d) => d.totalKwh > 0);
  const busiestDay = daysWithData.length
    ? daysWithData.reduce((best, d) => (d.totalKwh > best.totalKwh ? d : best))
    : null;
  const quietestDay =
    daysWithData.length > 1
      ? daysWithData.reduce((low, d) => (d.totalKwh < low.totalKwh ? d : low))
      : null;
  const totalKwh = days.reduce((s, d) => s + d.totalKwh, 0);
  return {
    peakHourLabel: metaPeakHourLabel,
    avgDailyKwh: metaAvgDailyKwh,
    totalKwh,
    busiestDay,
    quietestDay,
  };
}

function MetaStat({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className={`p-1.5 rounded-full shrink-0 mt-0.5 ${iconBg}`}>
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide leading-none mb-0.5">
          {label}
        </p>
        <p className="text-sm font-bold leading-tight">{value}</p>
        {sub && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  );
}

export function HourlyEnergyCard({ scopeId }: HourlyEnergyCardProps) {
  const [pageOffset, setPageOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<HourlyDailyEnergyDay[]>([]);
  const [meta, setMeta] = useState<{
    peakHour: number | null;
    peakHourLabel: string | null;
    avgDailyKwh: number;
  } | null>(null);
  const [currentPageHasData, setCurrentPageHasData] = useState(true);

  const range = useMemo(() => buildPageRange(pageOffset), [pageOffset]);

  const fetchData = useCallback(
    async (offset: number) => {
      setLoading(true);
      try {
        const r = buildPageRange(offset);
        const res = await energyDashboardApi.getHourlyDailyEnergy(
          scopeId,
          r.from,
          r.to,
        );
        if (res.success && res.data) {
          setDays(res.data.days);
          setMeta(res.data.meta);
          setCurrentPageHasData(res.data.days.some((d) => d.totalKwh > 0));
        } else {
          setDays([]);
          setMeta(null);
          setCurrentPageHasData(false);
        }
      } catch {
        setDays([]);
        setMeta(null);
        setCurrentPageHasData(false);
      } finally {
        setLoading(false);
      }
    },
    [scopeId],
  );

  useEffect(() => {
    void fetchData(pageOffset);
  }, [fetchData, pageOffset]);

  useEffect(() => {
    if (pageOffset !== 0) return;
    const id = setInterval(() => void fetchData(0), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchData, pageOffset]);

  const canGoForward = pageOffset > 0;
  const canGoBack = useMemo(() => {
    if (!currentPageHasData) return false;
    const earliestDay = days[0];
    if (!earliestDay) return false;
    return earliestDay.totalKwh > 0;
  }, [currentPageHasData, days]);

  const stats = useMemo(
    () =>
      derivePeriodStats(
        days,
        meta?.peakHourLabel ?? null,
        meta?.avgDailyKwh ?? 0,
      ),
    [days, meta],
  );

  return (
    <Card className="border border-border/60 shadow-sm h-full gap-0 py-0 flex flex-col">
      <CardHeader className="px-5 pt-5 pb-0 gap-0 shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-violet-500" />
            <CardTitle className="text-lg font-bold">
              Hourly Energy Consumption
            </CardTitle>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 gap-1 cursor-pointer disabled:cursor-not-allowed"
              onClick={() => setPageOffset((p) => p + 1)}
              disabled={!canGoBack || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground min-w-max text-center font-medium">
              {range.label}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 gap-1 cursor-pointer disabled:cursor-not-allowed"
              onClick={() => setPageOffset((p) => Math.max(0, p - 1))}
              disabled={!canGoForward || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 pt-4 flex flex-col flex-1 gap-4">
        {meta && !loading && (
          <div className="flex flex-wrap items-start gap-x-5 gap-y-4">
            {stats.peakHourLabel && (
              <MetaStat
                icon={Clock}
                iconBg="bg-violet-500/10"
                iconColor="text-violet-500"
                label="Jam Paling Sibuk"
                value={`${stats.peakHourLabel} WIB`}
                sub="Rata-rata konsumsi tertinggi"
              />
            )}
            <MetaStat
              icon={TrendingUp}
              iconBg="bg-indigo-500/10"
              iconColor="text-indigo-500"
              label="Rata-rata Per Hari"
              value={`${stats.avgDailyKwh.toLocaleString("id-ID", { maximumFractionDigits: 3 })} kWh`}
              sub="Rata-rata harian periode ini"
            />
            <MetaStat
              icon={BarChart3}
              iconBg="bg-emerald-500/10"
              iconColor="text-emerald-500"
              label="Total Periode Ini"
              value={`${stats.totalKwh.toLocaleString("id-ID", { maximumFractionDigits: 3 })} kWh`}
              sub={`Selama ${days.filter((d) => d.totalKwh > 0).length} hari`}
            />
            {stats.busiestDay && (
              <MetaStat
                icon={CalendarDays}
                iconBg="bg-rose-500/10"
                iconColor="text-rose-500"
                label="Hari Paling Sibuk"
                value={`${stats.busiestDay.weekday}, ${stats.busiestDay.label}`}
                sub={`${stats.busiestDay.totalKwh.toLocaleString("id-ID", { maximumFractionDigits: 3 })} kWh`}
              />
            )}
            {stats.quietestDay && (
              <MetaStat
                icon={Zap}
                iconBg="bg-amber-500/10"
                iconColor="text-amber-500"
                label="Konsumsi Paling Rendah"
                value={`${stats.quietestDay.weekday}, ${stats.quietestDay.label}`}
                sub={`${stats.quietestDay.totalKwh.toLocaleString("id-ID", { maximumFractionDigits: 3 })} kWh`}
              />
            )}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl bg-muted/30 animate-pulse h-48"
              />
            ))}
          </div>
        ) : days.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
            Tidak ada data untuk periode ini
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {days.map((day) => (
              <DayChart key={day.date} day={day} scopeId={scopeId} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
