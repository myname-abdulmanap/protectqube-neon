"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type OverviewMidnightPoint = {
  key: string;
  transitionLabel: string;
  shortLabel: string;
  dateLabel: string;
  energyKwh: number | null;
  contributingOutlets: number;
};

interface MidnightEnergyOverviewCardProps {
  points: OverviewMidnightPoint[];
  breakdownRows?: Array<{
    dayKey: string;
    label: string;
    chartLabel: string;
    kWh: number;
  }>;
  loading?: boolean;
  titleSuffix?: string;
}

const PAGE_SIZE = 7;

export function MidnightEnergyOverviewCard({
  points,
  breakdownRows,
  loading = false,
  titleSuffix,
}: MidnightEnergyOverviewCardProps) {
  const formatKwh = (value: number) =>
    `${value.toLocaleString("id-ID", {
      maximumFractionDigits: 2,
    })} kWh`;

  const fallbackRows = useMemo(() => {
    const dateFormatter = new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });

    const rows: Array<{
      key: string;
      chartLabel: string;
      label: string;
      detail: string;
      kWh: number;
    }> = [];

    for (let i = 1; i < points.length; i += 1) {
      const curr = points[i];
      const prev = points[i - 1];
      if (!curr || !prev) continue;
      if (curr.energyKwh === null || prev.energyKwh === null) continue;

      const delta = Math.max(0, Number((curr.energyKwh - prev.energyKwh).toFixed(2)));
      const prevDate = new Date(`${prev.key}T00:00:00+07:00`);
      rows.push({
        key: prev.key,
        chartLabel: prev.dateLabel,
        label: dateFormatter.format(prevDate),
        detail: prev.transitionLabel,
        kWh: delta,
      });
    }

    return rows;
  }, [points]);

  const sourceRows = useMemo(() => {
    if (breakdownRows !== undefined) {
      return breakdownRows.map((row) => ({
        key: row.dayKey,
        chartLabel: row.chartLabel,
        label: row.label,
        detail: row.label,
        kWh: Number(row.kWh.toFixed(2)),
      }));
    }
    return fallbackRows;
  }, [breakdownRows, fallbackRows]);

  // Pagination: page 0 = newest 7, page 1 = 7 older, etc.
  const totalPages = Math.max(1, Math.ceil(sourceRows.length / PAGE_SIZE));
  const [page, setPage] = useState(0);
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));

  const updatePage = (fn: (prev: number) => number) =>
    setPage((prev) => {
      const next = fn(prev);
      return Math.max(0, Math.min(next, Math.max(0, totalPages - 1)));
    });

  const tableData = useMemo(() => {
    // Slice from the end: page 0 = last 7, page 1 = 7 before that, etc.
    const end = sourceRows.length - currentPage * PAGE_SIZE;
    const start = Math.max(0, end - PAGE_SIZE);
    return sourceRows.slice(start, end);
  }, [sourceRows, currentPage]);

  const canPrev = sourceRows.length - (currentPage + 1) * PAGE_SIZE > 0; // older data exists
  const canNext = currentPage > 0; // newer data exists

  const chartData = useMemo(() => {
    return tableData.map((row, index) => {
      const avg = Number(
        (
          tableData
            .slice(0, index + 1)
            .reduce((sum, item) => sum + item.kWh, 0) /
          (index + 1)
        ).toFixed(2),
      );
      return {
        key: row.key,
        label: row.chartLabel,
        detail: row.detail,
        value: row.kWh,
        movingAvg: avg,
      };
    });
  }, [tableData]);

  const peakKey = useMemo(() => {
    if (!chartData.length) return "";
    return chartData.reduce((best, row) => (row.value > best.value ? row : best))
      .key;
  }, [chartData]);

  const tableTotal = useMemo(
    () =>
      Number(
        tableData
          .reduce((sum, row) => sum + row.kWh, 0)
          .toFixed(2),
      ),
    [tableData],
  );

  const tableAverage = useMemo(() => {
    const validCount = tableData.length;
    if (!validCount) return 0;
    return Number((tableTotal / validCount).toFixed(2));
  }, [tableData, tableTotal]);

  const hasAnyData = tableData.length > 0;

  return (
    <Card className="border border-border/70 shadow-sm py-2 gap-1.5">
      <CardHeader className="px-3 pt-2 pb-0.5 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-semibold flex items-center gap-1">
          <Activity className="h-3 w-3 text-orange-500" />
          Breakdown Penggunaan per Tanggal {titleSuffix && `• ${titleSuffix}`}
        </CardTitle>
        {!loading && sourceRows.length > PAGE_SIZE && (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              disabled={!canPrev}
              onClick={() => updatePage((p) => p + 1)}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {currentPage + 1}/{totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              disabled={!canNext}
              onClick={() => updatePage((p) => p - 1)}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="px-3 pb-2 pt-0.5 space-y-2">
        {!loading && hasAnyData ? (
          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded-md border border-border/60 bg-orange-50/60 px-2 py-1.5">
              <p className="text-[10px] text-muted-foreground">Total Halaman Ini</p>
              <p className="text-xs font-semibold text-orange-700">
                {formatKwh(tableTotal)}
              </p>
            </div>
            <div className="rounded-md border border-border/60 bg-blue-50/60 px-2 py-1.5">
              <p className="text-[10px] text-muted-foreground">Rata-rata Harian</p>
              <p className="text-xs font-semibold text-blue-700">
                {formatKwh(tableAverage)}
              </p>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="h-24 flex items-center justify-center text-xs text-muted-foreground">
            Memuat...
          </div>
        ) : !hasAnyData ? (
          <div className="h-24 flex items-center justify-center text-xs text-muted-foreground">
            Data belum tersedia
          </div>
        ) : (
          <ChartContainer
            config={{
              value: {
                label: "Energy (kWh)",
                color: "hsl(24, 95%, 53%)",
              },
              movingAvg: {
                label: "Trend Rata-rata",
                color: "hsl(199, 89%, 48%)",
              },
            }}
            className="h-44 w-full"
          >
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 10, bottom: 8, left: -6 }}
            >
              <defs>
                <linearGradient id="fillBreakdownBars" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                opacity={0.2}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                minTickGap={14}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={46}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => {
                      const payload = item.payload as {
                        detail: string;
                      };
                      return [formatKwh(Number(value)), payload.detail];
                    }}
                  />
                }
              />
              <ReferenceLine
                y={tableAverage}
                stroke="hsl(199, 89%, 48%)"
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
              />
              <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={24}>
                {chartData.map((row) => (
                  <Cell
                    key={row.key}
                    fill={row.key === peakKey ? "hsl(16, 86%, 45%)" : "url(#fillBreakdownBars)"}
                  />
                ))}
              </Bar>
              <Line
                type="monotone"
                dataKey="movingAvg"
                stroke="hsl(199, 89%, 48%)"
                strokeWidth={2}
                dot={false}
              />
            </BarChart>
          </ChartContainer>
        )}

        <div className="rounded-md border-2 border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="h-7 px-2 py-0 text-xs">Hari</TableHead>
                <TableHead className="h-7 px-2 py-0 text-xs">Tanggal</TableHead>
                <TableHead className="h-7 px-2 py-0 text-xs text-right">
                  Total (kWh)
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((point) => (
                <TableRow key={point.key} className="border-b-0">
                  <TableCell className="px-2 py-1 text-xs font-medium">
                    {point.detail}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs">
                    {point.label}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs text-right">
                    {formatKwh(point.kWh)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
