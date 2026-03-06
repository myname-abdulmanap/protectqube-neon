"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  MapPin,
  Camera,
  Clock,
  ShieldAlert,
  Info,
  AlertTriangle,
  History,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  alertEventsApi,
  alertActionsApi,
  energyDashboardApi,
  type AlertEvent,
  type AlertAction,
} from "@/lib/api";
import { formatDistance, format } from "date-fns";
import {
  AlertDetailDialog,
  type AlertDetailData,
} from "@/components/dashboard/AlertDetailDialog";

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(
  meta: Record<string, unknown> | null,
  keys: string[],
): string | null {
  if (!meta) return null;
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function readNumber(
  meta: Record<string, unknown> | null,
  keys: string[],
): number | null {
  if (!meta) return null;
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function normalizeSeverityLabel(severity: string): string {
  const value = String(severity).toLowerCase();
  if (value === "critical") return "Critical";
  if (value === "suspicious" || value === "high") return "Suspicious";
  return "Health";
}

function getAlertCategory(
  alert: AlertEvent,
): "critical" | "suspicious" | "health" {
  const severity = String(alert.severity ?? "").toLowerCase();
  const alertType = String(alert.alertType ?? "").toUpperCase();
  if (severity === "critical" || alertType.includes("OVERLOAD"))
    return "critical";
  if (
    severity === "suspicious" ||
    severity === "high" ||
    alertType.includes("ANOMALY") ||
    alertType.includes("SUSPICIOUS")
  )
    return "suspicious";
  return "health";
}

function ensureAbsoluteUrl(rawUrl: string, minioBucketUrl: string): string {
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  const base = minioBucketUrl.trim().replace(/\/+$/, "");
  const path = rawUrl.trim().replace(/^\/+/, "");
  if (!base) return rawUrl;
  return `${base}/${path}`;
}

function collectImageUrls(metadata: Record<string, unknown> | null): string[] {
  if (!metadata) return [];
  const candidates = new Set<string>();
  const stringKeys = [
    "image",
    "imageUrl",
    "image_url",
    "snapshot",
    "snapshotUrl",
    "snapshot_url",
    "photo",
    "thumbnail",
    "frame",
    "frameUrl",
    "frame_url",
    "objectKey",
    "object_key",
    "filePath",
    "file_path",
    "url",
  ];
  for (const key of stringKeys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) candidates.add(value.trim());
  }
  const arrayKeys = ["images", "frames", "snapshots", "evidence", "media"];
  for (const key of arrayKeys) {
    const value = metadata[key];
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (typeof item === "string" && item.trim()) {
        candidates.add(item.trim());
        continue;
      }
      const objectItem = toRecord(item);
      if (!objectItem) continue;
      const nestedUrl = readString(objectItem, [
        "url",
        "image",
        "imageUrl",
        "path",
        "key",
      ]);
      if (nestedUrl) candidates.add(nestedUrl);
    }
  }
  return Array.from(candidates);
}

function collectTimeline(
  alert: AlertEvent,
  metadata: Record<string, unknown> | null,
): string[] {
  const timelineEntries: string[] = [];
  const timelineValue = metadata?.timeline;
  if (Array.isArray(timelineValue)) {
    for (const item of timelineValue) {
      if (typeof item === "string" && item.trim()) {
        timelineEntries.push(item.trim());
        continue;
      }
      const itemRecord = toRecord(item);
      if (!itemRecord) continue;
      const timestamp = readString(itemRecord, ["time", "timestamp", "at"]);
      const message = readString(itemRecord, [
        "description",
        "message",
        "event",
        "title",
      ]);
      if (timestamp && message)
        timelineEntries.push(`${timestamp} - ${message}`);
      else if (message) timelineEntries.push(message);
    }
  }
  if (timelineEntries.length === 0) {
    timelineEntries.push(
      `Alert triggered at ${format(new Date(alert.timestamp), "PPPpp")}`,
    );
    if (alert.createdAt) {
      timelineEntries.push(
        `Recorded at ${format(new Date(alert.createdAt), "PPPpp")}`,
      );
    }
  }
  return timelineEntries;
}

function buildAlertDetail(
  alert: AlertEvent,
  outletNameByScopeId: Record<string, string>,
  minioBucketUrl: string,
): AlertDetailData {
  const metadata = toRecord(alert.metadata);
  const deviceName =
    alert.device?.name ||
    readString(metadata, ["deviceName", "device_name"]) ||
    "Unknown Device";
  const deviceId = alert.deviceId;
  const outletName =
    alert.device?.scope?.name ||
    outletNameByScopeId[alert.scopeId] ||
    `Outlet ${alert.scopeId}`;
  const outlet =
    readString(metadata, ["outlet", "outletName", "outlet_name", "location"]) ||
    outletName;
  const area =
    readString(metadata, ["area", "zone", "locationName", "location_name"]) ||
    alert.device?.locationName ||
    "-";
  const imageUrls = collectImageUrls(metadata).map((url) =>
    ensureAbsoluteUrl(url, minioBucketUrl),
  );
  const latitude =
    alert.device?.scope?.latitude ??
    readNumber(metadata, ["lat", "latitude"]) ??
    null;
  const longitude =
    alert.device?.scope?.longitude ??
    readNumber(metadata, ["lng", "longitude", "lon"]) ??
    null;

  return {
    alertType: alert.title || alert.alertType,
    severityLabel: normalizeSeverityLabel(alert.severity),
    deviceLabel: `${deviceName} (${deviceId})`,
    outletLabel: outlet,
    areaLabel: area,
    timestampLabel: format(new Date(alert.timestamp), "PPPpp"),
    descriptionLabel:
      alert.description ||
      readString(metadata, ["description", "desc", "detail"]) ||
      "No description available",
    timeline: collectTimeline(alert, metadata),
    imageUrls,
    latitude,
    longitude,
    deviceStatus: alert.device?.status || "unknown",
    deviceId,
    deviceName,
    outlet,
    area,
  };
}

const severityStyles: Record<string, string> = {
  critical: "bg-red-500/10 text-red-600 border-red-500/30",
  suspicious: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  health: "bg-amber-500/10 text-amber-600 border-amber-500/30",
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export function AlertHistory() {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [outlets, setOutlets] = useState<
    { scopeId: string; scope: { name: string } }[]
  >([]);
  const [actions, setActions] = useState<AlertAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterAction, setFilterAction] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAlert, setSelectedAlert] = useState<AlertEvent | null>(null);

  const minioBucketUrl = process.env.NEXT_PUBLIC_MINIO_BUCKET_URL || "";

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [outletsRes, alertsRes, actionsRes] = await Promise.all([
        energyDashboardApi.getOutlets(),
        alertEventsApi.getAll({ excludeActionKey: "open", limit: 200 }),
        alertActionsApi.getAll(),
      ]);
      if (outletsRes.success && outletsRes.data) setOutlets(outletsRes.data);
      if (alertsRes.success && alertsRes.data) setAlerts(alertsRes.data);
      else setError(alertsRes.error || "Failed to load alert history");
      if (actionsRes.success && actionsRes.data) setActions(actionsRes.data);
    } catch {
      setError("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const outletNameByScopeId = useMemo(() => {
    const map: Record<string, string> = {};
    outlets.forEach((o) => {
      map[o.scopeId] = o.scope.name;
    });
    return map;
  }, [outlets]);

  const nonOpenActions = useMemo(() => {
    return actions.filter((a) => a.key !== "open" && a.isActive);
  }, [actions]);

  const handleReopen = async (alertId: string) => {
    try {
      const result = await alertEventsApi.updateAction(alertId, {
        actionKey: "open",
      });
      if (result.success) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
        setSelectedAlert(null);
      }
    } catch (err) {
      console.error("Failed to reopen alert:", err);
    }
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const outletName =
        alert.device?.scope?.name || outletNameByScopeId[alert.scopeId] || "";

      const matchesAction =
        filterAction === "all" || alert.action?.key === filterAction;
      const matchesSeverity =
        filterSeverity === "all" || alert.severity === filterSeverity;
      const matchesSearch =
        searchTerm === "" ||
        alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(alert.alertType)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        alert.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.device?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        outletName.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesAction && matchesSeverity && matchesSearch;
    });
  }, [alerts, filterAction, filterSeverity, searchTerm, outletNameByScopeId]);

  const selectedDetail = useMemo(() => {
    if (!selectedAlert) return null;
    return buildAlertDetail(selectedAlert, outletNameByScopeId, minioBucketUrl);
  }, [selectedAlert, outletNameByScopeId, minioBucketUrl]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-3"
    >
      {/* Summary */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <Card className="border-0 shadow-md bg-slate-600 text-white">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <div>
                <p className="text-[10px] text-white/80">Total Riwayat</p>
                <p className="text-lg font-bold">{alerts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {nonOpenActions.map((action) => {
          const count = alerts.filter(
            (a) => a.action?.key === action.key,
          ).length;
          return (
            <Card
              key={action.id}
              className="border-0 shadow-md text-white"
              style={{ backgroundColor: action.color }}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  <div>
                    <p className="text-[10px] text-white/80">{action.label}</p>
                    <p className="text-lg font-bold">{count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                <span className="font-semibold">Filter:</span>
              </div>

              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger size="sm" className="h-7 w-[150px] text-xs">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    Semua Status
                  </SelectItem>
                  {nonOpenActions.map((action) => (
                    <SelectItem
                      key={action.id}
                      value={action.key}
                      className="text-xs"
                    >
                      {action.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger size="sm" className="h-7 w-[130px] text-xs">
                  <SelectValue placeholder="Semua Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    Semua Severity
                  </SelectItem>
                  <SelectItem value="critical" className="text-xs">
                    Critical
                  </SelectItem>
                  <SelectItem value="suspicious" className="text-xs">
                    Suspicious
                  </SelectItem>
                  <SelectItem value="health" className="text-xs">
                    Health
                  </SelectItem>
                </SelectContent>
              </Select>

              <div className="relative flex-1 min-w-[160px] max-w-[240px]">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari alert..."
                  className="h-7 pl-7 text-xs"
                />
              </div>

              <Badge
                variant="outline"
                className="text-[10px] px-2 py-0.5 ml-auto"
              >
                {filteredAlerts.length} / {alerts.length} riwayat
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-340px)]">
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Memuat riwayat alert...
                </div>
              ) : error ? (
                <div className="text-center py-12 text-red-500 text-sm">
                  {error}
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Belum ada riwayat alert
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Alert</TableHead>
                      <TableHead className="text-xs">Device</TableHead>
                      <TableHead className="text-xs">Outlet</TableHead>
                      <TableHead className="text-xs">Severity</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Waktu</TableHead>
                      <TableHead className="text-xs text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAlerts.map((alert) => {
                      const outletName =
                        alert.device?.scope?.name ||
                        outletNameByScopeId[alert.scopeId] ||
                        "-";
                      const category = getAlertCategory(alert);

                      return (
                        <TableRow
                          key={alert.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedAlert(alert)}
                        >
                          <TableCell className="text-xs font-medium max-w-[200px]">
                            <div className="flex items-center gap-2">
                              {category === "critical" ? (
                                <ShieldAlert className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                              ) : category === "suspicious" ? (
                                <Info className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                              ) : (
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                              )}
                              <span className="truncate">
                                {alert.title || alert.alertType}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1">
                              <Camera className="h-3 w-3 text-muted-foreground" />
                              <span className="truncate max-w-[120px]">
                                {alert.device?.name || alert.deviceId}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="truncate max-w-[120px]">
                                {outletName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 ${severityStyles[category]}`}
                            >
                              {normalizeSeverityLabel(alert.severity)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {alert.action ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0"
                                style={{
                                  borderColor: alert.action.color,
                                  color: alert.action.color,
                                }}
                              >
                                {alert.action.label}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistance(
                                new Date(alert.timestamp),
                                new Date(),
                                {
                                  addSuffix: true,
                                },
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleReopen(alert.id);
                              }}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Buka Kembali
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>

      <AlertDetailDialog
        alert={selectedAlert}
        detail={selectedDetail}
        onClose={() => setSelectedAlert(null)}
        getAlertCategory={getAlertCategory}
      />
    </motion.div>
  );
}
