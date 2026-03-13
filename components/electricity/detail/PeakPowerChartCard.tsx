"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Activity } from "lucide-react";
import type { OutletDetailPayload } from "@/app/dashboard/electricity/[scopeId]/page";

type PeakPoint = {
  key: string;
  label: string;
  value: number;
  fullTimeLabel: string;
};

interface PeakPowerChartCardProps {
  timeSeries: OutletDetailPayload["timeSeries"];
  loadedFrom: string;
  loadedTo: string;
}

const DISPLAY_TIMEZONE = "Asia/Jakarta";
const PER_HOUR_THRESHOLD_MS = 2 * 24 * 60 * 60 * 1000;
const MONTHS_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const getJakartaParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DISPLAY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
  };
};

const buildPeakSeries = (
  rows: OutletDetailPayload["timeSeries"],
  fromIso: string,
  toIso: string,
): PeakPoint[] => {
  if (!fromIso || !toIso) return [];

  const perHour =
    new Date(toIso).getTime() - new Date(fromIso).getTime() <=
    PER_HOUR_THRESHOLD_MS;

  const buckets = new Map<string, { sum: number; count: number }>();

  for (const row of rows) {
    if (row.metricKey !== "power_total") continue;

    const date = new Date(row.timestamp);
    if (Number.isNaN(date.getTime())) continue;

    const parts = getJakartaParts(date);
    const key = perHour
      ? `${parts.year}-${parts.month}-${parts.day} ${parts.hour}`
      : `${parts.year}-${parts.month}-${parts.day}`;

    const normalizedValue =
      Number(row.metricValue) > 1000
        ? Number(row.metricValue) / 1000
        : Number(row.metricValue);

    const current = buckets.get(key) ?? {
      sum: 0,
      count: 0,
    };

    current.sum += Number.isFinite(normalizedValue) ? normalizedValue : 0;
    current.count += 1;

    buckets.set(key, current);
  }

  const fromDate = new Date(fromIso);
  const toDate = new Date(toIso);
  const fromParts = getJakartaParts(fromDate);
  const toParts = getJakartaParts(toDate);
  const spansDays =
    `${fromParts.year}-${fromParts.month}-${fromParts.day}` !==
    `${toParts.year}-${toParts.month}-${toParts.day}`;

  return Array.from(buckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, bucket]) => {
      const avg = bucket.count > 0 ? bucket.sum / bucket.count : 0;
      const [datePart, hourPart] = key.split(" ");
      const [year, month, day] = datePart.split("-").map(Number);
      const dayLabel = `${String(day).padStart(2, "0")} ${MONTHS_ID[month - 1]}`;

      if (perHour) {
        const hour = hourPart ?? "00";
        return {
          key,
          label: spansDays ? `${dayLabel} ${hour}:00` : `${hour}:00`,
          value: Number(avg.toFixed(2)),
          fullTimeLabel: `${String(day).padStart(2, "0")} ${MONTHS_ID[month - 1]} ${year}, ${hour}:00 WIB`,
        };
      }

      return {
        key,
        label: dayLabel,
        value: Number(avg.toFixed(2)),
        fullTimeLabel: `${String(day).padStart(2, "0")} ${MONTHS_ID[month - 1]} ${year} WIB`,
      };
    });
};

export function PeakPowerChartCard({
  timeSeries,
  loadedFrom,
  loadedTo,
}: PeakPowerChartCardProps) {
  const series = useMemo(
    () => buildPeakSeries(timeSeries ?? [], loadedFrom, loadedTo),
    [timeSeries, loadedFrom, loadedTo],
  );

  const peakPoint = useMemo(() => {
    if (!series.length) return null;
    return series.reduce((best, point) =>
      point.value > best.value ? point : best,
    );
  }, [series]);

  const avgPower = useMemo(() => {
    if (!series.length) return 0;
    return Number(
      (
        series.reduce((sum, point) => sum + point.value, 0) / series.length
      ).toFixed(2),
    );
  }, [series]);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="px-5 py-4 pb-1">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5 text-red-500" />
          Peak Power (Filter Aktif)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Patokan peak diambil dari seri power_total yang sama dengan rata-rata trend,
          sudah mengikuti filter waktu.
        </p>
      </CardHeader>

      <CardContent className="px-5 pb-4 pt-2">
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Peak Tertinggi</p>
            <p className="text-base font-semibold text-red-600">
              {peakPoint
                ? `${peakPoint.value.toLocaleString("id-ID", {
                    maximumFractionDigits: 2,
                  })} kW`
                : "-"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {peakPoint?.fullTimeLabel ?? "-"}
            </p>
          </div>

          <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Rata-rata Seri</p>
            <p className="text-base font-semibold">
              {avgPower.toLocaleString("id-ID", { maximumFractionDigits: 2 })}{" "}
              kW
            </p>
            <p className="text-[11px] text-muted-foreground">
              {series.length} titik data
            </p>
          </div>
        </div>

        {series.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">
            No power data for this period
          </div>
        ) : (
          <ChartContainer
            config={{
              value: {
                label: "Power (kW)",
                color: "hsl(0, 84%, 60%)",
              },
            }}
            className="h-56 w-full"
          >
            <AreaChart
              data={series}
              margin={{ top: 8, right: 10, bottom: 0, left: -6 }}
            >
              <defs>
                <linearGradient id="peakPowerFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="hsl(0, 84%, 60%)"
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="100%"
                    stopColor="hsl(0, 84%, 60%)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                opacity={0.25}
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
                width={50}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [
                      `${Number(value).toLocaleString("id-ID", {
                        maximumFractionDigits: 2,
                      })} kW`,
                      "Power",
                    ]}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(0, 84%, 60%)"
                strokeWidth={2.5}
                fill="url(#peakPowerFill)"
                dot={false}
              />
              {peakPoint ? (
                <ReferenceDot
                  x={peakPoint.label}
                  y={peakPoint.value}
                  r={4}
                  fill="hsl(0, 84%, 60%)"
                  stroke="white"
                  strokeWidth={1.5}
                />
              ) : null}
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
