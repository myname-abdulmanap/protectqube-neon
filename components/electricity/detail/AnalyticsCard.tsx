"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import type { OutletDetailPayload } from "@/app/dashboard/electricity/[scopeId]/page";

const COLORS = [
  "#f97316",
  "#3b82f6",
  "#22c55e",
  "#a855f7",
  "#14b8a6",
  "#06b6d4",
  "#eab308",
  "#ec4899",
];

const f = (v: number, d = 2) =>
  Number.isFinite(v)
    ? v.toLocaleString("id-ID", { maximumFractionDigits: d })
    : "-";

const formatTimestamp = (value: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
};

const formatPeakHourRange = (hour: number | null) => {
  if (hour === null || !Number.isFinite(hour)) return "-";
  const start = Math.max(0, Math.min(23, Math.trunc(hour)));
  const end = (start + 1) % 24;
  return `${String(start).padStart(2, "0")}:00 - ${String(end).padStart(2, "0")}:00`;
};

interface AnalyticsCardProps {
  analytics: OutletDetailPayload["analytics"];
  devices: OutletDetailPayload["devices"];
}

function StatRow({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit?: string;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${color ?? ""}`}>
        {value}
        {unit && (
          <span className="text-xs font-normal ml-1 text-muted-foreground">
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}

export function AnalyticsCard({ analytics, devices }: AnalyticsCardProps) {
  const safeDevices = devices;
  const peakHourAvgKwh = Number(
    analytics.peakHourAvgKwh ?? analytics.peakHourAvgKw ?? 0,
  );

  const donutData = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of safeDevices) {
      const key = d.locationName ?? d.locationType ?? "Unknown";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [safeDevices]);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="px-5 py-4 pb-0 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple-500" />
          Analytics
        </CardTitle>
      </CardHeader>

      <CardContent className="p-5 pt-3">
        <div className="mb-4">
          <StatRow
            label="Peak Power (Timestamp)"
            value={f(analytics.peakPowerKw)}
            unit="kW"
            color="text-red-500"
          />
          <p className="-mt-1 mb-2 text-[11px] leading-relaxed   text-muted-foreground">
            Nilai tertinggi dari seri Power yang tampil di chart sesuai filter
            aktif. Waktu puncak: {formatTimestamp(analytics.peakPowerAt)} WIB.
          </p>
          <StatRow
            label="Peak Hour Profile"
            value={formatPeakHourRange(analytics.peakHour)}
            color="text-amber-600"
          />
          <p className="-mt-1 mb-2 text-[11px] leading-relaxed text-muted-foreground">
            Jam rata-rata tertinggi berdasarkan profil per jam selama periode
            aktif. Nilai jam puncak: {f(peakHourAvgKwh)} kWh.
          </p>
          <StatRow
            label="Avg Power"
            value={f(analytics.avgPowerKw)}
            unit="kW"
          />
          <p className="-mt-1 mb-2 text-[11px] leading-relaxed text-muted-foreground">
            Rata-rata nilai Power dari seluruh bucket waktu pada periode aktif.
          </p>
          <StatRow
            label="Avg Voltage"
            value={f(analytics.avgVoltageV, 1)}
            unit="V"
          />
          <p className="-mt-1 mb-2 text-[11px] leading-relaxed text-muted-foreground">
            Rata-rata tegangan fase dari data voltage pada periode aktif.
          </p>
          <StatRow
            label="Avg Current"
            value={f(analytics.avgCurrentA)}
            unit="A"
          />
          <p className="-mt-1 mb-2 text-[11px] leading-relaxed text-muted-foreground">
            Rata-rata arus total dari data current_total pada periode aktif.
          </p>
          <StatRow label="Avg PF" value={f(analytics.avgPfSigma, 3)} />
          <p className="-mt-1 mb-2 text-[11px] leading-relaxed text-muted-foreground">
            Rata-rata power factor sistem pada periode aktif. Nilai mendekati 1
            berarti lebih efisien.
          </p>
          <StatRow
            label="Total Energy"
            value={f(analytics.totalEnergyKwh)}
            unit="kWh"
            color="text-orange-500"
          />
          <p className="-mt-1 mb-2 text-[11px] leading-relaxed text-muted-foreground">
            Total energi kumulatif pada akhir periode aktif, sudah mengikuti
            offset starting point.
          </p>
          <StatRow
            label="Total Reactive"
            value={f(analytics.totalKvarh)}
            unit="kVARh"
          />
          <p className="-mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Akumulasi energi reaktif dari pembacaan kvarh pada periode aktif.
          </p>
          <p className="mt-2 rounded-md bg-muted/40 px-2 py-1 text-[11px] leading-relaxed text-muted-foreground">
            Ringkas: Peak Timestamp untuk deteksi lonjakan sesaat, Peak Hour
            Profile untuk melihat jam operasional paling sibuk.
          </p>
        </div>

        {donutData.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-3">
              Devices
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({safeDevices.length} total)
              </span>
            </p>
            <div className="flex items-center gap-3">
              <ResponsiveContainer width={80} height={80}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={22}
                    outerRadius={36}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                {donutData.map((entry, i) => (
                  <div
                    key={entry.name}
                    className="flex items-center gap-2 min-w-0"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-xs text-muted-foreground truncate flex-1">
                      {entry.name}
                    </span>
                    <span className="text-xs font-bold shrink-0">
                      {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
