"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
  loading?: boolean;
  titleSuffix?: string;
}

const PAGE_SIZE = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export function MidnightEnergyOverviewCard({
  points,
  loading = false,
  titleSuffix,
}: MidnightEnergyOverviewCardProps) {
  const formatKwh = (value: number) =>
    `${value.toLocaleString("id-ID", {
      maximumFractionDigits: 2,
    })} kWh`;

  // Build full consumption rows from all points
  const allRows = useMemo(() => {
    const weekdayFormatterLong = new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      timeZone: "Asia/Jakarta",
    });
    const dateFormatterShort = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      timeZone: "Asia/Jakarta",
    });

    return points.map((point, index) => {
      const currentEnergy = point.energyKwh;
      const currentDay = new Date(`${point.key}T00:00:00+07:00`);
      const prevDay = new Date(currentDay.getTime() - DAY_MS);
      const defaultDateRangeLabel = `${dateFormatterShort.format(prevDay)} - ${dateFormatterShort.format(currentDay)}`;

      if (currentEnergy === null) {
        return {
          ...point,
          consumptionTransitionLabel: point.transitionLabel,
          dateRangeLabel: defaultDateRangeLabel,
          totalPemakaianKwh: null,
        };
      }

      let previousIndex = index - 1;
      while (previousIndex >= 0 && points[previousIndex]?.energyKwh === null) {
        previousIndex -= 1;
      }

      if (previousIndex < 0) {
        // First data point — starting reference, show 0
        return {
          ...point,
          consumptionTransitionLabel: point.transitionLabel,
          dateRangeLabel: defaultDateRangeLabel,
          totalPemakaianKwh: 0,
        };
      }

      const previousPoint = points[previousIndex];
      const previousEnergy = previousPoint?.energyKwh;

      if (previousEnergy === null || previousEnergy === undefined) {
        return {
          ...point,
          consumptionTransitionLabel: point.transitionLabel,
          dateRangeLabel: defaultDateRangeLabel,
          totalPemakaianKwh: 0,
        };
      }

      const prevDate = new Date(`${previousPoint.key}T00:00:00+07:00`);
      return {
        ...point,
        consumptionTransitionLabel: `${weekdayFormatterLong.format(prevDate)} - ${weekdayFormatterLong.format(currentDay)}`,
        dateRangeLabel: `${dateFormatterShort.format(prevDate)} - ${dateFormatterShort.format(currentDay)}`,
        totalPemakaianKwh: Number((currentEnergy - previousEnergy).toFixed(2)),
      };
    });
  }, [points]);

  // Only keep rows that have actual midnight readings
  const visibleRows = useMemo(
    () => allRows.filter((r) => r.energyKwh !== null),
    [allRows],
  );

  // Pagination: page 0 = newest 7, page 1 = 7 older, etc.
  const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  // Key resets page to 0 whenever the underlying data length changes
  const [pageState, setPage] = useState<{ key: number; page: number }>({
    key: visibleRows.length,
    page: 0,
  });
  const page = pageState.key === visibleRows.length ? pageState.page : 0;
  const updatePage = (fn: (prev: number) => number) =>
    setPage((s) => ({
      key: visibleRows.length,
      page: fn(s.key === visibleRows.length ? s.page : 0),
    }));

  const tableData = useMemo(() => {
    // Slice from the end: page 0 = last 7, page 1 = 7 before that, etc.
    const end = visibleRows.length - page * PAGE_SIZE;
    const start = Math.max(0, end - PAGE_SIZE);
    return visibleRows.slice(start, end);
  }, [visibleRows, page]);

  const canPrev = visibleRows.length - (page + 1) * PAGE_SIZE > 0; // older data exists
  const canNext = page > 0; // newer data exists

  const chartData = useMemo(
    () =>
      tableData.map((point) => ({
        label: point.shortLabel,
        fullDay: point.transitionLabel,
        dateLabel: point.dateLabel,
        value: Number((point.totalPemakaianKwh ?? 0).toFixed(2)),
        hasData: point.totalPemakaianKwh !== null,
      })),
    [tableData],
  );

  const hasAnyData = tableData.some(
    (point) => point.totalPemakaianKwh !== null,
  );

  return (
    <Card className="border border-border/70 shadow-sm py-2 gap-1.5">
      <CardHeader className="px-3 pt-2 pb-0.5 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-semibold flex items-center gap-1">
          <Activity className="h-3 w-3 text-orange-500" />
          Energy 00:00 {titleSuffix && `• ${titleSuffix}`}
        </CardTitle>
        {!loading && visibleRows.length > PAGE_SIZE && (
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
              {page + 1}/{totalPages}
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
            }}
            className="h-36 w-full"
          >
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, bottom: 4, left: -6 }}
            >
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
                        hasData: boolean;
                        fullDay: string;
                        dateLabel: string;
                      };

                      if (!payload.hasData) {
                        return [
                          "Tidak ada data",
                          `${payload.fullDay}, ${payload.dateLabel}`,
                        ];
                      }

                      return [
                        formatKwh(Number(value)),
                        `${payload.fullDay}, ${payload.dateLabel}`,
                      ];
                    }}
                  />
                }
              />
              <Bar dataKey="value" fill="hsl(24, 95%, 53%)" radius={[4, 4, 0, 0]} />
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
                    {point.consumptionTransitionLabel}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs">
                    {point.dateRangeLabel}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs text-right">
                    {point.totalPemakaianKwh === null
                      ? "-"
                      : formatKwh(point.totalPemakaianKwh)}
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
