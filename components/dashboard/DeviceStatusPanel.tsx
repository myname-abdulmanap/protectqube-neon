"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DeviceStatusItem {
  id: string;
  name: string;
  scopeName: string;
  online: boolean;
  lastSeen: string | null;
}

interface DeviceStatusProps {
  devices: DeviceStatusItem[];
  loading?: boolean;
}

export function DeviceStatus({ devices, loading }: DeviceStatusProps) {
  const onlineCount = devices.filter((d) => d.online).length;
  const offlineCount = devices.length - onlineCount;

  return (
    <Card className="border-0 shadow-sm h-full">
      <CardHeader className="pb-0 px-2 pt-1.5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[11px] font-semibold">
            Device Status
          </CardTitle>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              {onlineCount}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {offlineCount}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-1.5 pt-1">
        {loading ? (
          <div className="flex items-center justify-center h-20 text-[10px] text-muted-foreground">
            Loading...
          </div>
        ) : devices.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-[10px] text-muted-foreground">
            No devices found
          </div>
        ) : (
          <div className="space-y-0.5 max-h-[200px] overflow-y-auto pr-0.5">
            {devices.map((device) => (
              <div
                key={device.id}
                className="flex items-center gap-1.5 rounded px-1.5 py-1 hover:bg-muted/50 transition-colors"
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                    device.online ? "bg-green-500" : "bg-red-500",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium truncate">
                    {device.name}
                  </p>
                  <p className="text-[8px] text-muted-foreground truncate">
                    {device.scopeName}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-[8px] font-medium px-1 py-0.5 rounded-full",
                    device.online
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : "bg-red-500/10 text-red-600 dark:text-red-400",
                  )}
                >
                  {device.online ? "Online" : "Offline"}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
