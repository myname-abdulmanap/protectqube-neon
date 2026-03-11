"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartDateFilter,
  type DateRange,
} from "@/components/dashboard/ChartDateFilter";
import { TrendingUp, TrendingDown } from "lucide-react";

interface OutletItem {
  name: string;
  region: string;
  kWh: number;
}

interface OutletListProps {
  data: OutletItem[];
  dateRange: DateRange;
  onDateChange: (r: DateRange) => void;
  loading?: boolean;
}

export function TopOutletsList({
  data,
  dateRange,
  onDateChange,
  loading,
}: OutletListProps) {
  const maxKwh = data.length > 0 ? Math.max(...data.map((d) => d.kWh)) : 1;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-1 px-2 pt-1.5">
        <CardTitle className="text-[10px] font-semibold flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-red-500" />
          Top Outlets
        </CardTitle>
        <ChartDateFilter value={dateRange} onChange={onDateChange} compact />
      </CardHeader>
      <CardContent className="px-2 pb-2 pt-0">
        {loading ? (
          <div className="flex items-center justify-center h-[180px] text-[10px] text-muted-foreground">
            Loading...
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[180px] text-[10px] text-muted-foreground">
            No data
          </div>
        ) : (
          <div className="space-y-1">
            {data.slice(0, 10).map((item, idx) => (
              <div
                key={item.name}
                className="flex items-center gap-2 py-0.5 group hover:bg-muted/50 rounded px-1 -mx-1"
              >
                <span className="text-[9px] font-semibold w-4 text-muted-foreground">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-medium truncate">
                      {item.name}
                    </span>
                    <span className="text-[10px] font-semibold text-red-600 whitespace-nowrap">
                      {item.kWh.toLocaleString("id-ID", {
                        maximumFractionDigits: 1,
                      })}{" "}
                      kWh
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[8px] text-muted-foreground truncate">
                      {item.region}
                    </span>
                    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full transition-all"
                        style={{ width: `${(item.kWh / maxKwh) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function LowOutletsList({
  data,
  dateRange,
  onDateChange,
  loading,
}: OutletListProps) {
  const maxKwh = data.length > 0 ? Math.max(...data.map((d) => d.kWh)) : 1;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-1 px-2 pt-1.5">
        <CardTitle className="text-[10px] font-semibold flex items-center gap-1">
          <TrendingDown className="h-3 w-3 text-green-500" />
          Low Outlets
        </CardTitle>
        <ChartDateFilter value={dateRange} onChange={onDateChange} compact />
      </CardHeader>
      <CardContent className="px-2 pb-2 pt-0">
        {loading ? (
          <div className="flex items-center justify-center h-[180px] text-[10px] text-muted-foreground">
            Loading...
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[180px] text-[10px] text-muted-foreground">
            No data
          </div>
        ) : (
          <div className="space-y-1">
            {data.slice(0, 10).map((item, idx) => (
              <div
                key={item.name}
                className="flex items-center gap-2 py-0.5 group hover:bg-muted/50 rounded px-1 -mx-1"
              >
                <span className="text-[9px] font-semibold w-4 text-muted-foreground">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-medium truncate">
                      {item.name}
                    </span>
                    <span className="text-[10px] font-semibold text-green-600 whitespace-nowrap">
                      {item.kWh.toLocaleString("id-ID", {
                        maximumFractionDigits: 1,
                      })}{" "}
                      kWh
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[8px] text-muted-foreground truncate">
                      {item.region}
                    </span>
                    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all"
                        style={{
                          width: `${maxKwh > 0 ? (item.kWh / maxKwh) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
