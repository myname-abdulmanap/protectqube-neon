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

export type MidnightEnergyPoint = {
  key: string;
  transitionLabel: string;
  shortLabel: string;
  dateLabel: string;
  energyKwh: number | null;
};

interface MidnightEnergy7DaysCardProps {
  points: MidnightEnergyPoint[];
  loading?: boolean;
}

export function MidnightEnergy7DaysCard({
  points,
  loading = false,
}: MidnightEnergy7DaysCardProps) {
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

  const tableData = useMemo(() => {
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
          while (
            previousIndex >= 0 &&
            points[previousIndex]?.energyKwh === null
          ) {
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
  }, [points]);

  const hasAnyData = points.some((point) => point.energyKwh !== null);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="px-5 py-4 pb-1">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5 text-orange-500" />
          Energy Total 00:00 (7 Hari Terakhir)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Menampilkan nilai kWh pada transisi hari di jam 00:00 WIB.
        </p>
      </CardHeader>

      <CardContent className="px-5 pb-4 pt-2 space-y-4">
        {loading ? (
          <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">
            Memuat data 7 hari terakhir...
          </div>
        ) : !hasAnyData ? (
          <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">
            Data jam 00:00 belum tersedia untuk 7 hari terakhir
          </div>
        ) : (
          <ChartContainer
            config={{
              value: {
                label: "Energy (kWh)",
                color: "hsl(24, 95%, 53%)",
              },
            }}
            className="h-52 w-full"
          >
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
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
                        return [
                          "Tidak ada data 00:00",
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
                <TableHead className="text-right">Energy 00:00</TableHead>
                <TableHead className="text-right">Total Pemakaian</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((point) => (
                <TableRow key={point.key}>
                  <TableCell className="font-medium">
                    {point.consumptionTransitionLabel}
                  </TableCell>
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
