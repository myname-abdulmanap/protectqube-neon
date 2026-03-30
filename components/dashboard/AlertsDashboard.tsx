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

type AlertCategoryKey = "critical" | "suspicious" | "health";

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
    key: "suspicious",
    label: "Suspicious Alerts",
    icon: Info,
    iconColor: "text-blue-500",
    cardTone: "bg-blue-500/5 hover:bg-blue-500/10",
    borderTone: "border-blue-500/30",
    textTone: "text-blue-600",
    badgeTone: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  },
  {
    key: "health",
    label: "Health Alerts",
    icon: AlertTriangle,
    iconColor: "text-amber-500",
    cardTone: "bg-amber-500/5 hover:bg-amber-500/10",
    borderTone: "border-amber-500/30",
    textTone: "text-amber-600",
    badgeTone: "bg-amber-500/10 text-amber-600 border-amber-500/30",
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
  if (value === "suspicious" || value === "high") return "Suspicious";
  return "Health";
}

function getAlertCategory(alert: AlertEvent): AlertCategoryKey {
  const severity = String(alert.severity ?? "").toLowerCase();
  const alertType = String(alert.alertType ?? "").toUpperCase();

  if (severity === "critical" || alertType.includes("OVERLOAD")) {
    return "critical";
  }

  if (
    severity === "suspicious" ||
    severity === "high" ||
    alertType.includes("ANOMALY") ||
    alertType.includes("SUSPICIOUS")
  ) {
    return "suspicious";
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

  const handleActionUpdateAll = async (actionKey: string): Promise<boolean> => {
    try {
      const result = await alertEventsApi.bulkUpdateAction({
        actionKey,
        filterActionKey: "open", // only update currently-open alerts
      });
      if (result.success) {
        // Clear all alerts from the active list
        setAlerts([]);
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
    return map;
  }, [severityConfigs]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
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
  }, [alerts, filterOutlet, filterDevice, searchTerm, outletNameByScopeId]);

  const alertsByCategory = useMemo(() => {
    const grouped: Record<AlertCategoryKey, AlertEvent[]> = {
      critical: [],
      suspicious: [],
      health: [],
    };

    filteredAlerts.forEach((alert) => {
      grouped[getAlertCategory(alert)].push(alert);
    });

    return grouped;
  }, [filteredAlerts]);

  const selectedDetail = useMemo(() => {
    if (!selectedAlert) return null;
    return buildAlertDetail(selectedAlert, outletNameByScopeId, minioBucketUrl);
  }, [selectedAlert, outletNameByScopeId, minioBucketUrl]);

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
