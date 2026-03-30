"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  Info,
  AlertTriangle,
  Search,
  MapPin,
  Camera,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  alertEventsApi,
  alertActionsApi,
  energyDashboardApi,
  severityConfigsApi,
  type AlertEvent,
  type AlertAction,
  type SeverityConfig,
} from "@/lib/api";
import { useRealtimeContext } from "@/components/providers/RealtimeProvider";
import { formatDistance, format } from "date-fns";
import {
  AlertDetailDialog,
  type AlertDetailData,
} from "@/components/dashboard/AlertDetailDialog";

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

type AlertCategoryKey = "critical" | "warning" | "health";

interface OutletData {
  scopeId: string;
  scope: {
    name: string;
    region?: string | null;
  };
}

const categorySections: {
  key: AlertCategoryKey;
  label: string;
  icon: typeof ShieldAlert;
  iconColor: string;
  cardTone: string;
  borderTone: string;
  textTone: string;
  badgeTone: string;
}[] = [
  {
    key: "critical",
    label: "Critical Alerts",
    icon: ShieldAlert,
    iconColor: "text-red-500",
    cardTone: "bg-red-500/5 hover:bg-red-500/10",
    borderTone: "border-red-500/30",
    textTone: "text-red-600",
    badgeTone: "bg-red-500/10 text-red-600 border-red-500/30",
  },
  {
    key: "warning",
    label: "Warning Alerts",
    icon: AlertTriangle,
    iconColor: "text-amber-500",
    cardTone: "bg-amber-500/5 hover:bg-amber-500/10",
    borderTone: "border-amber-500/30",
    textTone: "text-amber-600",
    badgeTone: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  },
  {
    key: "health",
    label: "Health Alerts",
    icon: Info,
    iconColor: "text-blue-500",
    cardTone: "bg-blue-500/5 hover:bg-blue-500/10",
    borderTone: "border-blue-500/30",
    textTone: "text-blue-600",
    badgeTone: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  },
];

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
    if (typeof value === "string" && value.trim()) {
      return value;
    }
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
  if (value === "warning" || value === "suspicious" || value === "high")
    return "Warning";
  return "Health";
}

function getAlertCategory(alert: AlertEvent): AlertCategoryKey {
  const severity = String(alert.severity ?? "").toLowerCase();
  const alertType = String(alert.alertType ?? "").toUpperCase();

  // Device health alerts always go to "health" regardless of severity
  if (
    alertType.startsWith("DEVICE_") ||
    alertType === "LOW_VOLTAGE" ||
    alertType === "LOW_SIGNAL"
  ) {
    return "health";
  }

  if (severity === "critical" || alertType.includes("OVERLOAD")) {
    return "critical";
  }

  if (
    severity === "warning" ||
    severity === "suspicious" ||
    severity === "high" ||
    alertType.includes("ANOMALY") ||
    alertType.includes("SUSPICIOUS")
  ) {
    return "warning";
  }

  return "health";
}

function getOutletName(
  alert: AlertEvent,
  outletNameByScopeId: Record<string, string>,
): string {
  return (
    alert.device?.scope?.name ||
    outletNameByScopeId[alert.scopeId] ||
    `Outlet ${alert.scopeId}`
  );
}

function ensureAbsoluteUrl(rawUrl: string, minioBucketUrl: string): string {
  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }

  const base = minioBucketUrl.trim().replace(/\/+$/, "");
  const path = rawUrl.trim().replace(/^\/+/, "");

  if (!base) {
    return rawUrl;
  }

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
    if (typeof value === "string" && value.trim()) {
      candidates.add(value.trim());
    }
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
      if (nestedUrl) {
        candidates.add(nestedUrl);
      }
    }
  }

  return Array.from(candidates);
}

function collectTimeline(
  alert: AlertEvent,
  metadata: Record<string, unknown> | null,
): string[] {
  const timelineEntries: string[] = [];

  // Read backend-maintained historyLog (previous trigger timestamps)
  const historyLog = metadata?.historyLog;
  if (Array.isArray(historyLog)) {
    for (const item of historyLog) {
      const entry = toRecord(item);
      if (!entry) continue;
      const at = readString(entry, ["at", "time", "timestamp"]);
      const desc = readString(entry, ["description", "message", "desc"]);
      if (at) {
        const formatted = format(new Date(at), "PPPpp");
        timelineEntries.push(
          desc ? `${formatted} — ${desc}` : `Triggered at ${formatted}`,
        );
      }
    }
  }

  // Also read legacy timeline array if present
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
      if (timestamp && message) {
        timelineEntries.push(`${timestamp} - ${message}`);
      } else if (message) {
        timelineEntries.push(message);
      }
    }
  }

  // Always show the current (most recent) trigger at the end
  timelineEntries.push(
    `Latest trigger at ${format(new Date(alert.timestamp), "PPPpp")}`,
  );

  if (timelineEntries.length === 1 && alert.createdAt) {
    timelineEntries.push(
      `Recorded at ${format(new Date(alert.createdAt), "PPPpp")}`,
    );
  }

  return timelineEntries;
}

function getOfflineCount(
  alert: AlertEvent,
  metadata: Record<string, unknown> | null,
): number | null {
  const alertType = String(alert.alertType ?? "").toUpperCase();
  if (!alertType.startsWith("DEVICE_")) return null;

  const storedCount = readNumber(metadata, [
    "offlineCount",
    "offline_count",
    "offlineHistoryCount",
    "offline_history_count",
    "totalOfflineCount",
  ]);

  const historyLog = metadata?.historyLog;
  const historyCount = Array.isArray(historyLog) ? historyLog.length : 0;
  const timelineValue = metadata?.timeline;
  const timelineCount = Array.isArray(timelineValue) ? timelineValue.length : 0;

  // For DEVICE_OFFLINE rows, the current row is one additional trigger.
  const derivedFromHistory =
    alertType === "DEVICE_OFFLINE"
      ? historyCount + 1
      : Math.max(historyCount, timelineCount);

  if (storedCount != null && Number.isFinite(storedCount)) {
    return Math.max(Math.floor(storedCount), derivedFromHistory);
  }

  if (derivedFromHistory > 0) return derivedFromHistory;

  return alertType === "DEVICE_OFFLINE" ? 1 : null;
}

function buildAlertDetail(
  alert: AlertEvent,
  outletNameByScopeId: Record<string, string>,
  offlineCountByDevice: Record<string, number>,
  minioBucketUrl: string,
): AlertDetailData {
  const metadata = toRecord(alert.metadata);
  const deviceName =
    alert.device?.name ||
    readString(metadata, ["deviceName", "device_name"]) ||
    "Unknown Device";
  const deviceId = alert.deviceId;
  const outlet =
    readString(metadata, ["outlet", "outletName", "outlet_name", "location"]) ||
    getOutletName(alert, outletNameByScopeId);
  const area =
    readString(metadata, ["area", "zone", "locationName", "location_name"]) ||
    alert.device?.locationName ||
    "-";

  const imageUrls = collectImageUrls(metadata).map((url) =>
    ensureAbsoluteUrl(url, minioBucketUrl),
  );

  const latitude =
    alert.device?.latitude ??
    alert.device?.scope?.latitude ??
    readNumber(metadata, ["lat", "latitude"]) ??
    null;
  const longitude =
    alert.device?.longitude ??
    alert.device?.scope?.longitude ??
    readNumber(metadata, ["lng", "longitude", "lon"]) ??
    null;
  const computedOfflineCount = getOfflineCount(alert, metadata);
  const offlineCount =
    computedOfflineCount ?? offlineCountByDevice[deviceId] ?? null;

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
    offlineCount,
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

export function AlertsDashboard({
  filterOutlet = "all",
  onFilterOutletChange = () => {},
  filterDevice = "all",
  onFilterDeviceChange = () => {},
  searchTerm = "",
  onSearchTermChange = () => {},
}: {
  filterOutlet?: string;
  onFilterOutletChange?: (value: string) => void;
  filterDevice?: string;
  onFilterDeviceChange?: (value: string) => void;
  searchTerm?: string;
  onSearchTermChange?: (value: string) => void;
} = {}) {
  const realtime = useRealtimeContext();
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [outlets, setOutlets] = useState<OutletData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityConfigs, setSeverityConfigs] = useState<SeverityConfig[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertEvent | null>(null);
  const [actions, setActions] = useState<AlertAction[]>([]);

  const minioBucketUrl = process.env.NEXT_PUBLIC_MINIO_BUCKET_URL || "";

  const getApiErrorMessage = (err: unknown, fallback: string): string => {
    if (typeof err === "object" && err !== null) {
      const maybeResponse = (
        err as { response?: { data?: { error?: string; message?: string } } }
      ).response;
      const apiError =
        maybeResponse?.data?.error || maybeResponse?.data?.message;
      if (apiError) return apiError;
    }
    return fallback;
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [outletsRes, alertsRes, actionsRes, severitiesRes] =
          await Promise.all([
            energyDashboardApi.getOutlets(),
            alertEventsApi.getAll({ actionKey: "open", limit: 100 }),
            alertActionsApi.getAll(),
            severityConfigsApi.getAll(),
          ]);

        if (outletsRes.success && outletsRes.data) {
          setOutlets(outletsRes.data);
        }

        if (alertsRes.success && alertsRes.data) {
          setAlerts(alertsRes.data);
        } else {
          setError(alertsRes.error || "Failed to load alerts");
        }

        if (actionsRes.success && actionsRes.data) {
          setActions(actionsRes.data);
        }

        if (severitiesRes.success && severitiesRes.data) {
          setSeverityConfigs(severitiesRes.data);
        }
      } catch (err) {
        setError("Failed to load data");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = realtime.subscribe("alert", (message) => {
      if (message.type === "alert") {
        const alertData = message.data as AlertEvent;
        // Only add if alert has open action (default)
        if (!alertData.action || alertData.action.key === "open") {
          setAlerts((prev) => {
            const filtered = prev.filter((a) => a.id !== alertData.id);
            return [alertData, ...filtered];
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [realtime]);

  const handleActionUpdate = async (
    alertId: string,
    actionKey: string,
  ): Promise<boolean> => {
    try {
      const result = await alertEventsApi.updateAction(alertId, { actionKey });
      if (result.success) {
        // Remove from active alerts list since it's no longer "open"
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
        setSelectedAlert(null);
        return true;
      }
      setError(result.error || "Failed to update alert action");
      return false;
    } catch (err) {
      console.error("Failed to update alert action:", err);
      setError(getApiErrorMessage(err, "Failed to update alert action"));
      return false;
    }
  };

  const handleActionUpdateAll = async (params: {
    actionKey: string;
    alertType?: string;
    moduleType?: string;
  }): Promise<boolean> => {
    const { actionKey, alertType, moduleType } = params;
    try {
      const result = await alertEventsApi.bulkUpdateAction({
        actionKey,
        filterActionKey: "open", // only update currently-open alerts
        alertType,
        moduleType,
      });
      if (result.success) {
        // Remove only alerts that match the same card context.
        setAlerts((prev) =>
          prev.filter((alert) => {
            const matchesAlertType =
              !alertType || alert.alertType === alertType;
            const matchesModuleType =
              !moduleType ||
              String(alert.moduleType || "").toLowerCase() ===
                String(moduleType || "").toLowerCase();

            if (matchesAlertType && matchesModuleType) {
              return false;
            }

            return true;
          }),
        );
        setSelectedAlert(null);
        return true;
      }
      setError(result.error || "Failed to bulk update alerts");
      return false;
    } catch (err) {
      console.error("Failed to bulk update alert actions:", err);
      setError(getApiErrorMessage(err, "Failed to bulk update alert actions"));
      return false;
    }
  };

  const nonDefaultActions = useMemo(() => {
    const activeActions = actions.filter((a) => a.isActive !== false);
    const preferred = activeActions.filter(
      (a) => String(a.key).toLowerCase() !== "open",
    );
    return preferred.length > 0 ? preferred : activeActions;
  }, [actions]);

  const outletNameByScopeId = useMemo(() => {
    const map: Record<string, string> = {};
    outlets.forEach((outlet) => {
      map[outlet.scopeId] = outlet.scope.name;
    });
    return map;
  }, [outlets]);

  const devices = useMemo(() => {
    const uniqueDevices = new Map<
      string,
      { id: string; name: string; status: string; lastSeenAt?: string | null }
    >();

    alerts.forEach((alert) => {
      const existing = uniqueDevices.get(alert.deviceId);
      if (existing) return;
      uniqueDevices.set(alert.deviceId, {
        id: alert.deviceId,
        name: alert.device?.name || `Device ${alert.deviceId}`,
        status: alert.device?.status || "unknown",
        lastSeenAt: alert.device?.lastSeenAt,
      });
    });

    return Array.from(uniqueDevices.values());
  }, [alerts]);

  const outletOptions = useMemo(() => {
    const names = new Set<string>();

    outlets.forEach((outlet) => {
      if (outlet.scope.name) names.add(outlet.scope.name);
    });

    alerts.forEach((alert) => {
      const name = getOutletName(alert, outletNameByScopeId);
      if (name) names.add(name);
    });

    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [alerts, outlets, outletNameByScopeId]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      totalDevices: devices.length,
      activeDevices: devices.filter(
        (d) => d.status === "online" || d.status === "active",
      ).length,
      alertsToday: alerts.filter((a) => {
        const alertDate = new Date(a.timestamp);
        alertDate.setHours(0, 0, 0, 0);
        return alertDate.getTime() === today.getTime();
      }).length,
      allAlerts: alerts.length,
    };
  }, [alerts, devices]);

  const severityColorMap = useMemo(() => {
    const map: Record<string, { color: string; label: string }> = {};
    severityConfigs.forEach((config) => {
      map[config.key] = { color: config.color, label: config.label };
    });
    // Alias unmapped backend severity values to configured keys
    if (!map["high"] && map["warning"]) map["high"] = map["warning"];
    if (!map["medium"] && map["info"]) map["medium"] = map["info"];
    if (!map["low"] && map["info"]) map["low"] = map["info"];
    return map;
  }, [severityConfigs]);

  const dedupedAlerts = useMemo(() => {
    // Group all alerts by deviceId::alertType
    const groups = new Map<string, AlertEvent[]>();
    for (const alert of alerts) {
      const key = `${alert.deviceId}::${alert.alertType}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(alert);
    }

    return Array.from(groups.values()).map((group) => {
      // Sort newest-first; keep the most recent as the displayed alert
      const sorted = [...group].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
      const newest = sorted[0];
      if (sorted.length === 1) return newest;

      // Merge older alerts' timestamps into metadata.historyLog so the timeline is complete
      const existingMeta = toRecord(newest.metadata) ?? {};
      const existingLog: Array<{ at: string; description: string | null }> =
        Array.isArray(existingMeta.historyLog)
          ? (existingMeta.historyLog as Array<{
              at: string;
              description: string | null;
            }>)
          : [];

      // sorted.slice(1) is older-alerts newest-first; reverse → oldest-first for chronological display
      const syntheticEntries = sorted
        .slice(1)
        .reverse()
        .map((a) => ({ at: a.timestamp, description: a.description ?? null }))
        .filter((entry) => !existingLog.some((e) => e.at === entry.at));

      const mergedLog = [...syntheticEntries, ...existingLog];

      return {
        ...newest,
        metadata: { ...existingMeta, historyLog: mergedLog },
      };
    });
  }, [alerts]);

  const offlineCountByDevice = useMemo(() => {
    const map: Record<string, number> = {};
    dedupedAlerts.forEach((alert) => {
      const alertType = String(alert.alertType ?? "").toUpperCase();
      if (alertType !== "DEVICE_OFFLINE") return;
      const count = getOfflineCount(alert, toRecord(alert.metadata));
      if (count == null) return;
      map[alert.deviceId] = Math.max(map[alert.deviceId] ?? 0, count);
    });
    return map;
  }, [dedupedAlerts]);

  const filteredAlerts = useMemo(() => {
    return dedupedAlerts.filter((alert) => {
      const outletName = getOutletName(alert, outletNameByScopeId);
      const area =
        alert.device?.locationName ||
        readString(toRecord(alert.metadata), ["area", "locationName"]) ||
        "";

      const matchesOutlet =
        filterOutlet === "all" || outletName === filterOutlet;
      const matchesDevice =
        filterDevice === "all" || alert.deviceId === filterDevice;
      const matchesSearch =
        searchTerm === "" ||
        alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(alert.alertType)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        alert.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.device?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        outletName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        area.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesOutlet && matchesDevice && matchesSearch;
    });
  }, [
    dedupedAlerts,
    filterOutlet,
    filterDevice,
    searchTerm,
    outletNameByScopeId,
  ]);

  const alertsByCategory = useMemo(() => {
    const grouped: Record<AlertCategoryKey, AlertEvent[]> = {
      critical: [],
      warning: [],
      health: [],
    };

    filteredAlerts.forEach((alert) => {
      grouped[getAlertCategory(alert)].push(alert);
    });

    return grouped;
  }, [filteredAlerts]);

  const selectedDetail = useMemo(() => {
    if (!selectedAlert) return null;
    return buildAlertDetail(
      selectedAlert,
      outletNameByScopeId,
      offlineCountByDevice,
      minioBucketUrl,
    );
  }, [
    selectedAlert,
    outletNameByScopeId,
    offlineCountByDevice,
    minioBucketUrl,
  ]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex h-full flex-col gap-2"
    >
      <motion.div variants={itemVariants} className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="space-y-5 pr-2">
            {isLoading && (
              <div className="text-center py-12 text-muted-foreground text-xs">
                Loading alerts...
              </div>
            )}

            {error && !isLoading && (
              <div className="text-center py-12 text-red-500 text-xs">
                {error}
              </div>
            )}

            {!isLoading &&
              !error &&
              categorySections.map((section) => {
                const sectionAlerts = alertsByCategory[section.key];
                if (sectionAlerts.length === 0) {
                  return null;
                }

                const SectionIcon = section.icon;
                return (
                  <div key={section.key}>
                    <div className="mb-2 flex items-center gap-2">
                      <SectionIcon className={`h-4 w-4 ${section.iconColor}`} />
                      <h3 className="text-sm font-semibold">{section.label}</h3>
                      <Badge
                        variant="outline"
                        className={`h-5 px-2 text-[10px] ${section.badgeTone}`}
                      >
                        {sectionAlerts.length}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                      {sectionAlerts.map((alert) => {
                        const outletName = getOutletName(
                          alert,
                          outletNameByScopeId,
                        );
                        const severityInfo = severityColorMap[alert.severity];
                        const severityBgColor =
                          severityInfo?.color || "#EF4444";
                        const severityTextLabel =
                          severityInfo?.label ||
                          normalizeSeverityLabel(alert.severity);

                        return (
                          <motion.div
                            key={alert.id}
                            whileHover={{ scale: 1.02, y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ duration: 0.16 }}
                            className="cursor-pointer"
                            onClick={() => setSelectedAlert(alert)}
                          >
                            <Card
                              className={`h-full border ${section.borderTone} ${section.cardTone} rounded-lg shadow-sm transition-all`}
                            >
                              <CardContent className="flex h-full min-h-[90px] flex-col gap-1 p-1.5">
                                <div className="flex items-center justify-between">
                                  <p className="line-clamp-1 text-xs font-semibold leading-tight flex-1 min-w-0 mr-1">
                                    {alert.title || alert.alertType}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    style={{
                                      backgroundColor: `${severityBgColor}20`,
                                      borderColor: severityBgColor,
                                      color: severityBgColor,
                                    }}
                                    className="h-4 px-1.5 text-[9px] flex-shrink-0"
                                  >
                                    {severityTextLabel}
                                  </Badge>
                                </div>

                                <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                                  {alert.description || "No detail provided"}
                                </p>

                                <div className="mt-auto space-y-0.5 text-[10px]">
                                  <div className="flex min-w-0 items-center gap-1 text-muted-foreground">
                                    <Camera className="h-2.5 w-2.5 flex-shrink-0" />
                                    <span className="truncate font-medium text-foreground">
                                      {alert.device?.name ||
                                        `Device ${alert.deviceId}`}
                                    </span>
                                  </div>
                                  <div className="flex min-w-0 items-center gap-1 text-muted-foreground">
                                    <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                                    <span className="truncate">
                                      {outletName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                                    <span>
                                      {formatDistance(
                                        new Date(alert.timestamp),
                                        new Date(),
                                        { addSuffix: true },
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

            {!isLoading && !error && filteredAlerts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-xs">
                No alerts match the selected filters
              </div>
            )}
          </div>
        </ScrollArea>
      </motion.div>

      <AlertDetailDialog
        alert={selectedAlert}
        detail={selectedDetail}
        onClose={() => setSelectedAlert(null)}
        getAlertCategory={getAlertCategory}
        actions={nonDefaultActions}
        onActionUpdate={handleActionUpdate}
        onActionUpdateAll={handleActionUpdateAll}
      />
    </motion.div>
  );
}
