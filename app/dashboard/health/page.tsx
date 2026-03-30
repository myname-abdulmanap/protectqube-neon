"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  devicesApi,
  scopesApi,
  type DeviceHealth,
  type DeviceHealthHistoryData,
  type DeviceOfflineEvent,
  type Scope,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const statusClassName = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized === "online") {
    return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400";
  }
  return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400";
};

const formatDateTime = (value: string | null): string => {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hours > 0) return `${hours}j ${minutes}m ${secs}d`;
  if (minutes > 0) return `${minutes}m ${secs}d`;
  return `${secs}d`;
}

export default function DeviceHealthPage() {
  const { hasPermission } = useAuth();
  const [rows, setRows] = useState<DeviceHealth[]>([]);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterScope, setFilterScope] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [selectedDevice, setSelectedDevice] = useState<DeviceHealth | null>(
    null,
  );
  const [historyData, setHistoryData] =
    useState<DeviceHealthHistoryData | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const canRead =
    hasPermission("devices:read") || hasPermission("manage_roles");

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [healthRes, scopesRes] = await Promise.all([
        devicesApi.getHealth(filterScope || undefined),
        scopesApi.getAll(),
      ]);

      if (healthRes.success && healthRes.data) {
        setRows(healthRes.data);
      } else {
        setRows([]);
      }

      if (scopesRes.success && scopesRes.data) {
        setScopes(scopesRes.data);
      }
    } catch {
      setError("Failed to load device health data");
    } finally {
      setIsLoading(false);
    }
  }, [filterScope]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (
        filterStatus !== "all" &&
        row.currentStatus.toLowerCase() !== filterStatus
      ) {
        return false;
      }

      if (!q) return true;

      return (
        row.deviceName.toLowerCase().includes(q) ||
        row.scopeName.toLowerCase().includes(q) ||
        row.serialNo.toLowerCase().includes(q) ||
        row.region.toLowerCase().includes(q)
      );
    });
  }, [rows, filterStatus, search]);

  const onlineCount = useMemo(
    () =>
      rows.filter((item) => item.currentStatus.toLowerCase() === "online")
        .length,
    [rows],
  );
  const offlineCount = rows.length - onlineCount;

  const openHistory = useCallback(async (row: DeviceHealth) => {
    try {
      setSelectedDevice(row);
      setHistoryLoading(true);
      setHistoryError(null);
      setHistoryData(null);

      const response = await devicesApi.getHealthHistory(row.deviceId, 200);
      if (response.success && response.data) {
        setHistoryData(response.data);
        return;
      }

      setHistoryError(response.error || "Failed to load device history");
    } catch {
      setHistoryError("Failed to load device history");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const closeHistory = useCallback(() => {
    setSelectedDevice(null);
    setHistoryData(null);
    setHistoryError(null);
    setHistoryLoading(false);
  }, []);

  if (!canRead) {
    return (
      <div className="p-4 text-sm text-muted-foreground">No permission</div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Device Health</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 w-48 pl-6 text-xs"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari device/outlet/serial"
            />
          </div>

          <Select
            value={filterScope || "all"}
            onValueChange={(value) =>
              setFilterScope(value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="All Outlets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Outlets
              </SelectItem>
              {scopes.map((scope) => (
                <SelectItem key={scope.id} value={scope.id} className="text-xs">
                  {scope.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Status
              </SelectItem>
              <SelectItem value="online" className="text-xs">
                Online
              </SelectItem>
              <SelectItem value="offline" className="text-xs">
                Offline
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Device</p>
            <p className="mt-1 text-xl font-semibold">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Online</p>
            <p className="mt-1 text-xl font-semibold text-green-600 dark:text-green-400">
              {onlineCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Offline</p>
            <p className="mt-1 text-xl font-semibold text-red-600 dark:text-red-400">
              {offlineCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Device</TableHead>
                <TableHead className="text-xs">Outlet</TableHead>
                <TableHead className="text-xs">Region</TableHead>
                <TableHead className="text-xs">Status Saat Ini</TableHead>
                <TableHead className="text-xs">Offline Sejak</TableHead>
                <TableHead className="text-xs">Jumlah Offline</TableHead>
                <TableHead className="text-xs">Uptime</TableHead>
                <TableHead className="text-xs">Last Seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-xs text-muted-foreground"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-xs text-muted-foreground"
                  >
                    Tidak ada data health device
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => (
                  <TableRow
                    key={row.deviceId}
                    className="cursor-pointer"
                    onClick={() => {
                      void openHistory(row);
                    }}
                  >
                    <TableCell className="text-xs font-medium">
                      <p>{row.deviceName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {row.serialNo}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs">{row.scopeName}</TableCell>
                    <TableCell className="text-xs">{row.region}</TableCell>
                    <TableCell className="text-xs">
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${statusClassName(row.currentStatus)}`}
                      >
                        {row.currentStatus.toLowerCase() === "online"
                          ? "Online"
                          : "Offline"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(row.offlineSinceAt)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.offlineCount}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.uptime || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(row.lastSeenAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedDevice}
        onOpenChange={(open) => !open && closeHistory()}
      >
        <DialogContent className="max-h-[90vh] sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="text-sm">Riwayat MQTT Device</DialogTitle>
            <DialogDescription className="text-xs">
              {selectedDevice
                ? `${selectedDevice.deviceName} (${selectedDevice.serialNo})`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {historyLoading ? (
            <div className="rounded border px-3 py-2 text-xs text-muted-foreground">
              Loading history...
            </div>
          ) : historyError ? (
            <div className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {historyError}
            </div>
          ) : historyData ? (
            <div className="space-y-3 overflow-y-auto">
              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-4">
                <div className="rounded border p-2">
                  <p className="text-muted-foreground">Status Saat Ini</p>
                  <p className="font-semibold">
                    {historyData.device.currentStatus || "-"}
                  </p>
                </div>
                <div className="rounded border p-2">
                  <p className="text-muted-foreground">Firmware Device</p>
                  <p className="font-semibold">
                    {historyData.device.firmwareVersion || "-"}
                  </p>
                </div>
                <div className="rounded border p-2">
                  <p className="text-muted-foreground">Outlet</p>
                  <p className="font-semibold">
                    {historyData.device.scopeName || "-"}
                  </p>
                </div>
                <div className="rounded border p-2">
                  <p className="text-muted-foreground">Last Seen</p>
                  <p className="font-semibold">
                    {formatDateTime(historyData.device.lastSeenAt)}
                  </p>
                </div>
              </div>

              <div className="rounded border p-3 text-xs">
                <p className="font-semibold mb-2">
                  Riwayat Online / Offline
                  <span className="ml-2 font-normal text-muted-foreground">
                    ({historyData.offlineEvents?.length ?? 0} kejadian offline)
                  </span>
                </p>
                {(historyData.offlineEvents?.length ?? 0) === 0 ? (
                  <p className="text-muted-foreground">
                    Tidak ada kejadian offline terdeteksi.
                  </p>
                ) : (
                  <div className="max-h-40 overflow-auto rounded bg-muted/30 p-2 space-y-1.5">
                    {historyData.offlineEvents.map(
                      (ev: DeviceOfflineEvent, idx: number) => (
                        <div
                          key={`${ev.offlineAt}-${idx}`}
                          className="flex flex-wrap items-start gap-x-3 gap-y-0.5"
                        >
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-500">
                            ↓ Offline {formatDateTime(ev.offlineAt)}
                          </span>
                          {ev.onlineAt ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-600">
                              ↑ Online {formatDateTime(ev.onlineAt)}
                              {ev.durationMs != null && (
                                <span className="text-muted-foreground font-normal">
                                  ({formatDuration(ev.durationMs)})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">
                              masih offline
                            </span>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>

              <div className="max-h-[55vh] overflow-auto rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Waktu</TableHead>
                      <TableHead className="text-xs">Internet</TableHead>
                      <TableHead className="text-xs">Power</TableHead>
                      <TableHead className="text-xs">DVR</TableHead>
                      <TableHead className="text-xs">VPN</TableHead>
                      <TableHead className="text-xs">Inference</TableHead>
                      <TableHead className="text-xs">Firmware</TableHead>
                      <TableHead className="text-xs">CPU%</TableHead>
                      <TableHead className="text-xs">Memory%</TableHead>
                      <TableHead className="text-xs">Disk%</TableHead>
                      <TableHead className="text-xs">Signal</TableHead>
                      <TableHead className="text-xs">Speedtest</TableHead>
                      <TableHead className="text-xs">Uptime</TableHead>
                      <TableHead className="text-xs">Payload</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyData.history.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={13}
                          className="text-center text-xs text-muted-foreground"
                        >
                          Belum ada histori MQTT untuk device ini
                        </TableCell>
                      </TableRow>
                    ) : (
                      historyData.history.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-[11px] text-muted-foreground">
                            {formatDateTime(item.timestamp)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {item.internetStatus || "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {item.powerStatus || "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {item.dvrStatus || "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {item.vpnStatus || "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {item.inferenceStatus || "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {item.firmwareVersion || "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {typeof item.cpuUsage === "number"
                              ? item.cpuUsage.toFixed(1)
                              : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {typeof item.memoryUsagePercent === "number"
                              ? item.memoryUsagePercent.toFixed(1)
                              : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {typeof item.diskUsagePercent === "number"
                              ? item.diskUsagePercent.toFixed(1)
                              : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {typeof item.mobileSignal === "number"
                              ? `${item.mobileSignal}% ${item.mobileQuality || ""}`.trim()
                              : item.mobileQuality || "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {typeof item.downloadMbps === "number" ||
                            typeof item.uploadMbps === "number"
                              ? `D ${typeof item.downloadMbps === "number" ? item.downloadMbps.toFixed(2) : "-"} / U ${typeof item.uploadMbps === "number" ? item.uploadMbps.toFixed(2) : "-"} Mbps`
                              : typeof item.pingMs === "number"
                                ? `Ping ${item.pingMs.toFixed(2)} ms`
                                : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {item.uptime || "-"}
                          </TableCell>
                          <TableCell className="max-w-[320px] text-[11px]">
                            <pre className="max-h-32 overflow-auto rounded bg-muted p-2 text-[10px] leading-4">
                              {JSON.stringify(item.payload, null, 2)}
                            </pre>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
