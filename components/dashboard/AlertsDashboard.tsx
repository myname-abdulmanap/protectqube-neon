"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Monitor,
  Wifi,
  Bell,
  ShieldAlert,
  Info,
  AlertTriangle,
  Search,
  Filter,
  MapPin,
  Camera,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export function AlertsDashboard() {
  const realtime = useRealtimeContext();
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [outlets, setOutlets] = useState<OutletData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityConfigs, setSeverityConfigs] = useState<SeverityConfig[]>([]);

  const [filterOutlet, setFilterOutlet] = useState("all");
  const [filterDevice, setFilterDevice] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAlert, setSelectedAlert] = useState<AlertEvent | null>(null);
  const [actions, setActions] = useState<AlertAction[]>([]);

  const minioBucketUrl = process.env.NEXT_PUBLIC_MINIO_BUCKET_URL || "";

  const getApiErrorMessage = (err: unknown, fallback: string): string => {
    if (typeof err === "object" && err !== null) {
      const maybeResponse = (err as { response?: { data?: { error?: string; message?: string } } }).response;
      const apiError = maybeResponse?.data?.error || maybeResponse?.data?.message;
      if (apiError) return apiError;
    }
    return fallback;
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [outletsRes, alertsRes, actionsRes, severitiesRes] = await Promise.all([
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
    if (alerts.length === 0) return true;

    const results = await Promise.allSettled(
      alerts.map((target) =>
        alertEventsApi.updateAction(target.id, { actionKey }),
      ),
    );

    const successIds: string[] = [];
    let failedCount = 0;

    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.success) {
        successIds.push(alerts[index].id);
      } else {
        failedCount += 1;
      }
    });

    if (successIds.length > 0) {
      setAlerts((prev) => prev.filter((a) => !successIds.includes(a.id)));
      if (selectedAlert && successIds.includes(selectedAlert.id)) {
        setSelectedAlert(null);
      }
    }

    if (failedCount > 0) {
      setError(`Failed to update ${failedCount} alert(s). Please retry.`);
      return false;
    }

    setError(null);
    return true;
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

  const summaryCards = [
    {
      key: "totalDevices",
      label: "Total Devices",
      value: stats.totalDevices,
      icon: Monitor,
      bg: "bg-purple-600",
    },
    {
      key: "activeDevices",
      label: "Active Devices",
      value: stats.activeDevices,
      icon: Wifi,
      bg: "bg-green-600",
    },
    {
      key: "alertsToday",
      label: "Alerts Today",
      value: stats.alertsToday,
      icon: Bell,
      bg: "bg-violet-600",
    },
    {
      key: "allAlerts",
      label: "Total Alerts",
      value: stats.allAlerts,
      icon: ShieldAlert,
      bg: "bg-red-600",
    },
  ] as const;

  const selectedDetail = useMemo(() => {
    if (!selectedAlert) return null;
    return buildAlertDetail(selectedAlert, outletNameByScopeId, minioBucketUrl);
  }, [selectedAlert, outletNameByScopeId, minioBucketUrl]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex h-full flex-col gap-3"
    >
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        {summaryCards.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.key}
              className={`rounded-xl border-0 shadow-sm ${item.bg} text-white`}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/20">
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[10px] leading-tight text-white/85">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xl font-extrabold leading-none">
                      {item.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="rounded-xl border border-border/70 shadow-sm">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                <span className="font-semibold">Filters:</span>
              </div>

              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <Select value={filterOutlet} onValueChange={setFilterOutlet}>
                  <SelectTrigger size="sm" className="h-8 w-[180px] text-xs">
                    <SelectValue placeholder="All Outlets" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      All Outlets
                    </SelectItem>
                    {outletOptions.map((outletName) => (
                      <SelectItem
                        key={outletName}
                        value={outletName}
                        className="text-xs"
                      >
                        {outletName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1">
                <Camera className="h-3 w-3 text-muted-foreground" />
                <Select value={filterDevice} onValueChange={setFilterDevice}>
                  <SelectTrigger size="sm" className="h-8 w-[200px] text-xs">
                    <SelectValue placeholder="All Devices" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      All Devices
                    </SelectItem>
                    {devices.map((device) => (
                      <SelectItem
                        key={device.id}
                        value={device.id}
                        className="text-xs"
                      >
                        {device.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative min-w-[180px] flex-1 max-w-[260px]">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search alerts"
                  className="h-8 pl-7 text-xs"
                />
              </div>

              <Badge
                variant="outline"
                className="ml-auto h-6 px-2 text-[10px]"
              >
                {filteredAlerts.length} / {stats.allAlerts} alerts
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="min-h-0 flex-1">
        <ScrollArea className="h-[calc(100vh-270px)]">
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
                      <SectionIcon
                        className={`h-4 w-4 ${section.iconColor}`}
                      />
                      <h3 className="text-sm font-semibold">
                        {section.label}
                      </h3>
                      <Badge
                        variant="outline"
                        className={`h-5 px-2 text-[10px] ${section.badgeTone}`}
                      >
                        {sectionAlerts.length}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                      {sectionAlerts.map((alert) => {
                        const outletName = getOutletName(
                          alert,
                          outletNameByScopeId,
                        );
                        const areaName =
                          alert.device?.locationName ||
                          readString(toRecord(alert.metadata), [
                            "area",
                            "locationName",
                          ]) ||
                          "-";
                        const severityInfo = severityColorMap[alert.severity];
                        const severityBgColor = severityInfo?.color || "#EF4444";
                        const severityTextLabel =
                          severityInfo?.label || normalizeSeverityLabel(alert.severity);

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
                              className={`h-full border ${section.borderTone} ${section.cardTone} rounded-xl shadow-sm transition-all`}
                            >
                              <CardContent className="flex h-full min-h-[150px] flex-col gap-2 p-3">
                                <div className="flex items-center justify-between">
                                  <div
                                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${section.cardTone}`}
                                  >
                                    <SectionIcon
                                      className={`h-3.5 w-3.5 ${section.textTone}`}
                                    />
                                  </div>
                                  <Badge
                                    variant="outline"
                                    style={{
                                      backgroundColor: `${severityBgColor}20`,
                                      borderColor: severityBgColor,
                                      color: severityBgColor,
                                    }}
                                    className="h-5 px-2 text-[10px]"
                                  >
                                    {severityTextLabel}
                                  </Badge>
                                </div>

                                <p className="line-clamp-2 text-sm font-semibold leading-tight">
                                  {alert.title || alert.alertType}
                                </p>

                                <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                  {alert.description || "No detail provided"}
                                </p>

                                <div className="mt-auto space-y-1 text-[11px]">
                                  <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                                    <Camera className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate font-medium text-foreground">
                                      {alert.device?.name ||
                                        `Device ${alert.deviceId}`}
                                    </span>
                                  </div>
                                  <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                                    <MapPin className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">
                                      {outletName} - {areaName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                    <Clock className="h-3 w-3 flex-shrink-0" />
                                    <span>
                                      {formatDistance(
                                        new Date(alert.timestamp),
                                        new Date(),
                                        {
                                          addSuffix: true,
                                        },
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
