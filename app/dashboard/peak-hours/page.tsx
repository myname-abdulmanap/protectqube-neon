"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/ui/page-transition";
import { PeakHoursChart } from "@/components/dashboard/EnergyAnalyticsCharts";
import type { DateRange as ChartDateRange } from "@/components/dashboard/ChartDateFilter";
import { useEnergyPeakHours } from "@/lib/use-energy-data";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

const staticDateRange: ChartDateRange = {
  preset: "all",
  from: "",
  to: "",
  label: "Semua Data",
};

export default function PeakHoursPage() {
  const { data, isLoading, error } = useEnergyPeakHours();

  const topHours = useMemo(
    () => (data?.table ?? []).slice(0, 10),
    [data?.table],
  );

  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <PageTransition>
      <motion.div
        className="space-y-4 max-w-7xl mx-auto px-4"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Peak Hours Dashboard</CardTitle>
              <p className="text-sm text-muted-foreground">
                Agregasi rata-rata konsumsi kWh/jam seluruh data (tanpa filter
                tanggal).
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground">Peak Hour</p>
                  <p className="text-xl font-semibold">
                    {data?.summary.peakHour ?? "-"}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground">
                    Peak Consumption
                  </p>
                  <p className="text-xl font-semibold">
                    {(data?.summary.peakPowerKw ?? 0).toLocaleString("id-ID", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    kWh/jam
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground">
                    Avg Consumption
                  </p>
                  <p className="text-xl font-semibold">
                    {(data?.summary.averagePowerKw ?? 0).toLocaleString(
                      "id-ID",
                      {
                        maximumFractionDigits: 2,
                      },
                    )}{" "}
                    kWh/jam
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground">
                    Outlet Terhitung
                  </p>
                  <p className="text-xl font-semibold">
                    {data?.scopeCount ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <PeakHoursChart
            data={data?.chart ?? []}
            dateRange={staticDateRange}
            onDateChange={() => undefined}
            loading={isLoading}
            showDateFilter={false}
            showDeviceSummary={false}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Tabel Peak Hours</CardTitle>
                <Badge variant="secondary">
                  Top {topHours.length} dari 24 jam
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {errorMessage ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  Gagal memuat data: {errorMessage}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14">Rank</TableHead>
                        <TableHead>Hour (WIB)</TableHead>
                        <TableHead className="text-right">
                          Peak Consumption (kWh/jam)
                        </TableHead>
                        <TableHead className="text-right">Samples</TableHead>
                        <TableHead className="text-right">% of Peak</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topHours.map((row) => (
                        <TableRow key={row.hour}>
                          <TableCell className="font-medium">
                            #{row.rank}
                          </TableCell>
                          <TableCell>{row.hour}</TableCell>
                          <TableCell className="text-right">
                            {row.powerKw.toLocaleString("id-ID", {
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.samples.toLocaleString("id-ID")}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.percentOfPeak.toLocaleString("id-ID", {
                              maximumFractionDigits: 2,
                            })}
                            %
                          </TableCell>
                        </TableRow>
                      ))}
                      {!isLoading && topHours.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="py-8 text-center text-muted-foreground"
                          >
                            Tidak ada data peak hours.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </PageTransition>
  );
}
