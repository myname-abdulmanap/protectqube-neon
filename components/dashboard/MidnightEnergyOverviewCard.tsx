"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function MidnightEnergyOverviewCard({
  points,
  loading = false,
  titleSuffix,
}: MidnightEnergyOverviewCardProps) {
  const formatKwh = (value: number) =>
    `${value.toLocaleString("id-ID", {
      maximumFractionDigits: 2,
    })} kWh`;

  const chartData = useMemo(
    () =>
      points.map((point) => ({
        label: point.shortLabel,
        fullDay: point.transitionLabel,
        dateLabel: point.dateLabel,
        value: Number((point.energyKwh ?? 0).toFixed(2)),
        hasData: point.energyKwh !== null,
      })),
    [points],
  );

  const tableData = useMemo(
    () => {
      const weekdayFormatterLong = new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        timeZone: "Asia/Jakarta",
      });
      const weekdayFormatterShortEn = new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        timeZone: "Asia/Jakarta",
      });
      const getDayNameFromKey = (dayKey: string) =>
        weekdayFormatterLong.format(new Date(`${dayKey}T00:00:00+07:00`));
      const getWeekdayEnFromKey = (dayKey: string) =>
        weekdayFormatterShortEn.format(new Date(`${dayKey}T00:00:00+07:00`));

      const rows = points.map((point, index) => {
        const currentEnergy = point.energyKwh;
        const currentWeekday = getWeekdayEnFromKey(point.key);

        if (currentEnergy === null) {
          return {
            ...point,
            consumptionTransitionLabel: point.transitionLabel,
            totalPemakaianKwh: null,
          };
        }

        // Weekend handling: Sabtu-Minggu and Minggu-Senin are merged into Sabtu-Senin.
        // Sunday row is left empty, and Monday uses Saturday as its previous reading.
        if (currentWeekday === "Sun") {
          return {
            ...point,
            consumptionTransitionLabel: point.transitionLabel,
            totalPemakaianKwh: null,
          };
        }

        let previousIndex = index - 1;
        while (previousIndex >= 0 && points[previousIndex]?.energyKwh === null) {
          previousIndex -= 1;
        }

        if (currentWeekday === "Mon") {
          while (
            previousIndex >= 0 &&
            getWeekdayEnFromKey(points[previousIndex].key) === "Sun"
          ) {
            previousIndex -= 1;
            while (previousIndex >= 0 && points[previousIndex]?.energyKwh === null) {
              previousIndex -= 1;
            }
          }
        }

        if (previousIndex < 0) {
          return {
            ...point,
            consumptionTransitionLabel: point.transitionLabel,
            totalPemakaianKwh: null,
          };
        }

        const previousPoint = points[previousIndex];
        const previousEnergy = previousPoint?.energyKwh;

        if (previousEnergy === null || previousEnergy === undefined) {
          return {
            ...point,
            consumptionTransitionLabel: point.transitionLabel,
            totalPemakaianKwh: null,
          };
        }

        return {
          ...point,
          consumptionTransitionLabel: `${getDayNameFromKey(previousPoint.key)} - ${getDayNameFromKey(point.key)}`,
          totalPemakaianKwh: Number((currentEnergy - previousEnergy).toFixed(2)),
        };
      });

      return rows.filter((row) => getWeekdayEnFromKey(row.key) !== "Sun");
    },
    [points],
  );

  const hasAnyData = points.some((point) => point.energyKwh !== null);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="px-4 py-4 pb-1">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-orange-500" />
          Energy 00:00 (7 Hari)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {titleSuffix
            ? `${titleSuffix}. `
            : ""}
          Nilai diambil pada transisi hari jam 00:00 WIB.
        </p>
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-2 space-y-3">
        {loading ? (
          <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
            Memuat data midnight...
          </div>
        ) : !hasAnyData ? (
          <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
            Data jam 00:00 belum tersedia
          </div>
        ) : (
          <ChartContainer
            config={{
              value: {
                label: "Energy (kWh)",
                color: "hsl(24, 95%, 53%)",
              },
            }}
            className="h-48 w-full"
          >
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
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
                width={48}
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
                        return ["Tidak ada data 00:00", `${payload.fullDay}, ${payload.dateLabel}`];
                      }

                      return [
                        formatKwh(Number(value)),
                        `${payload.fullDay}, ${payload.dateLabel}`,
                      ];
                    }}
                  />
                }
              />
              <Bar
                dataKey="value"
                fill="hsl(24, 95%, 53%)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}

        <div className="rounded-md border border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transisi Hari</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">kWh 00:00</TableHead>
                <TableHead className="text-right">Total Pemakaian</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((point) => (
                <TableRow key={point.key}>
                  <TableCell className="font-medium">{point.consumptionTransitionLabel}</TableCell>
                  <TableCell>{point.dateLabel}</TableCell>
                  <TableCell className="text-right">
                    {point.energyKwh === null
                      ? "-"
                      : formatKwh(point.energyKwh)}
                  </TableCell>
                  <TableCell className="text-right">
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
