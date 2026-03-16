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
                        `${Number(value).toLocaleString("id-ID", {
                          maximumFractionDigits: 2,
                        })} kWh`,
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {points.map((point) => (
                <TableRow key={point.key}>
                  <TableCell className="font-medium">{point.transitionLabel}</TableCell>
                  <TableCell>{point.dateLabel}</TableCell>
                  <TableCell className="text-right">
                    {point.energyKwh === null
                      ? "-"
                      : `${point.energyKwh.toLocaleString("id-ID", {
                          maximumFractionDigits: 2,
                        })} kWh`}
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
